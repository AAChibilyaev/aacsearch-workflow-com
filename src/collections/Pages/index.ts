import type { CollectionConfig } from 'payload'

import { CallToAction } from '@/blocks/CallToAction'
import { Content } from '@/blocks/Content'
import { Hero } from '@/blocks/Hero'

import { HeroBasic } from '../../blocks/HeroBasic/config'
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    livePreview: {
      url: ({ data, locale, req }) =>
        `${req.protocol}//${req.host}/${data?.slug ?? ''}?locale=${locale.code}`,
    },
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
      blocks: [Hero, Content, CallToAction, HeroBasic],
      localized: true,
      admin: {
        initCollapsed: true,
      },
      label: { en: 'Layout', ru: 'Лейаут' },
    },
  ],
}
