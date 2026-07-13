import type { CollectionConfig } from 'payload'

import { enforceTenantWriteScope, writeTenantScoped } from '@/access/tenantScopedAccess'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: writeTenantScoped,
    delete: writeTenantScoped,
    // Files are rendered on PUBLIC tenant sites (pages, widget result images),
    // so anonymous read must stay open — like any CMS-served asset host.
    // Writes are tenant-scoped: authenticated users are row-filtered by the
    // multi-tenant plugin, api-key principals by our explicit Where + the
    // enforceTenantWriteScope hard stop below.
    read: () => true,
    update: writeTenantScoped,
  },
  // `alt` is provided by the alt-text plugin (required, with an AI Generate
  // button); defining it here too would be a DuplicateFieldName config error
  fields: [],
  hooks: {
    beforeValidate: [enforceTenantWriteScope],
  },
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
