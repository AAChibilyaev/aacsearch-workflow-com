import type { Access } from 'payload'

import type { User } from '@/payload-types'

// req.user can be a union (Users | MCP API keys), so narrow before touching roles
export const isSuperAdmin = (user: unknown): boolean =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'roles' in user &&
      (user as User).roles?.includes('super-admin'),
  )

export const isSuperAdminAccess: Access = ({ req }): boolean => isSuperAdmin(req.user)
