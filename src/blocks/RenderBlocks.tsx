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

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return null
  }

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const { blockType } = block

        if (blockType && blockType in blockComponents) {
          // Block data is a union across every block type; the map lookup
          // guarantees the component matches, which TS can't see through.
          const Block = blockComponents[
            blockType as keyof typeof blockComponents
          ] as React.ComponentType<{ disableInnerContainer?: boolean }>

          if (Block) {
            return (
              <div className="my-16" key={index}>
                <Block {...block} disableInnerContainer />
              </div>
            )
          }
        }

        return null
      })}
    </Fragment>
  )
}
