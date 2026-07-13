import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  // `alt` is provided by the alt-text plugin (required, with an AI Generate
  // button); defining it here too would be a DuplicateFieldName config error
  fields: [],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
