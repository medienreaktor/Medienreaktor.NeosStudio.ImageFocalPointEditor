import { useEffect, useState } from 'react'
import { apiFetch, useStudio } from '@medienreaktor/neos-studio'
import type { Asset, Node } from '@medienreaktor/neos-studio'
import { type AnyNodeAddress, addressKey, studio1 } from './studio'

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

/**
 * The asset ID of an image property's value, if any: {id, url} in Neos.Api
 * (Studio 2), {__identifier} in Medienreaktor.NeosApi (Studio 1).
 */
function assetIdentifier(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = record.id ?? record.__identifier ?? record.__identity
  return typeof id === 'string' && id !== '' ? id : null
}

/** A property's value: plain in Studio 2, {value, type} in Studio 1. */
function propertyValue(node: Node | null | undefined, name: string): unknown {
  const value = (node?.properties as Record<string, unknown> | undefined)?.[
    name
  ]
  return studio1 && value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value
}

/** Whether the inspected node is the edited one. */
function isNode(node: Node, address: AnyNodeAddress | undefined): boolean {
  if (address === undefined) return false
  if (typeof address === 'string') {
    return (node as unknown as { address?: string }).address === address
  }
  return (
    node.contentRepositoryId === address.contentRepositoryId &&
    node.workspaceName === address.workspaceName &&
    node.dimensionSpacePoint === address.dimensionSpacePoint &&
    node.nodeAggregateId === address.nodeAggregateId
  )
}

async function loadParent(nodeAddress: AnyNodeAddress): Promise<Node | null> {
  if (typeof nodeAddress === 'string') {
    const { nodes } = await apiFetch<{ nodes: Node[] }>(
      `/nodes/${nodeAddress}/ancestors`,
    )
    return nodes[0] ?? null
  }
  const search = new URLSearchParams({
    workspaceName: nodeAddress.workspaceName,
    dimensionSpacePoint: nodeAddress.dimensionSpacePoint,
    include: 'ancestors',
  })
  const node = await apiFetch<Node>(
    `/cr/${encodeURIComponent(nodeAddress.contentRepositoryId)}/nodes/${encodeURIComponent(nodeAddress.nodeAggregateId)}?${search.toString()}`,
  )
  const ancestors = (node.ancestors ?? []) as Node[]
  return ancestors[0] ?? null
}

async function loadImage(identifier: string): Promise<ReadyImage> {
  const cached = loadedImages.get(identifier)
  if (cached) return cached
  const asset = studio1
    ? (
        await apiFetch<{ asset: Asset }>(
          `/media/assets/neos/${encodeURIComponent(identifier)}`,
        )
      ).asset
    : await apiFetch<Asset>(`/assets/neos/${encodeURIComponent(identifier)}`)
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
  nodeAddress: AnyNodeAddress | undefined,
  property: ImagePropertyReference,
): ImageSource {
  const { inspectedNode } = useStudio()
  const ownNode =
    inspectedNode && isNode(inspectedNode, nodeAddress) ? inspectedNode : null
  const ownValue = propertyValue(ownNode, property.name)
  const ownIdentifier = property.onParent ? null : assetIdentifier(ownValue)
  // A parent's image can change without the own property changing; the own
  // node's timestamp is the only signal the inspector hands us for that.
  const parentRefresh = property.onParent
    ? (ownNode?.timestamps.lastModified ?? null)
    : null

  const nodeKey = addressKey(nodeAddress)

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
      return assetIdentifier(propertyValue(parent, property.name))
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
  }, [nodeKey, property.onParent, property.name, ownIdentifier, parentRefresh])

  return source
}
