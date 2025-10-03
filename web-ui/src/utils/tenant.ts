/**
 * Tenant utilities
 */
import { authManager } from './auth';

/**
 * Get the tenant ID from the current user's access token
 */
export function getTenantId(): string {
  return authManager.getTenantId();
}
