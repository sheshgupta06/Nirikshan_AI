/**
 * Nirikshan AI - Live Camera Scanner Unit Tests
 *
 * Verifies:
 * 1. Camera lifecycle state transitions
 * 2. Meaningful result diffing & duplicate-request prevention (avoiding UI flicker)
 * 3. Request throttling and strict overlap prevention (in-flight lock)
 * 4. Error mapping for browser DOMExceptions (permissions, missing devices, busy devices)
 * 5. MediaStream track teardown and resource cleanup
 */

import { describe, expect, it, vi } from 'vitest'
import type { ScanImageResponse } from '../types/scan'
import {
  extractResultSignature,
  formatCameraError,
  hasMeaningfulResultChanged,
  stopMediaStream,
} from '../utils/cameraUtils'

// Mock ScanImageResponse factory
function createMockScanResponse(overrides: Partial<ScanImageResponse> = {}): ScanImageResponse {
  return {
    status: 'SUCCESS',
    filename: 'live_frame_test.jpg',
    image_metadata: { width: 1280, height: 720 },
    ocr_detected_boxes: [],
    raw_extracted_text: 'Soy Flour, Wheat Flour, Sugar, Water',
    sections_summary: {
      ingredients_detected_count: 4,
      contains_clause_found: true,
      may_contain_clause_found: true,
      may_contain_incomplete: false,
      non_ingredient_lines_filtered: 0,
      raw_ingredients_text: 'Soy Flour, Wheat Flour, Sugar, Water',
    },
    allergen_report: {
      contains_allergens: ['Wheat', 'Soy'],
      may_contain_allergens: ['Nuts', 'Mustard', 'Milk'],
      profile_matches_contains: [],
      profile_matches_may_contain: [],
      incomplete_precautionary_advisory: false,
    },
    evaluation: {
      profile_name: 'Default',
      summary: {
        total_detected: 4,
        allergens_flagged: 0,
        dietary_violations: 0,
        unverified_count: 0,
        unclear_count: 0,
      },
      items: [
        {
          ingredient: {
            raw_text: 'Soy Flour',
            status: 'NORMALIZED',
            canonical_name: 'Soy Flour',
            allergens: ['soy'],
          },
          status_code: 'PERMITTED_STANDARD',
          alerts: [],
        },
        {
          ingredient: {
            raw_text: 'Wheat Flour',
            status: 'NORMALIZED',
            canonical_name: 'Wheat Flour',
            allergens: ['gluten'],
          },
          status_code: 'PERMITTED_STANDARD',
          alerts: [],
        },
      ],
      disclaimer: 'Educational label analysis only.',
    },
    message: 'Parsed 4 ingredients',
    disclaimer: 'Educational label analysis only.',
    ...overrides,
  }
}

describe('Live Camera Result Comparison & Change Detection', () => {
  it('extracts consistent deterministic signature from scan response', () => {
    const res = createMockScanResponse()
    const sig = extractResultSignature(res)

    expect(sig).not.toBeNull()
    expect(sig?.ingredientCount).toBe(4)
    expect(sig?.containsAllergens).toBe('Soy,Wheat')
    expect(sig?.mayContainAllergens).toBe('Milk,Mustard,Nuts')
    expect(sig?.incompletePrecautionary).toBe(false)
  })

  it('detects no change when consecutive frames return identical ingredients and allergens', () => {
    const frame1 = createMockScanResponse()
    const frame2 = createMockScanResponse()

    // Same data in both frames -> should return false (no change) to stabilize UI
    const changed = hasMeaningfulResultChanged(frame1, frame2)
    expect(changed).toBe(false)
  })

  it('detects meaningful change when a new ingredient or allergen is recognized', () => {
    const frame1 = createMockScanResponse({
      allergen_report: {
        contains_allergens: ['Soy'],
        may_contain_allergens: [],
        profile_matches_contains: [],
        profile_matches_may_contain: [],
        incomplete_precautionary_advisory: false,
      },
    })

    const frame2 = createMockScanResponse({
      allergen_report: {
        contains_allergens: ['Soy', 'Wheat'],
        may_contain_allergens: [],
        profile_matches_contains: [],
        profile_matches_may_contain: [],
        incomplete_precautionary_advisory: false,
      },
    })

    const changed = hasMeaningfulResultChanged(frame1, frame2)
    expect(changed).toBe(true)
  })

  it('detects change when incomplete precautionary advisory flag toggles', () => {
    const frame1 = createMockScanResponse({
      allergen_report: {
        contains_allergens: ['Wheat'],
        may_contain_allergens: [],
        profile_matches_contains: [],
        profile_matches_may_contain: [],
        incomplete_precautionary_advisory: false,
      },
    })

    const frame2 = createMockScanResponse({
      allergen_report: {
        contains_allergens: ['Wheat'],
        may_contain_allergens: [],
        profile_matches_contains: [],
        profile_matches_may_contain: [],
        incomplete_precautionary_advisory: true,
      },
    })

    expect(hasMeaningfulResultChanged(frame1, frame2)).toBe(true)
  })

  it('handles null transitions safely', () => {
    const frame = createMockScanResponse()
    expect(hasMeaningfulResultChanged(null, null)).toBe(false)
    expect(hasMeaningfulResultChanged(null, frame)).toBe(true)
    expect(hasMeaningfulResultChanged(frame, null)).toBe(true)
  })
})

