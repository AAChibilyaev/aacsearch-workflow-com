import React from 'react'

import type { Media as MediaDoc } from '@/payload-types'

type Props = {
  className?: string
  imgClassName?: string
  priority?: boolean
  resource?: MediaDoc | number | null
}

/**
 * Renders a Payload media resource (the registry blocks' expected
 * `@/components/Media` contract). Workers builds have no sharp, so no
 * generated sizes exist — the original R2 file is served as-is, which is
 * also why this uses a plain <img> instead of next/image optimization.
 */
export const Media: React.FC<Props> = ({ className, imgClassName, priority, resource }) => {
  if (!resource || typeof resource === 'number') return null

  const { alt, filename, mimeType, url } = resource
  if (!url) return null

  if (mimeType?.startsWith('video/')) {
    return <video className={imgClassName ?? className} playsInline src={url} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? filename ?? ''}
      className={imgClassName ?? className}
      loading={priority ? 'eager' : 'lazy'}
      src={url}
    />
  )
}
