import type { CollectionConfig } from 'payload'

import { CallToAction } from '@/blocks/CallToAction'
import { Content } from '@/blocks/Content'
import { Hero } from '@/blocks/Hero'

import { HeroBasic } from '../../blocks/HeroBasic/config'
import { FeatureGridBasic } from '../../blocks/FeatureGridBasic/config'
import { CallToActionCentered } from '../../blocks/CallToActionCentered/config'
import { ContentStats } from '../../blocks/ContentStats/config'
import { IntegrationOrbit } from '../../blocks/IntegrationOrbit/config'
import { FeatureSplit } from '../../blocks/FeatureSplit/config'
import { FeatureBento } from '../../blocks/FeatureBento/config'
import { FeatureSteps } from '../../blocks/FeatureSteps/config'
import { EmbedBasic } from '../../blocks/EmbedBasic/config'
import { ContentColumns } from '../../blocks/ContentColumns/config'
import { ContentImageLead } from '../../blocks/ContentImageLead/config'
import { ContentFeatureMedia } from '../../blocks/ContentFeatureMedia/config'
import { ContentFeatureSplit } from '../../blocks/ContentFeatureSplit/config'
import { ContentShowcase } from '../../blocks/ContentShowcase/config'
import { ContentQuote } from '../../blocks/ContentQuote/config'
import { ContentCommunity } from '../../blocks/ContentCommunity/config'
import { ContentSplitRows } from '../../blocks/ContentSplitRows/config'
import { ContentRows } from '../../blocks/ContentRows/config'
import { ContentImageFrame } from '../../blocks/ContentImageFrame/config'
import { ContentList } from '../../blocks/ContentList/config'
import { ContentListColumns } from '../../blocks/ContentListColumns/config'
import { ContentListIcons } from '../../blocks/ContentListIcons/config'
import { LogoCloudGrid } from '../../blocks/LogoCloudGrid/config'
import { LogoCloudHover } from '../../blocks/LogoCloudHover/config'
import { LogoCloudInline } from '../../blocks/LogoCloudInline/config'
import { LogoCloudInlineWrap } from '../../blocks/LogoCloudInlineWrap/config'
import { IntegrationGrid } from '../../blocks/IntegrationGrid/config'
import { IntegrationCluster } from '../../blocks/IntegrationCluster/config'
import { IntegrationSplit } from '../../blocks/IntegrationSplit/config'
import { IntegrationConnect } from '../../blocks/IntegrationConnect/config'
import { IntegrationList } from '../../blocks/IntegrationList/config'
import { IntegrationTestimonial } from '../../blocks/IntegrationTestimonial/config'
import { CallToActionBoxed } from '../../blocks/CallToActionBoxed/config'
import { TeamRoster } from '../../blocks/TeamRoster/config'
import { TeamGrid } from '../../blocks/TeamGrid/config'
import { LogoCloudMarquee } from '../../blocks/LogoCloudMarquee/config'
import { IntegrationMarquee } from '../../blocks/IntegrationMarquee/config'
import { CallToActionSignup } from '../../blocks/CallToActionSignup/config'
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    // Live preview is configured once at the root config (admin.livePreview);
    // a second per-collection url here would silently shadow it
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
    },
    {
      // Localized on the blocks field itself: each locale keeps its own
      // full layout (docs/fields/blocks — nested fields need no `localized`)
      name: 'layout',
      type: 'blocks',
      blocks: [Hero, Content, CallToAction, HeroBasic, FeatureGridBasic, CallToActionCentered, ContentStats, IntegrationOrbit, FeatureSplit, FeatureBento, FeatureSteps, EmbedBasic, ContentColumns, ContentImageLead, ContentFeatureMedia, ContentFeatureSplit, ContentShowcase, ContentQuote, ContentCommunity, ContentSplitRows, ContentRows, ContentImageFrame, ContentList, ContentListColumns, ContentListIcons, LogoCloudGrid, LogoCloudHover, LogoCloudInline, LogoCloudInlineWrap, IntegrationGrid, IntegrationCluster, IntegrationSplit, IntegrationConnect, IntegrationList, IntegrationTestimonial, CallToActionBoxed, TeamRoster, TeamGrid, LogoCloudMarquee, IntegrationMarquee, CallToActionSignup],
      localized: true,
      admin: {
        initCollapsed: true,
      },
      label: { en: 'Layout', ru: 'Лейаут' },
    },
  ],
}
