export type Language = 'pt-BR' | 'en-US';

export const translations = {
  'pt-BR': {
    // Navigation
    nav: {
      home: 'Home',
      demands: 'Demandas',
      workflows: 'Workflows',
      areas: 'Áreas',
      bottlenecks: 'Gargalos (IA)',
      insights: 'Insights IA',
      agents: 'Agentes IA',
      agentStudio: 'Agent Studio',
      executionGraph: 'Grafo de Execução',
      criticalAlerts: 'Alertas Críticos',
      monitoring: 'Monitoramento',
      orchestrationLogs: 'Logs de Orquestração',
      settings: 'Configurações',
    },

    // Areas List
    areas: {
      title: 'Áreas Operacionais',
      subtitle: 'Gerenciamento e monitoramento por departamento',
      totalAreas: 'Total de Áreas',
      activeDemands: 'Demandas Ativas',
      avgSLA: 'SLA Médio',
      completionRate: 'Taxa de Conclusão',
      criticalAreas: 'Áreas Críticas',
      viewDetails: 'Ver Detalhes',
    },

    // Area Details
    areaDetails: {
      back: 'Voltar',
      area: 'Área',
      management: 'Gerenciamento e monitoramento de demandas da área',
      totalDemands: 'Total de Demandas',
      inThisArea: 'Nesta área',
      completed: 'Concluídas',
      blocked: 'Bloqueadas',
      waiting: 'Aguardando',
      avgRisk: 'Risco Médio',
      delayForecast: 'Atraso previsto',
      bottlenecks: 'Gargalos Específicos (IA)',
      bottlenecksDetected: 'Nenhum gargalo crítico detectado nesta área',
      demandsSection: 'Demandas da Área',
      noDemands: 'Nenhuma demanda atribuída a esta área',
      recommendedActions: 'Ações Recomendadas',
      volumeChart: 'Volume dos Últimos 7 Dias',
      chartHistory: 'Histórico de Demandas',
      dailyVisualization: 'Visualização diária',
      settings: 'Configurações da Área',
      manageWorkflows: 'Gerenciar Workflows',
      workflowsInfo: 'Funcionalidade para criar e gerenciar múltiplos workflows por área em breve.',
    },

    // Kanban
    kanban: {
      stages: 'Etapas',
      noDemands: 'Nenhuma demanda',
      viewInKanban: 'Ver no Kanban',
      openKanban: 'Abrir Kanban',
    },

    // Workflows
    workflows: {
      title: 'Workflows',
      subtitle: 'Gerenciamento de workflows de demanda',
      allWorkflows: 'Todos os Workflows',
      stages: 'Etapas',
      demands: 'Demandas',
    },

    // Monitoring
    monitoring: {
      title: 'Monitoramento',
      subtitle: 'Observabilidade em tempo real do sistema',
      liveEvents: 'Eventos ao Vivo',
      noEvents: 'Nenhum evento no momento',
      systemActivity: 'Atividade do Sistema',
    },

    // Home/Dashboard
    home: {
      title: 'Dashboard',
      subtitle: 'Bem-vindo ao sistema de orquestração de demandas',
      createNewDemand: 'Criar Nova Demanda',
      describeDemand: 'Descreva sua demanda em linguagem natural. A IA irá classificar e rotear automaticamente.',
      demandPlaceholder: "Descreva sua demanda aqui... (ex: 'Preciso criar uma nova conta no sistema SYMPHONY com emissão de contrato')",
      processing: 'Processando...',
      createDemand: 'Criar Demanda',
      total: 'Total',
      allDemands: 'todas as demandas',
      waiting: 'Aguardando',
      inProgress: 'Em Andamento',
      completed: 'Concluídas',
      blocked: 'Bloqueadas',
      errorDescribeDemand: 'Por favor, descreva a demanda',
      errorCreateDemand: 'Erro ao criar demanda. Tente novamente.',
      successCreateDemand: 'Processamento iniciado! As demandas serão orquestradas...',
      errorProcessDemands: 'Erro ao processar demandas. Tente novamente.',
      pendingDemands: 'Demandas Aguardando Processamento',
      pendingDemandsDesc: 'Você tem demandas aguardando orquestração. Clique no botão abaixo para processar agora.',
      processButton: 'Processar Demandas',
      recentDemands: 'Minhas Últimas Demandas',
      recentDemandsDesc: 'As 5 demandas mais recentes criadas',
      noDemands: 'Nenhuma demanda criada ainda',
    },

    dashboard: {
      title: 'Dashboard Operacional',
      subtitle: 'Visualize KPIs, gargalos e métricas operacionais em tempo real',
      loadingDashboard: 'Carregando dashboard...',
      mainKPIs: 'KPIs Principais',
      openDemands: 'Demandas Abertas',
      today: 'Hoje',
      averageSLA: 'SLA Médio',
      averageTime: 'Tempo médio',
      responseTime: 'Tempo de Resposta',
      average: 'Média',
      overloadedAreas: 'Áreas Sobrecarregadas',
      inAlert: 'Em alerta',
      criticalBottlenecks: 'Gargalos Críticos',
      noBottlenecks: 'Nenhum gargalo crítico detectado',
      recommendedActions: 'Ações Recomendadas',
      operationalHeatmap: 'Heatmap Operacional',
      heatmapDescription: 'Visualização comparativa de todas as áreas',
      volume: 'Volume',
      risk: 'Risco',
      sla: 'SLA',
      reason: 'Motivo',
    },

    // Settings
    settings: {
      title: 'Configurações',
      subtitle: 'Gerenciamento geral do sistema',
      language: 'Idioma',
      selectLanguage: 'Selecione seu idioma preferido',
      portuguese: 'Português (Brasil)',
      english: 'English (USA)',
    },

    // Common
    common: {
      loading: 'Carregando...',
      error: 'Erro ao carregar dados',
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Deletar',
      edit: 'Editar',
      add: 'Adicionar',
      close: 'Fechar',
      yes: 'Sim',
      no: 'Não',
      status: 'Status',
      type: 'Tipo',
      priority: 'Prioridade',
      date: 'Data',
      actions: 'Ações',
      details: 'Detalhes',
      description: 'Descrição',
      name: 'Nome',
      id: 'ID',
      createdAt: 'Criado em',
      updatedAt: 'Atualizado em',
    },
  },

  'en-US': {
    // Navigation
    nav: {
      home: 'Home',
      demands: 'Demands',
      workflows: 'Workflows',
      areas: 'Areas',
      bottlenecks: 'Bottlenecks (AI)',
      insights: 'AI Insights',
      agents: 'AI Agents',
      agentStudio: 'Agent Studio',
      executionGraph: 'Execution Graph',
      criticalAlerts: 'Critical Alerts',
      monitoring: 'Monitoring',
      orchestrationLogs: 'Orchestration Logs',
      settings: 'Settings',
    },

    // Areas List
    areas: {
      title: 'Operational Areas',
      subtitle: 'Department management and monitoring',
      totalAreas: 'Total Areas',
      activeDemands: 'Active Demands',
      avgSLA: 'Average SLA',
      completionRate: 'Completion Rate',
      criticalAreas: 'Critical Areas',
      viewDetails: 'View Details',
    },

    // Area Details
    areaDetails: {
      back: 'Back',
      area: 'Area',
      management: 'Management and monitoring of area demands',
      totalDemands: 'Total Demands',
      inThisArea: 'In this area',
      completed: 'Completed',
      blocked: 'Blocked',
      waiting: 'Waiting',
      avgRisk: 'Average Risk',
      delayForecast: 'Forecasted delay',
      bottlenecks: 'Specific Bottlenecks (AI)',
      bottlenecksDetected: 'No critical bottlenecks detected in this area',
      demandsSection: 'Area Demands',
      noDemands: 'No demands assigned to this area',
      recommendedActions: 'Recommended Actions',
      volumeChart: 'Volume - Last 7 Days',
      chartHistory: 'Demand History',
      dailyVisualization: 'Daily visualization',
      settings: 'Area Settings',
      manageWorkflows: 'Manage Workflows',
      workflowsInfo: 'Feature to create and manage multiple workflows per area coming soon.',
    },

    // Kanban
    kanban: {
      stages: 'Stages',
      noDemands: 'No demands',
      viewInKanban: 'View in Kanban',
      openKanban: 'Open Kanban',
    },

    // Workflows
    workflows: {
      title: 'Workflows',
      subtitle: 'Management of demand workflows',
      allWorkflows: 'All Workflows',
      stages: 'Stages',
      demands: 'Demands',
    },

    // Monitoring
    monitoring: {
      title: 'Monitoring',
      subtitle: 'Real-time system observability',
      liveEvents: 'Live Events',
      noEvents: 'No events at this time',
      systemActivity: 'System Activity',
    },

    // Home/Dashboard
    home: {
      title: 'Dashboard',
      subtitle: 'Welcome to the demand orchestration system',
      createNewDemand: 'Create New Demand',
      describeDemand: 'Describe your demand in natural language. The AI will classify and route it automatically.',
      demandPlaceholder: "Describe your demand here... (e.g., 'I need to create a new account in the SYMPHONY system with contract issuance')",
      processing: 'Processing...',
      createDemand: 'Create Demand',
      total: 'Total',
      allDemands: 'all demands',
      waiting: 'Waiting',
      inProgress: 'In Progress',
      completed: 'Completed',
      blocked: 'Blocked',
      errorDescribeDemand: 'Please describe the demand',
      errorCreateDemand: 'Error creating demand. Try again.',
      successCreateDemand: 'Processing started! Demands will be orchestrated...',
      errorProcessDemands: 'Error processing demands. Try again.',
      pendingDemands: 'Demands Awaiting Processing',
      pendingDemandsDesc: 'You have demands awaiting orchestration. Click the button below to process now.',
      processButton: 'Process Demands',
      recentDemands: 'My Recent Demands',
      recentDemandsDesc: 'The 5 most recent demands created',
      noDemands: 'No demands created yet',
    },

    dashboard: {
      title: 'Operational Dashboard',
      subtitle: 'View KPIs, bottlenecks and operational metrics in real time',
      loadingDashboard: 'Loading dashboard...',
      mainKPIs: 'Main KPIs',
      openDemands: 'Open Demands',
      today: 'Today',
      averageSLA: 'Average SLA',
      averageTime: 'Average time',
      responseTime: 'Response Time',
      average: 'Average',
      overloadedAreas: 'Overloaded Areas',
      inAlert: 'In alert',
      criticalBottlenecks: 'Critical Bottlenecks',
      noBottlenecks: 'No critical bottlenecks detected',
      recommendedActions: 'Recommended Actions',
      operationalHeatmap: 'Operational Heatmap',
      heatmapDescription: 'Comparative view of all areas',
      volume: 'Volume',
      risk: 'Risk',
      sla: 'SLA',
      reason: 'Reason',
    },

    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'General system management',
      language: 'Language',
      selectLanguage: 'Select your preferred language',
      portuguese: 'Português (Brasil)',
      english: 'English (USA)',
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'Error loading data',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      status: 'Status',
      type: 'Type',
      priority: 'Priority',
      date: 'Date',
      actions: 'Actions',
      details: 'Details',
      description: 'Description',
      name: 'Name',
      id: 'ID',
      createdAt: 'Created at',
      updatedAt: 'Updated at',
    },
  },
};

export function getTranslation(lang: Language, path: string, defaultValue = ''): string {
  const keys = path.split('.');
  let value: any = translations[lang];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return typeof value === 'string' ? value : defaultValue;
}
