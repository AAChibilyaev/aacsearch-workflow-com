import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { HeroBasicBlock } from '@/blocks/HeroBasic/Component'
import { FeatureGridBasicBlock } from '@/blocks/FeatureGridBasic/Component'
import { CallToActionCenteredBlock } from '@/blocks/CallToActionCentered/Component'
import { ContentStatsBlock } from '@/blocks/ContentStats/Component'
import { IntegrationOrbitBlock } from '@/blocks/IntegrationOrbit/Component'
import { FeatureSplitBlock } from '@/blocks/FeatureSplit/Component'
import { FeatureBentoBlock } from '@/blocks/FeatureBento/Component'
import { FeatureStepsBlock } from '@/blocks/FeatureSteps/Component'
import { EmbedBasicBlock } from '@/blocks/EmbedBasic/Component'
import { ContentColumnsBlock } from '@/blocks/ContentColumns/Component'
import { ContentImageLeadBlock } from '@/blocks/ContentImageLead/Component'
import { ContentFeatureMediaBlock } from '@/blocks/ContentFeatureMedia/Component'
import { ContentFeatureSplitBlock } from '@/blocks/ContentFeatureSplit/Component'
import { ContentShowcaseBlock } from '@/blocks/ContentShowcase/Component'
import { ContentQuoteBlock } from '@/blocks/ContentQuote/Component'
import { ContentCommunityBlock } from '@/blocks/ContentCommunity/Component'
import { ContentSplitRowsBlock } from '@/blocks/ContentSplitRows/Component'
import { ContentRowsBlock } from '@/blocks/ContentRows/Component'
import { ContentImageFrameBlock } from '@/blocks/ContentImageFrame/Component'
import { ContentListBlock } from '@/blocks/ContentList/Component'
import { ContentListColumnsBlock } from '@/blocks/ContentListColumns/Component'
import { ContentListIconsBlock } from '@/blocks/ContentListIcons/Component'
import { LogoCloudGridBlock } from '@/blocks/LogoCloudGrid/Component'
import { LogoCloudHoverBlock } from '@/blocks/LogoCloudHover/Component'
import { LogoCloudInlineBlock } from '@/blocks/LogoCloudInline/Component'
import { LogoCloudInlineWrapBlock } from '@/blocks/LogoCloudInlineWrap/Component'
import { IntegrationGridBlock } from '@/blocks/IntegrationGrid/Component'
import { IntegrationClusterBlock } from '@/blocks/IntegrationCluster/Component'
import { IntegrationSplitBlock } from '@/blocks/IntegrationSplit/Component'
import { IntegrationConnectBlock } from '@/blocks/IntegrationConnect/Component'
import { IntegrationListBlock } from '@/blocks/IntegrationList/Component'
import { IntegrationTestimonialBlock } from '@/blocks/IntegrationTestimonial/Component'
import { CallToActionBoxedBlock } from '@/blocks/CallToActionBoxed/Component'
import { TeamRosterBlock } from '@/blocks/TeamRoster/Component'
import { TeamGridBlock } from '@/blocks/TeamGrid/Component'
const blockComponents = {
  heroBasic: HeroBasicBlock,
  featureGridBasic: FeatureGridBasicBlock,
  callToActionCentered: CallToActionCenteredBlock,
  contentStats: ContentStatsBlock,
  integrationOrbit: IntegrationOrbitBlock,
  featureSplit: FeatureSplitBlock,
  featureBento: FeatureBentoBlock,
  featureSteps: FeatureStepsBlock,
  embedBasic: EmbedBasicBlock,
  contentColumns: ContentColumnsBlock,
  contentImageLead: ContentImageLeadBlock,
  contentFeatureMedia: ContentFeatureMediaBlock,
  contentFeatureSplit: ContentFeatureSplitBlock,
  contentShowcase: ContentShowcaseBlock,
  contentQuote: ContentQuoteBlock,
  contentCommunity: ContentCommunityBlock,
  contentSplitRows: ContentSplitRowsBlock,
  contentRows: ContentRowsBlock,
  contentImageFrame: ContentImageFrameBlock,
  contentList: ContentListBlock,
  contentListColumns: ContentListColumnsBlock,
  contentListIcons: ContentListIconsBlock,
  logoCloudGrid: LogoCloudGridBlock,
  logoCloudHover: LogoCloudHoverBlock,
  logoCloudInline: LogoCloudInlineBlock,
  logoCloudInlineWrap: LogoCloudInlineWrapBlock,
  integrationGrid: IntegrationGridBlock,
  integrationCluster: IntegrationClusterBlock,
  integrationSplit: IntegrationSplitBlock,
  integrationConnect: IntegrationConnectBlock,
  integrationList: IntegrationListBlock,
  integrationTestimonial: IntegrationTestimonialBlock,
  callToActionBoxed: CallToActionBoxedBlock,
  teamRoster: TeamRosterBlock,
  teamGrid: TeamGridBlock,
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
