import type { Access, Where } from 'payload'
import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'

import type { Tenant, User } from '@/payload-types'

import { isSuperAdmin } from './isSuperAdmin'
import { getCollectionIDType } from '@/utilities/getCollectionIDType'
import { getUserTenantIDs } from '@/utilities/getUserTenantIDs'

export const isAccessingSelf = ({ id, user }: { id?: number | string; user?: unknown }): boolean =>
  Boolean(user && typeof user === 'object' && 'id' in user && (user as User).id === id)

/** Super-admins create anyone; tenant-admins only users of their own tenants */
export const createUserAccess: Access<User> = ({ req }) => {
  if (!req.user) {
    return false
  }

  if (isSuperAdmin(req.user)) {
    return true
  }

  // Non-super-admins can never mint a super-admin
  if (req.data?.roles?.includes('super-admin')) {
    return false
  }

  const adminTenantAccessIDs = getUserTenantIDs(req.user, 'tenant-admin')

  const requestedTenants: Tenant['id'][] =
    req.data?.tenants?.map((t: { tenant: Tenant['id'] }) => t.tenant) ?? []

  return requestedTenants.every((tenantID) => adminTenantAccessIDs.includes(tenantID))
}

/** Self always; super-admin all; tenant-admins the users of their tenants */
export const readUserAccess: Access<User> = ({ id, req }) => {
  if (!req?.user) {
    return false
  }

  if (isAccessingSelf({ id, user: req.user })) {
    return true
  }

  const superAdmin = isSuperAdmin(req.user)
  const selectedTenant = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: 'tenants', payload: req.payload }),
  )
  const adminTenantAccessIDs = getUserTenantIDs(req.user, 'tenant-admin')

  if (selectedTenant) {
    // Super admin, or has admin access to the tenant selected in the admin UI
    const hasTenantAccess = adminTenantAccessIDs.some((tid) => tid === selectedTenant)
    if (superAdmin || hasTenantAccess) {
      return {
        'tenants.tenant': {
          equals: selectedTenant,
        },
      }
    }
  }

  if (superAdmin) {
    return true
  }

  return {
    or: [
      {
        id: {
          equals: req.user.id,
        },
      },
      {
        'tenants.tenant': {
          in: adminTenantAccessIDs,
        },
      },
    ],
  } as Where
}

/** Self or super-admin; tenant-admins manage users of their tenants */
export const updateAndDeleteUserAccess: Access<User> = ({ id, req }) => {
  if (!req.user) {
    return false
  }

  if (isSuperAdmin(req.user) || isAccessingSelf({ id, user: req.user })) {
    return true
  }

  return {
    'tenants.tenant': {
      in: getUserTenantIDs(req.user, 'tenant-admin'),
    },
  } as Where
}
