import { useEffect, useState } from 'react'
import { apiFetch, useStudio } from '@medienreaktor/neos-studio'
import type { NodeDto } from '@medienreaktor/neos-studio'

/**
 * Which image the focal point belongs to. `editorOptions.imageProperty` names
 * an image property of the edited node, or - prefixed `parent:` - of its
 * parent, exactly as in the classic editor.
 */
export type ImagePropertyReference = { onParent: boolean; name: string }

export type ImageSource =
  | { status: 'no-node' }
  | { status: 'no-image' }
  | { status: 'loading' }
  | {
      status: 'ready'
      src: string
      width: number | null
      height: number | null
    }
  | { status: 'error'; error: unknown }

type MediaAsset = {
  previewUri: string | null
  thumbnailUri: string | null
  width: number | null
  height: number | null
}

const PARENT_PREFIX = 'parent:'

type ReadyImage = Extract<ImageSource, { status: 'ready' }>

/**
 * Resolved previews by asset identifier, for the lifetime of the page. The
 * inspector remounts its editors when a save reloads the preview; without this
 * every save would flash the loading placeholder.
 */
const loadedImages = new Map<string, ReadyImage>()

/** Null when the option is missing - a node type configuration error the editor shows. */
export function readImageProperty(
  options: Record<string, unknown>,
): ImagePropertyReference | null {
  const option = options.imageProperty
  if (typeof option !== 'string' || option === '') return null
  return option.startsWith(PARENT_PREFIX)
    ? { onParent: true, name: option.slice(PARENT_PREFIX.length) }
    : { onParent: false, name: option }
}

/** The asset identifier of a stored image reference ({__identifier}), if any. */
function assetIdentifier(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = record.__identifier ?? record.__identity
  return typeof id === 'string' && id !== '' ? id : null
}

async function loadParent(nodeAddress: string): Promise<NodeDto | null> {
  const { nodes } = await apiFetch<{ nodes: NodeDto[] }>(
    `/nodes/${nodeAddress}/ancestors`,
  )
  return nodes[0] ?? null
}

async function loadImage(identifier: string): Promise<ReadyImage> {
  const cached = loadedImages.get(identifier)
  if (cached) return cached
  const { asset } = await apiFetch<{ asset: MediaAsset }>(
    `/media/assets/neos/${encodeURIComponent(identifier)}`,
  )
  const src = asset.previewUri ?? asset.thumbnailUri
  if (!src) {
    throw new Error(`Image ${identifier} has no preview`)
  }
  const image: ReadyImage = {
    status: 'ready',
    src,
    width: asset.width,
    height: asset.height,
  }
  loadedImages.set(identifier, image)
  return image
}

/**
 * Resolves the configured image to a preview. Follows the inspected node, so
 * picking or replacing the image in the same inspector updates the editor
 * once the shell has refetched the node after the save.
 */
export function useImageSource(
  nodeAddress: string | undefined,
  property: ImagePropertyReference,
): ImageSource {
  const { inspectedNode } = useStudio()
  const ownNode =
    inspectedNode && inspectedNode.address === nodeAddress
      ? inspectedNode
      : null
  const ownValue = ownNode?.properties[property.name]?.value
  const ownIdentifier = property.onParent ? null : assetIdentifier(ownValue)
  // A parent's image can change without the own property changing; the own
  // node's timestamp is the only signal the inspector hands us for that.
  const parentRefresh = property.onParent
    ? (ownNode?.timestamps.lastModified ?? null)
    : null

  const [source, setSource] = useState<ImageSource>(
    () =>
      (ownIdentifier ? loadedImages.get(ownIdentifier) : undefined) ?? {
        status: 'loading',
      },
  )

  useEffect(() => {
    if (!nodeAddress) {
      setSource({ status: 'no-node' })
      return
    }
    let cancelled = false
    const settle = (next: ImageSource) => {
      if (!cancelled) setSource(next)
    }

    const resolveIdentifier = async (): Promise<string | null> => {
      if (!property.onParent) return ownIdentifier
      const parent = await loadParent(nodeAddress)
      return assetIdentifier(parent?.properties[property.name]?.value)
    }

    // Keep showing the current image while re-resolving, so a save does not
    // flash the loading placeholder.
    setSource((current) =>
      current.status === 'ready' ? current : { status: 'loading' },
    )
    resolveIdentifier()
      .then((identifier): Promise<ImageSource> | ImageSource =>
        identifier ? loadImage(identifier) : { status: 'no-image' },
      )
      .then(settle)
      .catch((error: unknown) => {
        console.error('Focal point editor: loading the image failed', {
          nodeAddress,
          imageProperty: property,
          cause: error,
        })
        settle({ status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [
    nodeAddress,
    property.onParent,
    property.name,
    ownIdentifier,
    parentRefresh,
  ])

  return source
}
