/**
 * The focal point in percent of the image's width and height, as the classic
 * editor stores it: a JSON string `{"x":57,"y":45}` with whole numbers. The
 * frontend parses that string (Json.parse) and feeds it to
 * JvMTECH.Neos.ImageFocalPointEditor:ObjectPosition, so the format is fixed.
 */
export type FocalPoint = { readonly x: number; readonly y: number }

export type StoredFocalPoint =
  | { kind: 'unset' }
  | { kind: 'set'; point: FocalPoint }
  | { kind: 'invalid'; raw: string }

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.floor(value)))
}

export function focalPoint(x: number, y: number): FocalPoint {
  return { x: clampPercent(x), y: clampPercent(y) }
}

export function parseStoredFocalPoint(value: unknown): StoredFocalPoint {
  if (value === null || value === undefined || value === '') {
    return { kind: 'unset' }
  }
  const raw = String(value)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Reported to the editor as an invalid stored value, which it shows.
    return { kind: 'invalid', raw }
  }
  if (!parsed || typeof parsed !== 'object') return { kind: 'invalid', raw }
  const { x, y } = parsed as Record<string, unknown>
  if (typeof x !== 'number' || typeof y !== 'number') {
    return { kind: 'invalid', raw }
  }
  return { kind: 'set', point: focalPoint(x, y) }
}

export function serializeFocalPoint(point: FocalPoint): string {
  return JSON.stringify({ x: point.x, y: point.y })
}

export function sameFocalPoint(a: FocalPoint | null, b: FocalPoint | null) {
  return a?.x === b?.x && a?.y === b?.y
}
