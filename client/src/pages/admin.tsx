import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { 
  Shield, 
  Users, 
  UsersRound, 
  Key,
  ChevronRight,
  Building2
} from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { usePermissions } from '@/components/permission-guard';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  permission?: string;
  color: string;
}

export default function AdminPanel() {
  const { tenant } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { hasPermission } = usePermissions();

  const adminCards: AdminCard[] = [
    {
      title: t('admin.manageUsers'),
      description: t('admin.manageUsersDesc'),
      icon: <Users className="w-8 h-8" />,
      href: '/admin/users',
      permission: 'tenant.manage_users',
      color: 'bg-blue-500',
    },
    {
      title: 'Áreas de Governança',
      description: 'Gerencie áreas, processos e defina responsáveis por cada departamento',
      icon: <Building2 className="w-8 h-8" />,
      href: '/admin/areas',
      permission: 'tenant.manage_areas',
      color: 'bg-purple-500',
    },
    {
      title: t('admin.manageTeams'),
      description: t('admin.manageTeamsDesc'),
      icon: <UsersRound className="w-8 h-8" />,
      href: '/admin/teams',
      permission: 'tenant.manage_teams',
      color: 'bg-orange-500',
    },
    {
      title: t('admin.rolesPermissions'),
      description: t('admin.rolesPermissionsDesc'),
      icon: <Key className="w-8 h-8" />,
      href: '/admin/roles',
      permission: 'tenant.manage_roles',
      color: 'bg-red-500',
    },
  ];

  const visibleCards = adminCards.filter(
    card => !card.permission || hasPermission(card.permission)
  );

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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">
                {t('admin.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('admin.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 mb-8 border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">{t('admin.currentWorkspace')}:</span>
              <span className="ml-2 font-semibold text-foreground">{tenant.name}</span>
            </div>
          </div>
        </Card>

        {visibleCards.length === 0 ? (
          <Card className="p-8 text-center border-border">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('admin.restrictedAccess')}
            </h3>
            <p className="text-muted-foreground">
              {t('admin.noPermissionMessage')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCards.map((card, index) => (
              <Card
                key={index}
                className="group cursor-pointer border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                onClick={() => navigate(card.href)}
                data-testid={`card-admin-${card.href.replace(/\//g, '-')}`}
              >
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-xl ${card.color} text-white mb-4`}>
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {card.description}
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    {t('admin.access')}
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-6 border-border mt-8 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                {t('admin.availableRoles')}
              </h3>
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
