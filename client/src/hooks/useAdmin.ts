import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const getTenantId = () => localStorage.getItem('tenantId') || '';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const tenantId = getTenantId();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: 'active' | 'pending';
  teams: { id: string; name: string; color: string }[];
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  teamId: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  teamName?: string;
  invitedByName?: string;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  color: string;
  memberCount: number;
  members: { id: string; name: string | null; email: string | null; image: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  userCount: number;
  users: { id: string; name: string | null; email: string | null }[];
  createdAt: string;
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
  createdAt: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const data = await fetchWithAuth('/api/admin/users');
      return data as {
        users: TenantUser[];
        pendingInvitations: Invitation[];
        currentUserPermissions: string[];
      };
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { email: string; role: string; teamId?: string | null }) => {
      return fetchWithAuth('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useBulkInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { emails: string[]; role: string; teamId?: string | null }) => {
      return fetchWithAuth('/api/admin/users/invite/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useCSVImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { rows: any[]; defaultRole: string }) => {
      return fetchWithAuth('/api/admin/users/import/csv', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      return fetchWithAuth(`/api/admin/invitations/${invitationId}/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      return fetchWithAuth(`/api/admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return fetchWithAuth(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAdminTeams() {
  return useQuery({
    queryKey: ['admin', 'teams'],
    queryFn: async () => {
      const data = await fetchWithAuth('/api/admin/teams');
      return data as { teams: Team[] };
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      return fetchWithAuth('/api/admin/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, ...data }: { teamId: string; name?: string; description?: string; color?: string }) => {
      return fetchWithAuth(`/api/admin/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId: string) => {
      return fetchWithAuth(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    },
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const data = await fetchWithAuth('/api/admin/roles');
      return data as { roles: Role[] };
    },
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const data = await fetchWithAuth('/api/admin/permissions');
      return data as { permissions: Permission[] };
    },
  });
}

export function useSeedPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return fetchWithAuth('/api/admin/permissions/seed', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; permissionIds?: string[] }) => {
      return fetchWithAuth('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleId, ...data }: { roleId: string; name?: string; description?: string; permissionIds?: string[] }) => {
      return fetchWithAuth(`/api/admin/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roleId: string) => {
      return fetchWithAuth(`/api/admin/roles/${roleId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function useAssignUserToTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      return fetchWithAuth(`/api/admin/users/${userId}/teams/${teamId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    },
  });
}

export function useRemoveUserFromTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      return fetchWithAuth(`/api/admin/users/${userId}/teams/${teamId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    },
  });
}
