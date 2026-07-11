import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: {
    singular: { en: 'Hero', ru: 'Хиро-блок' },
    plural: { en: 'Heroes', ru: 'Хиро-блоки' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      label: { en: 'Heading', ru: 'Заголовок' },
    },
    {
      name: 'subheading',
      type: 'textarea',
      label: { en: 'Subheading', ru: 'Подзаголовок' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Background image', ru: 'Фоновое изображение' },
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: { en: 'Button label', ru: 'Текст кнопки' },
    },
    {
      name: 'ctaUrl',
      type: 'text',
      label: { en: 'Button URL', ru: 'Ссылка кнопки' },
    },
  ],
}