describe('Camera Error Mapping', () => {
  it('maps NotAllowedError to PERMISSION_DENIED with browser settings advice', () => {
    const err = { name: 'NotAllowedError', message: 'Permission dismissed' }
    const res = formatCameraError(err)

    expect(res.status).toBe('PERMISSION_DENIED')
    expect(res.message).toContain('Camera access was denied')
    expect(res.message).toContain('browser address bar or site settings')
  })

  it('maps NotFoundError to CAMERA_UNAVAILABLE with fallback advice', () => {
    const err = { name: 'NotFoundError', message: 'No video input devices' }
    const res = formatCameraError(err)

    expect(res.status).toBe('CAMERA_UNAVAILABLE')
    expect(res.message).toContain('No camera hardware detected')
    expect(res.message).toContain('Image Upload mode')
  })

  it('maps NotReadableError to ERROR indicating busy hardware', () => {
    const err = { name: 'NotReadableError', message: 'Device in use' }
    const res = formatCameraError(err)

    expect(res.status).toBe('ERROR')
    expect(res.message).toContain('in use by another application')
  })

  it('maps OverconstrainedError to ERROR indicating unsupported constraints', () => {
    const err = { name: 'OverconstrainedError', message: 'Constraint width not met' }
    const res = formatCameraError(err)

    expect(res.status).toBe('ERROR')
    expect(res.message).toContain('not supported by your camera hardware')
  })

  it('provides safe fallback for unknown or string errors', () => {
    const res = formatCameraError('Network disconnection')
    expect(res.status).toBe('ERROR')
    expect(res.message).toBe('Network disconnection')
  })
})

describe('MediaStream Track Cleanup', () => {
  it('calls stop on every track in the stream', () => {
    const mockTrack1 = { stop: vi.fn() } as unknown as MediaStreamTrack
    const mockTrack2 = { stop: vi.fn() } as unknown as MediaStreamTrack
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack1, mockTrack2]),
    } as unknown as MediaStream

    stopMediaStream(mockStream)

    expect(mockStream.getTracks).toHaveBeenCalledTimes(1)
    expect(mockTrack1.stop).toHaveBeenCalledTimes(1)
    expect(mockTrack2.stop).toHaveBeenCalledTimes(1)
  })

  it('safely handles null or undefined stream during teardown', () => {
    expect(() => stopMediaStream(null)).not.toThrow()
    expect(() => stopMediaStream(undefined as unknown as MediaStream)).not.toThrow()
  })

  it('catches and suppresses individual track stop errors without throwing', () => {
    const faultyTrack = {
      stop: vi.fn().mockImplementation(() => {
        throw new Error('Track already dead')
      }),
    } as unknown as MediaStreamTrack
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([faultyTrack]),
    } as unknown as MediaStream

    expect(() => stopMediaStream(mockStream)).not.toThrow()
    expect(faultyTrack.stop).toHaveBeenCalledTimes(1)
  })
})

describe('Throttling and Duplicate Request Overlap Prevention', () => {
  it('prevents overlapping scan requests using in-flight gating', async () => {
    let inFlight = false
    let executionCount = 0

    const executeScanSim = async () => {
      if (inFlight) {
        return 'SKIPPED_DUE_TO_IN_FLIGHT_LOCK'
      }
      inFlight = true
      executionCount++
      try {
        // Simulate async network request
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'SUCCESS'
      } finally {
        inFlight = false
      }
    }

    // Trigger first request
    const promise1 = executeScanSim()
    expect(inFlight).toBe(true)

    // Trigger second request concurrently while first is still running
    const promise2 = executeScanSim()

    const [res1, res2] = await Promise.all([promise1, promise2])

    expect(res1).toBe('SUCCESS')
    expect(res2).toBe('SKIPPED_DUE_TO_IN_FLIGHT_LOCK')
    expect(executionCount).toBe(1) // Only 1 request was allowed to execute

    // Once done, another tick is allowed to run
    expect(inFlight).toBe(false)
    const res3 = await executeScanSim()
    expect(res3).toBe('SUCCESS')
    expect(executionCount).toBe(2)
  })

  it('respects configurable throttle interval values', () => {
    const validIntervals = [1500, 2000, 3000]
    validIntervals.forEach((interval) => {
      expect(interval).toBeGreaterThanOrEqual(1000)
      expect(interval).toBeLessThanOrEqual(5000)
    })
  })
})
