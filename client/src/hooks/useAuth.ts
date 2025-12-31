import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  lastWorkspaceId?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  isConfigured: boolean;
}

export interface AuthSession {
  authenticated: boolean;
  user?: AuthUser;
  tenant?: AuthTenant;
  role?: string;
  permissions?: string[];
}

export function useAuth() {
  const { data: session, isLoading, refetch } = useQuery<AuthSession>({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const response = await fetch(`/api/auth/session`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      return response.json();
    },
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const login = useCallback(() => {
    window.location.href = `/api/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  return {
    session: session || { authenticated: false },
    isLoading,
    isAuthenticated: session?.authenticated || false,
    user: session?.user,
    tenant: session?.tenant,
    role: session?.role,
    permissions: session?.permissions || [],
    login,
    logout,
  };
}
