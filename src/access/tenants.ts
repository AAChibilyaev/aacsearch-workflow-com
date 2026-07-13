import type { Access } from 'payload'

import { isSuperAdmin } from './isSuperAdmin'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

/** Super-admins can mutate any tenant; tenant-admins only their own */
export const updateAndDeleteTenantAccess: Access = ({ req }) => {
  if (!req.user) {
    return false
  }

  if (isSuperAdmin(req.user)) {
    return true
  }

  return {
    id: {
      in: getUserTenantIDs(req.user, 'tenant-admin'),
    },
  }
}
