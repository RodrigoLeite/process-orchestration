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
import { useTranslation } from '@/lib/hooks/useTranslation';

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
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['tenant-users', tenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rbac/users?tenantId=${tenant?.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('admin.errorLoadUsers'));
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
      if (!res.ok) throw new Error(t('admin.errorLoadRoles'));
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
      if (!res.ok) throw new Error(t('admin.errorUpdateRole'));
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('admin.successUpdateRole'));
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8">
          <p className="text-red-500 dark:text-red-400">{t('admin.tenantNotFound')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-2" data-testid="text-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>

        {/* Usuários */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('admin.workspaceMembers')}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-users">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">{t('admin.columnName')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">{t('admin.columnEmail')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">{t('admin.columnRole')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">{t('admin.columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((tenantUser: TenantUserWithRole) => {
                  const isCurrentUser = tenantUser.userId === user?.id;
                  const isOwner = tenantUser.roleName === 'owner';
                  const currentRoleId = roles.find((r: Role) => r.name.toLowerCase() === tenantUser.roleName)?.id || '';

                  return (
                    <tr key={tenantUser.id} className="border-b border-border/50 hover:bg-muted/50" data-testid={`row-user-${tenantUser.id}`}>
                      <td className="py-3 px-4 text-foreground font-medium">{tenantUser.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{tenantUser.email}</td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-medium">
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
                              <SelectValue placeholder={t('admin.selectRole')} />
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
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {isCurrentUser && <span className="text-blue-600 dark:text-blue-400 font-medium">{t('admin.you')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tenantUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('admin.noUsers')}</p>
            </div>
          )}
        </Card>

        {/* Info */}
        <Card className="p-6 border-border mt-8 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">{t('admin.availableRoles')}</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300/80 space-y-1">
                <li>• <strong>Owner</strong>: {t('admin.ownerDescription')}</li>
                <li>• <strong>Admin</strong>: {t('admin.adminDescription')}</li>
                <li>• <strong>Manager</strong>: {t('admin.managerDescription')}</li>
                <li>• <strong>Member</strong>: {t('admin.memberDescription')}</li>
                <li>• <strong>Viewer</strong>: {t('admin.viewerDescription')}</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
