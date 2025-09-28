/**
 * Authentication service for handling JWT tokens and user authentication
 */

// For now, we'll use a placeholder token since the actual auth implementation
// depends on your authentication system (NextAuth, Auth0, custom JWT, etc.)
// You should replace this with your actual authentication logic

export const getToken = async (): Promise<string> => {
  // Option 1: If using localStorage/sessionStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      return token;
    }
  }

  // Option 2: If using cookies (for SSR compatibility)
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return value;
      }
    }
  }

  // Option 3: If using NextAuth or similar
  // You can import and use your auth library here
  // const session = await getSession();
  // return session?.accessToken;

  // Placeholder for development - replace with actual auth logic
  // This should be replaced with your actual JWT token retrieval
  return 'placeholder_jwt_token_replace_with_actual_auth';
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }
};

export const getTenantId = (): string => {
  // This should extract tenant ID from JWT token or user context
  // For now, using the same hardcoded tenant ID as in gobiService
  // Replace this with actual tenant extraction logic
  return 'cmg2bhib90000sb0t3h8o87kn';
};

// You can add more auth-related functions here as needed
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getToken();
    return token !== 'placeholder_jwt_token_replace_with_actual_auth' && token.length > 0;
  } catch {
    return false;
  }
};