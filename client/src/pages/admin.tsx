import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Lock, Users, Shield } from 'lucide-react';

interface TenantUserWithRole {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function AdminPanel() {
  const { tenant, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['tenant-users', tenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rbac/users?tenantId=${tenant?.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      return res.json();
    },
    enabled: !!tenant?.id,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['tenant-roles', tenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rbac/roles?tenantId=${tenant?.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha ao carregar roles');
      return res.json();
    },
    enabled: !!tenant?.id,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (variables: { tenantUserId: string; roleId: string }) => {
      const res = await fetch(`/api/rbac/users/${variables.tenantUserId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId: variables.roleId }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar role');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Role atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8">
          <p className="text-red-500">Tenant não encontrado</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2" data-testid="text-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            Painel Admin
          </h1>
          <p className="text-gray-600">Gerencie usuários e permissões do seu workspace</p>
        </div>

        {/* Usuários */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">Membros do Workspace</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-users">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((tenantUser: TenantUserWithRole) => {
                  const isCurrentUser = tenantUser.userId === user?.id;
                  const isOwner = tenantUser.roleName === 'owner';
                  const currentRoleId = roles.find((r: Role) => r.name.toLowerCase() === tenantUser.roleName)?.id || '';

                  return (
                    <tr key={tenantUser.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`row-user-${tenantUser.id}`}>
                      <td className="py-3 px-4 text-gray-900 font-medium">{tenantUser.name}</td>
                      <td className="py-3 px-4 text-gray-600">{tenantUser.email}</td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            <Lock className="w-4 h-4" />
                            Owner
                          </span>
                        ) : (
                          <Select
                            value={currentRoleId}
                            onValueChange={(roleId) =>
                              updateRoleMutation.mutate({
                                tenantUserId: tenantUser.id,
                                roleId,
                              })
                            }
                            disabled={isCurrentUser || isOwner}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-role-${tenantUser.id}`}>
                              <SelectValue placeholder="Selecionar role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role: Role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {isCurrentUser && <span className="text-blue-600 font-medium">Você</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tenantUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum usuário adicionado ainda</p>
            </div>
          )}
        </Card>

        {/* Info */}
        <Card className="p-6 border-gray-200 mt-8 bg-blue-50">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Roles Disponíveis</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Owner</strong>: Acesso total (não pode ser removido)</li>
                <li>• <strong>Admin</strong>: Gerencia usuários e configurações</li>
                <li>• <strong>Manager</strong>: Acesso gerencial limitado</li>
                <li>• <strong>Member</strong>: Acesso padrão</li>
                <li>• <strong>Viewer</strong>: Apenas visualização</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
