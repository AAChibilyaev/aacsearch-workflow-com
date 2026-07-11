import type { Block } from 'payload'

export const CallToAction: Block = {
  slug: 'cta',
  interfaceName: 'CallToActionBlock',
  labels: {
    singular: { en: 'Call to Action', ru: 'Призыв к действию' },
    plural: { en: 'Calls to Action', ru: 'Призывы к действию' },
  },
  fields: [
    {
      name: 'richText',
      type: 'richText',
      label: false,
    },
    {
      name: 'links',
      type: 'array',
      maxRows: 2,
      labels: {
        singular: { en: 'Link', ru: 'Ссылка' },
        plural: { en: 'Links', ru: 'Ссылки' },
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: { en: 'Label', ru: 'Текст' },
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          label: { en: 'URL', ru: 'Ссылка' },
        },
        {
          name: 'appearance',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: { en: 'Default', ru: 'Обычная' }, value: 'default' },
            { label: { en: 'Outline', ru: 'Контурная' }, value: 'outline' },
          ],
          label: { en: 'Appearance', ru: 'Вид' },
        },
      ],
    },
  ],
}
