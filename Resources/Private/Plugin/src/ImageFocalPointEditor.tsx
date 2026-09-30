import { useId, useState } from 'react'
import type { PropertyEditorProps } from '@medienreaktor/neos-studio'
import {
  focalPoint,
  parseStoredFocalPoint,
  sameFocalPoint,
  serializeFocalPoint,
  type FocalPoint,
} from './focalPoint'
import { t, useI18nReady } from './i18n'
import {
  readImageProperty,
  useImageSource,
  type ImagePropertyReference,
} from './imageSource'

const STEP = 1
const LARGE_STEP = 10

/**
 * The image focal point editor for Neos Studio - a drop-in port of the
 * classic-UI JvMTECH.Neos.ImageFocalPointEditor. Same editor id, same
 * `editorOptions.imageProperty` (including the `parent:` prefix), same stored
 * value, so node type configuration and existing content work unchanged.
 *
 * Click or drag in the image to place the point; with the image focused, the
 * arrow keys move it (Shift for larger steps). The value is committed when the
 * pointer is released, on Enter and on blur - not on every movement.
 */
export function ImageFocalPointEditor(props: PropertyEditorProps) {
  useI18nReady()
  const property = readImageProperty(props.options)
  if (!property) {
    return (
      <p className="mrfpe-message mrfpe-message--error">
        {t(
          'editor.notConfigured',
          'The focal point editor needs editorOptions.imageProperty.',
        )}
      </p>
    )
  }
  return <FocalPointField {...props} property={property} />
}

function FocalPointField({
  value,
  onCommit,
  onChange,
  autoFocus,
  invalid,
  nodeAddress,
  property,
}: PropertyEditorProps & { property: ImagePropertyReference }) {
  const image = useImageSource(nodeAddress, property)
  const stored = parseStoredFocalPoint(value)
  const committed = stored.kind === 'set' ? stored.point : null

  // Seeded from the stored value; the host remounts the editor when the edited
  // subject changes, which resets it.
  const [draft, setDraft] = useState<FocalPoint | null>(committed)
  const [isDragging, setIsDragging] = useState(false)
  const hintId = useId()

  const move = (point: FocalPoint) => {
    setDraft(point)
    onChange?.(serializeFocalPoint(point))
  }

  const commit = (point: FocalPoint | null) => {
    if (!point || sameFocalPoint(point, committed)) return
    onCommit(serializeFocalPoint(point))
  }

  const pointAt = (event: React.PointerEvent<HTMLDivElement>): FocalPoint => {
    const rect = event.currentTarget.getBoundingClientRect()
    return focalPoint(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    )
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    move(pointAt(event))
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    move(pointAt(event))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    const point = pointAt(event)
    move(point)
    commit(point)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(draft)
      return
    }
    const step = event.shiftKey ? LARGE_STEP : STEP
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const [dx, dy] = delta[event.key] ?? [0, 0]
    if (dx === 0 && dy === 0) return
    event.preventDefault()
    const from = draft ?? focalPoint(50, 50)
    move(focalPoint(from.x + dx, from.y + dy))
  }

  if (image.status === 'no-node') {
    return (
      <p className="mrfpe-message">
        {t(
          'editor.noNode',
          'The focal point can be set once the node has been created.',
        )}
      </p>
    )
  }
  if (image.status === 'no-image') {
    return (
      <p className="mrfpe-message">
        {t('editor.noImage', 'Select an image first.')}
      </p>
    )
  }
  if (image.status === 'loading') {
    return (
      <div className="mrfpe-placeholder" aria-busy="true">
        {t('editor.loading', 'Loading image…')}
      </div>
    )
  }
  if (image.status === 'error') {
    return (
      <p className="mrfpe-message mrfpe-message--error" role="alert">
        {t(
          'editor.loadFailed',
          'The image could not be loaded. Reload the page and try again.',
        )}
      </p>
    )
  }

  const readout = draft
    ? t('editor.position', 'x {x} %, y {y} %', { x: draft.x, y: draft.y })
    : t('editor.unset', 'No focal point set')

  return (
    <div className="mrfpe-field">
      <div
        className="mrfpe-area"
        data-dragging={isDragging || undefined}
        tabIndex={0}
        autoFocus={autoFocus}
        role="group"
        aria-label={`${t('editor.label', 'Focal point')}: ${readout}`}
        aria-describedby={hintId}
        aria-invalid={invalid || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setIsDragging(false)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
      >
        <img
          className="mrfpe-image"
          src={image.src}
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          alt=""
          draggable={false}
        />
        {draft && (
          <span
            className="mrfpe-marker"
            style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mrfpe-footer">
        <span className="mrfpe-readout">{readout}</span>
        <span id={hintId} className="mrfpe-hint">
          {t('editor.hint', 'Click into the image or use the arrow keys.')}
        </span>
      </div>
      {stored.kind === 'invalid' && (
        <p className="mrfpe-message mrfpe-message--error">
          {t(
            'editor.invalidValue',
            'The stored value "{raw}" is not a focal point. Set a new one.',
            { raw: stored.raw },
          )}
        </p>
      )}
    </div>
  )
}
