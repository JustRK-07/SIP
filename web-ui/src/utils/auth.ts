/**
 * Authentication utilities for managing tokens and refresh logic
 */

const GOBI_MAIN_API_URL = process.env.NEXT_PUBLIC_GOBI_MAIN_API_URL || 'http://localhost:3000';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  firebaseToken?: string | null;
}

class AuthManager {
  private static instance: AuthManager;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Check if a JWT token is expired or about to expire
   */
  isTokenExpired(token: string, bufferSeconds = 300): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const { exp } = JSON.parse(jsonPayload);

      if (!exp) return true;

      // Check if token expires within the buffer time (default 5 minutes)
      const expirationTime = exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      return timeUntilExpiry < bufferSeconds * 1000;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Authentication is only available in browser context');
    }

    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!accessToken || !refreshToken) {
      throw new Error('No authentication tokens found. Please login.');
    }

    // If token is still valid, return it
    if (!this.isTokenExpired(accessToken)) {
      return accessToken;
    }

    // If already refreshing, wait for the existing refresh to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh process
    this.refreshPromise = this.refreshAccessToken(refreshToken)
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch(`${GOBI_MAIN_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // If refresh fails, clear tokens and redirect to login
        this.clearTokens();

        // If we're in a Next.js app, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }

        throw new Error('Failed to refresh token');
      }

      const data: TokenResponse = await response.json();

      // Store new tokens
      localStorage.setItem('access_token', data.accessToken);
      if (data.refreshToken && data.refreshToken !== refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
      }

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Clear all authentication tokens
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  /**
   * Store tokens after login
   */
  storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  /**
   * Get the tenant ID from the access token
   */
  getTenantId(): string {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const tokenData = JSON.parse(jsonPayload);
          return tokenData.acct || tokenData.tenantId;
        } catch (error) {
          console.error('Error parsing JWT for tenant ID:', error);
        }
      }
    }
    throw new Error('No tenant ID found. Please login.');
  }
}

export const authManager = AuthManager.getInstance();
export default authManager;