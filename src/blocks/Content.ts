import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: {
    singular: { en: 'Content', ru: 'Контент' },
    plural: { en: 'Content blocks', ru: 'Контент-блоки' },
  },
  fields: [
    {
      name: 'columns',
      type: 'select',
      defaultValue: 'one',
      options: [
        { label: { en: 'One column', ru: 'Одна колонка' }, value: 'one' },
        { label: { en: 'Two columns', ru: 'Две колонки' }, value: 'two' },
      ],
      label: { en: 'Layout', ru: 'Раскладка' },
    },
    {
      name: 'richText',
      type: 'richText',
      label: false,
    },
  ],
}
