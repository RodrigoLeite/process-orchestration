// Centralized agent names and descriptions for multilingual support
export const agentNamesByKey = {
  'pt-BR': {
    workflow_builder: 'Gerador de Workflow',
    insights_ai: 'Insights Inteligentes',
    bottleneck_ai: 'Monitor de Gargalos',
    demand_processor: 'Processador de Demandas',
  },
  'en-US': {
    workflow_builder: 'Workflow Generator',
    insights_ai: 'Intelligent Insights',
    bottleneck_ai: 'Bottleneck Monitor',
    demand_processor: 'Demand Processor',
  },
};

export const agentDescriptionsByKey = {
  'pt-BR': {
    workflow_builder: 'Cria automaticamente o workflow personalizado para cada demanda.',
    insights_ai: 'Analisa fluxos, SLAs, tempos e volumes para gerar insights de melhoria.',
    bottleneck_ai: 'Detecta etapas lentas, bloqueadas ou sobrecarregadas nos workflows.',
    demand_processor: 'Processa e classifica novas demandas automaticamente pelo sistema.',
  },
  'en-US': {
    workflow_builder: 'Automatically creates customized workflow for each demand.',
    insights_ai: 'Analyzes flows, SLAs, times and volumes to generate improvement insights.',
    bottleneck_ai: 'Detects slow, blocked or overloaded stages in workflows.',
    demand_processor: 'Automatically processes and classifies new demands in the system.',
  },
};

export function getAgentName(
  internalKey: string | undefined,
  name: string | undefined,
  language: 'pt-BR' | 'en-US'
): string {
  if (!internalKey) return name || '';
  
  // Normalize key for lookup
  const normalizedKey = internalKey.toLowerCase().replace(/-/g, '_');
  
  // Try to find translated name
  const translations = agentNamesByKey[language];
  if (translations && translations[normalizedKey as keyof typeof translations]) {
    return translations[normalizedKey as keyof typeof translations];
  }
  
  // Fallback to original name
  return name || '';
}

export function getAgentDescription(
  internalKey: string | undefined,
  description: string | undefined,
  language: 'pt-BR' | 'en-US'
): string {
  if (!internalKey) return description || '';
  
  // Normalize key for lookup
  const normalizedKey = internalKey.toLowerCase().replace(/-/g, '_');
  
  // Try to find translated description
  const translations = agentDescriptionsByKey[language];
  if (translations && translations[normalizedKey as keyof typeof translations]) {
    return translations[normalizedKey as keyof typeof translations];
  }
  
  // Fallback to original description
  return description || '';
}
