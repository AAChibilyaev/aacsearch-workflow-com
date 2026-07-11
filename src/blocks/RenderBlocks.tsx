import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { HeroBasicBlock } from '@/blocks/HeroBasic/Component'
const blockComponents = {
  heroBasic: HeroBasicBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout']
}> = (props) => {
  const { blocks } = props

  // Typed indirection so the map stays useful while empty: payload-components
  // inserts entries into `blockComponents` above via its install anchors.
  const components: Record<string, React.ComponentType<Record<string, unknown>> | undefined> =
    blockComponents

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null
  }

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const { blockType } = block

        const Block = blockType ? components[blockType] : undefined

        if (Block) {
          return (
            <div className="my-16" key={index}>
              <Block {...block} />
            </div>
          )
        }

        return null
      })}
    </Fragment>
  )
}
