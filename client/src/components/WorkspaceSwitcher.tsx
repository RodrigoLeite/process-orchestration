import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/hooks/useTranslation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

export default function WorkspaceSwitcher() {
  const { tenant, user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  if (!tenant || !user) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 rounded-lg"
      data-testid="workspace-switcher"
    >
      {/* Workspace Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 font-medium">{t('workspaces.currentWorkspace')}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{tenant.name}</p>
      </div>

      {/* Role Badge */}
      <div
        className="px-2 py-1 bg-white rounded text-xs font-semibold text-indigo-700 border border-indigo-200"
        data-testid="role-badge"
      >
        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
      </div>

      {/* Manage Workspace Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate('/admin')}
        className="gap-1"
        data-testid="button-manage-workspace"
        title={t('workspaces.manageWorkspace')}
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );
}
