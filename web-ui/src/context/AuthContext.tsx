import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

// Gobi-main API configuration
const GOBI_API_URL = process.env.NEXT_PUBLIC_GOBI_API_URL || 'http://localhost:3000';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  tenantId: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getAuthHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  tenantId: null,
  username: null,
  login: async () => false,
  logout: () => {},
  getAuthHeaders: () => ({}),
});

// Helper function to parse JWT
const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status on mount
    const storedToken = localStorage.getItem("access_token");

    if (storedToken) {
      // Check if token is still valid
      const tokenData = parseJwt(storedToken);
      if (tokenData) {
        const now = Date.now() / 1000;
        if (tokenData.exp > now) {
          // Token is valid
          setAccessToken(storedToken);
          setTenantId(tokenData.acct);
          setUsername(tokenData.username);
          setIsAuthenticated(true);
        } else {
          // Token expired, try to refresh
          refreshTokenIfNeeded();
        }
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Only redirect if we're done loading and not authenticated
    if (!isLoading && !isAuthenticated && router.pathname !== "/auth") {
      router.push("/auth");
    }
    // Redirect to dashboard if authenticated and on auth page
    if (!isLoading && isAuthenticated && router.pathname === "/auth") {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router.pathname]);

  const refreshTokenIfNeeded = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${GOBI_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    clearTokens();
    return false;
  };

  const setTokens = (data: any) => {
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);

    const tokenData = parseJwt(data.accessToken);
    if (tokenData) {
      setAccessToken(data.accessToken);
      setTenantId(tokenData.acct);
      setUsername(tokenData.username);
      setIsAuthenticated(true);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setTenantId(null);
    setUsername(null);
    setIsAuthenticated(false);
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${GOBI_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data);
        return true;
      } else {
        console.error('Login failed:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    // Call logout endpoint
    if (accessToken) {
      try {
        await fetch(`${GOBI_API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: localStorage.getItem('refresh_token')
          }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    clearTokens();
    router.push("/auth");
  };

  const getAuthHeaders = (): HeadersInit => {
    return {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      'Content-Type': 'application/json',
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="bg-white rounded-lg p-4 shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      accessToken,
      tenantId,
      username,
      login,
      logout,
      getAuthHeaders
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 