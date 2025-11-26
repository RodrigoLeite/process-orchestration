export const DEFAULT_PERMISSIONS = {
  // Workflows
  'workflows.read': 'Visualizar workflows',
  'workflows.write': 'Criar e editar workflows',
  'workflows.delete': 'Deletar workflows',

  // Demands
  'demands.read': 'Visualizar demandas',
  'demands.write': 'Criar e editar demandas',
  'demands.delete': 'Deletar demandas',

  // Agents
  'agents.run': 'Executar agentes',
  'agents.manage': 'Gerenciar agentes',

  // Billing
  'billing.manage': 'Gerenciar faturamento',

  // RBAC
  'rbac.manage': 'Gerenciar roles e permissões',
  'users.manage': 'Gerenciar usuários',

  // Insights
  'insights.read': 'Visualizar insights',
  'bottlenecks.read': 'Visualizar gargalos',

  // Settings
  'settings.manage': 'Gerenciar configurações',
};

export const DEFAULT_ROLES = {
  owner: {
    name: 'Owner',
    permissions: Object.keys(DEFAULT_PERMISSIONS),
  },
  admin: {
    name: 'Admin',
    permissions: [
      'workflows.read',
      'workflows.write',
      'workflows.delete',
      'demands.read',
      'demands.write',
      'demands.delete',
      'agents.run',
      'agents.manage',
      'insights.read',
      'bottlenecks.read',
      'users.manage',
      'rbac.manage',
      'settings.manage',
    ],
  },
  manager: {
    name: 'Manager',
    permissions: [
      'workflows.read',
      'workflows.write',
      'demands.read',
      'demands.write',
      'agents.run',
      'insights.read',
      'bottlenecks.read',
    ],
  },
  member: {
    name: 'Member',
    permissions: [
      'workflows.read',
      'demands.read',
      'demands.write',
      'agents.run',
      'insights.read',
      'bottlenecks.read',
    ],
  },
  viewer: {
    name: 'Viewer',
    permissions: [
      'workflows.read',
      'demands.read',
      'insights.read',
      'bottlenecks.read',
    ],
  },
};
