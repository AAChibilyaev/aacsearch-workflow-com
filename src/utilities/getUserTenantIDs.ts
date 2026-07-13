import type { Tenant, User } from '@/payload-types'

import { extractID } from './extractID'

/**
 * Returns array of all tenant IDs assigned to a user.
 * Accepts unknown because req.user can be a union of auth collections.
 *
 * @param user - User object with tenants field
 * @param role - Optional tenant role to filter by
 */
export const getUserTenantIDs = (
  user: unknown,
  role?: NonNullable<User['tenants']>[number]['roles'][number],
): Tenant['id'][] => {
  if (!user || typeof user !== 'object' || !('tenants' in user)) {
    return []
  }

  return (
    (user as User).tenants?.reduce<Tenant['id'][]>((acc, { roles, tenant }) => {
      if (role && !roles.includes(role)) {
        return acc
      }

      if (tenant) {
        acc.push(extractID(tenant))
      }

      return acc
    }, []) || []
  )
}
