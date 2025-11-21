export interface FewShotExample {
  area: string;
  input: {
    area?: string;
    tipo?: string;
    prioridade?: string;
    descricao_estruturada?: string;
    sugestao_proximo_passo?: string;
  };
  output: string;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  // Financeiro (Finance)
  {
    area: "financeiro",
    input: {
      area: "Financeiro",
      tipo: "Cobrança",
      prioridade: "alta",
      descricao_estruturada: "Cliente XYZ foi cobrado duas vezes pela mesma fatura de serviços em outubro. Valor duplicado: R$ 5.000,00",
      sugestao_proximo_passo: "Revisar registros de pagamento e processar reembolso"
    },
    output: `## Análise de Cobrança Duplicada

### Perguntas Críticas
1. Qual é o período exato da duplicação?
2. Ambas as cobranças foram debitadas da conta do cliente?
3. Existe registro de contato prévio sobre esta duplicação?

### Riscos Identificados
- Redução de satisfação do cliente
- Possível disputa com processadora de pagamentos
- Impacto no fluxo de caixa da XYZ até resolução

### Próximos Passos Recomendados
1. **Urgente**: Emitir autorização de reembolso de R$ 5.000,00
2. Enviar comunicado explicando o erro ao cliente em 24h
3. Revisar processos de cobrança para evitar recorrência
4. Registrar no sistema de controle de qualidade

### Informações Necessárias
- Comprovante dos dois débitos
- Data exata de cada cobrança
- Confirmação de conta bancária do cliente para reembolso`
  },
  {
    area: "financeiro",
    input: {
      area: "Financeiro",
      tipo: "Reembolso",
      prioridade: "média",
      descricao_estruturada: "Contrato cancelado pela empresa ABC no mês 6 de 12. Solicitam devolução proporcional do pagamento anual antecipado",
      sugestao_proximo_passo: "Calcular valor de reembolso e avaliar termos contratuais"
    },
    output: `## Avaliação de Reembolso por Cancelamento

### Perguntas Críticas
1. Qual motivo foi alegado para cancelamento?
2. O contrato permite cancelamento antecipado?
3. Existem penalidades por rescisão especificadas?

### Riscos Identificados
- Disputa contratual se não houver clareza
- Impacto financeiro se percentual for incorreto
- Possível demanda legal por interpretação contratual

### Próximos Passos Recomendados
1. Revisar cláusulas de cancelamento e penalidades do contrato
2. Calcular valor proporcional (6 meses utilizados de 12)
3. Descontar qualquer penalidade contratual aplicável
4. Documentar decisão e comunicar ao cliente em escrito

### Informações Necessárias
- Cópia do contrato com termos de cancelamento
- Data de cancelamento comunicada
- Valor total pago e data de pagamento
- Detalhes de qualquer serviço utilizado`
  },
  {
    area: "financeiro",
    input: {
      area: "Financeiro",
      tipo: "Contrato",
      prioridade: "alta",
      descricao_estruturada: "Contrato de serviço com empresa DEF vence em 30 dias. Termos devem ser renegociados antes da expiração",
      sugestao_proximo_passo: "Iniciar negociações e revisar cláusulas principais"
    },
    output: `## Renovação de Contrato Vencido

### Perguntas Críticas
1. Quais áreas do contrato precisam ser renegociadas?
2. Existem disputas com o cliente sobre termos atuais?
3. Há interesse em renovação de ambas as partes?

### Riscos Identificados
- Interrupção de serviços se não houver renovação
- Possível litígio se termos não forem acordados
- Impacto operacional na empresa DEF

### Próximos Passos Recomendados
1. **Urgente**: Convocar reunião com DEF para 10 dias
2. Preparar proposta com ajustes solicitados previamente
3. Revisar índices de inflação para reajuste de preços
4. Enviar rascunho de novo contrato 15 dias antes do vencimento

### Informações Necessárias
- Contrato atual completo
- Feedback de performance do fornecedor/cliente
- Propostas alternativas de mercado para comparação
- Histórico de disputas ou alterações`
  },
  {
    area: "financeiro",
    input: {
      area: "Financeiro",
      tipo: "Auditoria",
      prioridade: "média",
      descricao_estruturada: "Revisar cláusula de exclusão de responsabilidade em contrato de software com empresa GHI. Limitar exposição financeira acima de R$ 100 mil",
      sugestao_proximo_passo: "Avaliar impactos e negociar limites de indenização"
    },
    output: `## Revisão de Cláusula de Indenização

### Perguntas Críticas
1. Qual é o valor atual de exposição máxima?
2. O cliente aceita limite de R$ 100 mil?
3. Existem precedentes de indenizações nesta categoria?

### Riscos Identificados
- Exposição financeira desproporcionada
- Diferenças significativas com padrões de mercado
- Possível rejeição do cliente se limitação for muito severa

### Próximos Passos Recomendados
1. Comparar com contratos similares no mercado
2. Consultar equipe jurídica sobre adequação legal
3. Propor limite de R$ 100 mil com exclusões de lucros cessantes
4. Incluir cláusula de seguro de responsabilidade civil

### Informações Necessárias
- Contrato atual com GHI
- Análise de risco financeiro
- Políticas de indenização da empresa
- Precedentes de sinistros`
  },
  {
    area: "financeiro",
    input: {
      area: "Financeiro",
      tipo: "Orçamento",
      prioridade: "baixa",
      descricao_estruturada: "Análise de despesas trimestrais mostra aumento de 15% em custos operacionais. Solicita-se investigação das causas",
      sugestao_proximo_passo: "Detalhar variações e implementar controles"
    },
    output: `## Análise de Variação de Despesas

### Perguntas Críticas
1. Quais centros de custo apresentaram maior variação?
2. Houve eventos sazonais ou extraordinários?
3. Existe comparação com período equivalente do ano anterior?

### Riscos Identificados
- Possível perda de controle orçamentário
- Impacto em margens de lucro
- Necessidade de revisar previsões anuais

### Próximos Passos Recomendados
1. Decompor aumento de 15% por categoria de despesa
2. Identificar itens com crescimento anormal
3. Negociar redução com fornecedores principais
4. Implementar aprovações adicionais para despesas acima de limite

### Informações Necessárias
- Detalhamento de todas as despesas do trimestre
- Comparativo com trimestre anterior e mesmo período ano passado
- Justificativas de compras extraordinárias
- Previsão para próximos trimestres`
  },

  // TI (IT)
  {
    area: "ti",
    input: {
      area: "TI",
      tipo: "Infraestrutura",
      prioridade: "crítica",
      descricao_estruturada: "Servidor de produção está fora do ar desde 08h da manhã. Impactando todos os 500 usuários. Sistema ERP indisponível",
      sugestao_proximo_passo: "Restaurar serviço imediatamente e investigar causa"
    },
    output: `## Resposta para Servidor Fora do Ar

### Ações Imediatas
1. **Agora**: Verificar status de hardware e conectividade
2. Ativar plano de continuidade com servidor backup
3. Estimar tempo para restauração completa
4. Comunicar aos usuários a cada 15 minutos

### Investigação Técnica
- Verificar logs de erro dos últimos 2 dias
- Analisar aumentos de carga ou padrões anormais
- Revisar últimas alterações de configuração

### Riscos Operacionais
- Perda de dados se banco não for sincronizado
- Impacto em cumprimento de SLA com clientes
- Possível perda de receita durante downtime

### Próximos Passos Recomendados
1. Restaurar de backup mais recente
2. Validar integridade de dados críticos
3. Fazer failover automático para ambiente redundante
4. Aguardar teste de connectividade de 15 minutos

### Informações Necessárias
- Logs de erro completos do servidor
- Último backup validado
- Cronograma de manutenção programada
- Dados de monitoramento (CPU, memória, rede)`
  },
  {
    area: "ti",
    input: {
      area: "TI",
      tipo: "Suporte",
      prioridade: "média",
      descricao_estruturada: "Usuários reclamam que sistema está lento durante horas de pico (10-12h e 15-17h). Performance degrada 50%",
      sugestao_proximo_passo: "Analisar gargalos e otimizar"
    },
    output: `## Otimização de Performance de Sistema

### Análise Técnica
1. Coletar métricas de performance durante picos (CPU, memória, rede, I/O BD)
2. Identificar queries lentas no banco de dados
3. Verificar conexões simultâneas e limites de sessão
4. Analisar cache hit rate

### Investigação de Gargalos
- Possível falta de índices no banco de dados
- Limite de conexões simultâneas atingido
- Cache mal configurado ou desabilitado
- Processamento pesado em horários de pico

### Riscos Operacionais
- Redução de produtividade dos usuários
- Possível impacto em SLA
- Frustração e reclamações de usuários

### Próximos Passos Recomendados
1. Aumentar pool de conexões do banco de dados em 50%
2. Adicionar índices em 3 queries mais executadas
3. Implementar cache em memória para dados estáticos
4. Considerar upgrade de servidor se recursos forem insuficientes

### Informações Necessárias
- Logs de erro e warning dos últimos 5 dias
- Quantidade de usuários simultâneos nos horários de pico
- Detalhes de queries lentas
- Especificações de hardware (CPU, RAM, Storage)`
  },
  {
    area: "ti",
    input: {
      area: "TI",
      tipo: "Segurança",
      prioridade: "alta",
      descricao_estruturada: "Detectado software malicioso em 3 computadores da rede. Suspeita-se de phishing. Isolar equipamentos e fazer varredura completa",
      sugestao_proximo_passo: "Quarentena e limpeza de malware"
    },
    output: `## Resposta a Incidente de Segurança

### Ações Imediatas
1. Desconectar 3 equipamentos da rede imediatamente
2. Ativar antivírus em todos os equipamentos
3. Fazer varredura completa em computadores afetados
4. Revogar credenciais de usuários dos equipamentos comprometidos

### Investigação de Segurança
- Rastrear origem do malware (email, site, USB)
- Verificar histórico de acessos e transferências de arquivo
- Identificar quais dados podem ter sido expostos
- Verificar se credenciais foram capturadas

### Riscos de Segurança
- Roubo de dados sensíveis
- Propagação de malware para outros equipamentos
- Comprometimento de credenciais corporativas
- Possível perda de dados

### Próximos Passos Recomendados
1. Executar ferramentas de limpeza profunda (MalwareBytes, etc)
2. Reimaginar sistemas operacionais se limpeza for incompleta
3. Trocar todas as senhas de usuários afetados
4. Enviar alerta de phishing para toda empresa

### Informações Necessárias
- Quais aplicações/sites o usuário visitou recentemente
- Emails recebidos nos últimos 3 dias
- Compartilhamentos de rede do usuário
- Dados acessados nesses computadores`
  },
  {
    area: "ti",
    input: {
      area: "TI",
      tipo: "Desenvolvimento",
      prioridade: "média",
      descricao_estruturada: "Sistema precisa atualizar para versão de segurança do framework crítico. Impacta 15 aplicações. Risco de regressão",
      sugestao_proximo_passo: "Planejar atualização com testes completos"
    },
    output: `## Planejamento de Atualização de Framework

### Análise de Impacto
1. Revisar changelog de segurança e breaking changes
2. Identificar todas as 15 aplicações afetadas
3. Executar testes unitários para cada app
4. Avaliar compatibilidade com dependências

### Estratégia de Rollout
- Implementar em ambiente de staging primeiro
- Fazer testes de regressão completos (2-3 dias)
- Atualizar aplicações menos críticas primeiro
- Manter versão anterior como fallback por 2 semanas

### Riscos Operacionais
- Possível incompatibilidade com código existente
- Downtime de aplicações durante atualização
- Impacto em SLA se testes forem insuficientes

### Próximos Passos Recomendados
1. Agendar janela de atualização com 5 dias de antecedência
2. Criar plano detalhado de rollback
3. Executar teste de carga para confirmar performance
4. Comunicar impacto esperado aos stakeholders

### Informações Necessárias
- Lista completa das 15 aplicações e versões
- Detalhes técnicos do breaking change
- Histórico de problemas anteriores com atualizações
- Recursos disponíveis para testes`
  },

  // RH (Human Resources)
  {
    area: "rh",
    input: {
      area: "RH",
      tipo: "Benefícios",
      prioridade: "média",
      descricao_estruturada: "Colaborador João da Silva solicita aprovação de férias: 15 dias em dezembro. Verificar saldo de férias e documentação",
      sugestao_proximo_passo: "Validar saldo e aprovar se em conformidade"
    },
    output: `## Processamento de Solicitação de Férias

### Informações a Verificar
1. Saldo de dias de férias do colaborador
2. Aviso prévio: solicitação foi feita com 30 dias?
3. Períodos de férias já agendados em sua equipe
4. Projetos críticos em andamento

### Análise de Conformidade
- Verificar se colaborador cumpriu período aquisitivo (12 meses)
- Confirmar se há débitos de adiantamento anteriores
- Validar período (após 30 dias de solicitação)

### Riscos Operacionais
- Possível falta de cobertura na equipe durante período
- Impacto em deadlines de projetos
- Necessidade de redistribuir tarefas

### Próximos Passos Recomendados
1. Confirmar saldo: ~15 dias disponíveis
2. Avaliar impacto nos projetos com gestor direto
3. Se aprovado: comunicar formalmente ao colaborador
4. Registrar no sistema de ponto e folha de pagamento

### Informações Necessárias
- Saldo atual de férias do colaborador
- Calendário de férias da equipe
- Projetos críticos em dezembro
- Confirmação do gestor direto`
  },
  {
    area: "rh",
    input: {
      area: "RH",
      tipo: "Recrutamento",
      prioridade: "alta",
      descricao_estruturada: "Abrir vaga de Analista de Sistemas Senior - 3 candidatos qualificados já identificados. Processo seletivo deve concluir em 3 semanas",
      sugestao_proximo_passo: "Avaliar candidatos e conduzir entrevistas"
    },
    output: `## Processo Seletivo para Analista Senior

### Avaliação de Candidatos
1. Revisar portfólio e experiência dos 3 candidatos
2. Verificar referências anteriores
3. Confirmar disponibilidade para entrevista
4. Validar requisitos técnicos mínimos

### Fases do Processo
- **Semana 1**: Entrevista técnica com gestor de TI (1.5h)
- **Semana 2**: Dinâmica com equipe e apresentação de case (1h)
- **Semana 3**: Entrevista RH e discussão de proposta

### Riscos de Recrutamento
- Perda de candidatos para concorrentes
- Atraso em projetos sem profissional
- Integração inadequada se avaliação for incompleta

### Próximos Passos Recomendados
1. Confirmar interesse dos 3 candidatos hoje
2. Agendar testes técnicos para próxima semana
3. Preparar case real de problema técnico para apresentação
4. Ter proposta financeira pronta para terceira semana

### Informações Necessárias
- CVs e portfólios dos 3 candidatos
- Requisitos técnicos específicos da vaga
- Faixa salarial aprovada
- Histórico de referências`
  },
  {
    area: "rh",
    input: {
      area: "RH",
      tipo: "Gestão de Desempenho",
      prioridade: "média",
      descricao_estruturada: "Avaliação de desempenho trimestral de 45 colaboradores deve ser iniciada. Coordenar feedback com gestores",
      sugestao_proximo_passo: "Criar cronograma e disponibilizar formulários"
    },
    output: `## Planejamento de Avaliação de Desempenho

### Etapas do Processo
1. **Semana 1**: Disponibilizar formulários e orientar gestores
2. **Semana 2-3**: Coleta de auto-avaliação dos colaboradores
3. **Semana 3-4**: Avaliação pelos gestores
4. **Semana 5**: Feedback individual com cada colaborador

### Tópicos a Avaliar
- Cumprimento de metas individuais
- Contribuição para objetivos da equipe
- Competências técnicas e comportamentais
- Desenvolvimento profissional

### Riscos de Gestão
- Falta de padronização entre avaliadores
- Possíveis conflitos com resultados inesperados
- Impacto emocional negativo se feedback for inadequado

### Próximos Passos Recomendados
1. Enviar email para todos os gestores explicando processo
2. Disponibilizar template padronizado de avaliação
3. Oferecer treinamento sobre feedback construtivo (2h)
4. Agendar sessões individuais antes da avaliação final

### Informações Necessárias
- Metas individuais estabelecidas no início do período
- Histórico de avaliações anteriores
- Critérios de desempenho da empresa
- Calibração esperada (distribuição de notas)`
  },
  {
    area: "rh",
    input: {
      area: "RH",
      tipo: "Conformidade",
      prioridade: "alta",
      descricao_estruturada: "Auditoria interna identificou 8 colaboradores sem assinatura de Acordo de Confidencialidade (NDA). Regularizar documentação",
      sugestao_proximo_passo: "Contactar colaboradores e coletar assinaturas"
    },
    output: `## Regularização de NDAs

### Análise do Não-Conformidade
1. Identificar por que 8 colaboradores não assinaram
2. Analisar quando eles foram admitidos
3. Verificar acesso a informações sensíveis
4. Avaliar exposição de risco

### Ação Corretiva
- Contactar cada colaborador explicando necessidade
- Enviar NDA com prazo de 5 dias para assinatura
- Incluir processo na lista de onboarding futuro
- Documentar assinaturas no sistema

### Riscos de Conformidade
- Possível exposição de dados confidenciais
- Vulnerabilidade legal em caso de vazamento
- Não-conformidade com políticas internas

### Próximos Passos Recomendados
1. **Hoje**: Enviar email aos 8 colaboradores
2. **Dia 3**: Follow-up com faltosos
3. **Dia 5**: Deadline para assinatura
4. **Dia 6**: Escalação para gestores se não assinarem

### Informações Necessárias
- Lista de 8 colaboradores
- Modelo atualizado de NDA
- Mapeamento de acesso a informações sensíveis
- Histórico de treinamentos de conformidade`
  },

  // Jurídico (Legal)
  {
    area: "juridico",
    input: {
      area: "Jurídico",
      tipo: "Contrato",
      prioridade: "alta",
      descricao_estruturada: "Revisar e negociar cláusula de revisão de preço em contrato de fornecimento. Índice de reajuste: IPCA + 2%",
      sugestao_proximo_passo: "Avaliar mercado e propor termos"
    },
    output: `## Negociação de Cláusula de Reajuste

### Análise de Risco
1. Comparar IPCA + 2% com padrão de mercado
2. Avaliar volatilidade esperada do IPCA nos próximos 2 anos
3. Revisar contratos similares com outros fornecedores
4. Analisar poder de negociação de ambas as partes

### Considerações Legais
- Cláusula está em conformidade com legislação?
- Há proteção contra inflação extraordinária?
- Período de reajuste (anual, semestral)?

### Riscos Contratuais
- Taxa de reajuste acima do mercado
- Ausência de limitador (cap) de reajuste
- Impacto cumulativo em 3-5 anos

### Próximos Passos Recomendados
1. Propor IPCA + 1,5% como contraproposta
2. Incluir limitador de reajuste anual (máximo 15%)
3. Adicionar cláusula de renegociação se IPCA > 20%
4. Especificar data de reajuste (ex: 15 de janeiro)

### Informações Necessárias
- Contrato atual completo
- Histórico de IPCA (últimos 3 anos)
- Contratos de concorrentes (para benchmarking)
- Previsão de volume de compras`
  },
  {
    area: "juridico",
    input: {
      area: "Jurídico",
      tipo: "Litígio",
      prioridade: "alta",
      descricao_estruturada: "Cliente interpôs ação judicial contra empresa por inadimplemento de serviço. Valor reclamado: R$ 250 mil. Audiência em 60 dias",
      sugestao_proximo_passo: "Preparar defesa e avaliar acordo"
    },
    output: `## Estratégia de Defesa em Litígio

### Avaliação de Risco
1. Analisar se serviço foi realmente inadimplido
2. Revisar documentação de entrega e aceitação
3. Avaliar força da posição legal da empresa
4. Estimar chance de vitória: ___% (alta/média/baixa)

### Documentação Crítica
- Contrato original com termos de execução
- Cronograma de execução e datas de entrega
- Emails e comunicações com cliente
- Evidência de conclusão de serviço
- Qualquer reclamação prévia formal do cliente

### Riscos Legais
- Possível condenação ao pagamento integral + juros
- Danos morais se comprovada negligência
- Impacto em reputação e relacionamento comercial

### Próximos Passos Recomendados
1. Reunir toda documentação para análise jurídica profunda
2. Contactar cliente para explorar acordo (mediação)
3. Propor acordo de 40-50% do valor reclamado
4. Se sem acordo: preparar contestação robusta para advogado

### Informações Necessárias
- Cópia da ação judicial completa
- Contrato original e aditivos
- Toda correspondência com cliente
- Documentação de execução do serviço
- Avaliação de especialista sobre inadimplemento`
  },
  {
    area: "juridico",
    input: {
      area: "Jurídico",
      tipo: "Conformidade",
      prioridade: "média",
      descricao_estruturada: "Atualizar Política de Proteção de Dados Pessoais (LGPD) conforme novas interpretações da ANPD. Prazo: 45 dias",
      sugestao_proximo_passo: "Revisar orientações da ANPD e atualizar documentação"
    },
    output: `## Adequação LGPD às Novas Orientações

### Análise de Impacto
1. Revisar principais mudanças nas interpretações da ANPD
2. Mapear quais políticas internas devem ser alteradas
3. Identificar sistemas que precisam de ajuste
4. Avaliar necessidade de retraining de equipes

### Itens para Revisão
- Processo de consentimento de coleta de dados
- Direitos de acesso e exclusão de dados
- Políticas de retenção e descarte
- Notificação de vazamento de dados

### Riscos de Conformidade
- Multa administrativas de até R$ 50 milhões
- Ações judiciais de usuários
- Bloqueio de serviços pela ANPD
- Dano reputacional

### Próximos Passos Recomendados
1. **Semana 1-2**: Revisar interpretações oficiais da ANPD
2. **Semana 2-3**: Atualizar Política de Proteção de Dados
3. **Semana 3-4**: Revisão interna com departamentos
4. **Semana 4-5**: Comunicar mudanças aos usuários
5. **Semana 5-6**: Treinamento de compliance para equipe

### Informações Necessárias
- Orientações oficiais recentes da ANPD
- Política atual de proteção de dados
- Mapeamento de dados pessoais processados
- Histórico de incidentes de vazamento`
  },
  {
    area: "juridico",
    input: {
      area: "Jurídico",
      tipo: "Propriedade Intelectual",
      prioridade: "média",
      descricao_estruturada: "Terceirizar desenvolvimento de software para empresa de TI. Esclarecer propriedade intelectual e uso de código",
      sugestao_proximo_passo: "Negociar termos de PI e direitos de uso"
    },
    output: `## Estruturação de Contrato de Terceirização com PI

### Questões Críticas
1. Quem será proprietário do código desenvolvido?
2. Pode a empresa de TI reutilizar componentes em outros projetos?
3. Há ferramentas/bibliotecas de código aberto a incluir?
4. Direito a manutenção e evolução futura?

### Opções de Estrutura
- **Opção A**: Proprietário total da nossa empresa (mais caro)
- **Opção B**: Licença perpétua exclusiva para nossa empresa
- **Opção C**: Direitos compartilhados com restrições

### Riscos Legais
- Possível perda de direitos sobre código crítico
- Exposição a propriedade intelectual de terceiros
- Impossibilidade de manutenção se fornecedor falir

### Próximos Passos Recomendados
1. Definir se código é crítico (preferir propriedade total)
2. Incluir cláusula de transição de conhecimento
3. Especificar direitos sobre correções de bugs
4. Incluir garantia de documentação completa

### Informações Necessárias
- Especificação completa do software a desenvolver
- Orçamento aprovado
- Timeline de implementação
- Importância estratégica do software`
  },

  // Operações
  {
    area: "operacoes",
    input: {
      area: "Operações",
      tipo: "Logística",
      prioridade: "alta",
      descricao_estruturada: "Falha em entrega de pedido crítico para cliente beta. Transportadora perdeu rastreamento. 200 unidades desaparecidas",
      sugestao_proximo_passo: "Localizar carga e preparar contingência"
    },
    output: `## Resposta a Falha Crítica de Logística

### Ações Imediatas
1. Contactar transportadora para rastreamento urgente
2. Revisar seguro de transporte da carga
3. Comunicar cliente imediatamente com transparência
4. Iniciar investigação com transportadora

### Investigação
- Última posição conhecida da carga
- Documentação de embarque (conhecimento de embarque)
- Se houve acidente ou perda em rota
- Responsabilidade de seguro

### Riscos Operacionais
- Cliente pode rescindir contrato
- Perda de receita de R$ X (valor da carga)
- Dano à reputação
- Possível impacto em outras entregas

### Próximos Passos Recomendados
1. **Hoje**: Ativar equipe de logística reversa
2. **Hoje**: Enviar oferta de substituição expedita
3. **24h**: Decisão sobre cobertura por seguro vs. própria conta
4. **3 dias**: Entregar novo lote com frete aéreo se necessário

### Informações Necessárias
- Conhecimento de carga (AWB/CT-e)
- Seguro de transporte e cobertura
- Contato direto com transportadora
- Endereço exato de destino e expedição
- Valor total e criticidade para cliente`
  },
  {
    area: "operacoes",
    input: {
      area: "Operações",
      tipo: "Manutenção",
      prioridade: "alta",
      descricao_estruturada: "Sistema de ar condicionado central falhou. Temperatura interna atingiu 28°C. Necessário reparo urgente",
      sugestao_proximo_passo: "Chamar técnico e ativar cooling emergencial"
    },
    output: `## Protocolo de Resposta para Falha de A/C

### Ações Imediatas
1. **Agora**: Ligar para técnico de manutenção emergencial
2. Desligar sistemas geradores de calor desnecessários
3. Abrir janelas para circulação de ar (se segurança permitir)
4. Comunicar funcionários sobre situação

### Investigação Técnica
- Verificar se é falha do compressor ou controle
- Checar filtros entupidos ou vazamento de refrigerante
- Revisar último serviço de manutenção preventiva
- Avaliar se foi negligência na manutenção

### Riscos Operacionais
- Impacto na produtividade de funcionários
- Possível parada de equipamentos sensíveis a temperatura
- Desconforto e reclamações de equipe
- Possível perda de dados se sistemas overheatearem

### Próximos Passos Recomendados
1. **Hoje**: Executar diagnóstico do técnico (2-3h)
2. **Hoje-Amanhã**: Reparar ou substituir componente
3. **Imediato**: Implementar sistema de cooling móvel (alugar)
4. **Semana**: Revisar programa de manutenção preventiva

### Informações Necessárias
- Contato de técnico de manutenção
- Histórico de manutenção do sistema
- Especificação técnica do A/C central
- Última substituição de filtros/refrigerante
- Localização do disjuntor do sistema`
  },
  {
    area: "operacoes",
    input: {
      area: "Operações",
      tipo: "Qualidade",
      prioridade: "média",
      descricao_estruturada: "Auditoria de processo identificou taxa de defeito de 3,5% em produção. Padrão esperado é 0,5%",
      sugestao_proximo_passo: "Investigar causas e implementar ações corretivas"
    },
    output: `## Investigação de Aumento de Defeitos

### Análise de Causa Raiz
1. Quantificar quando começou o aumento (data)
2. Qual etapa do processo origina mais defeitos
3. Houve mudança de fornecedor, máquina ou pessoal
4. Materiais cumprem especificação?

### Investigação Detalhada
- Revisar registros de inspeção dos últimos 30 dias
- Entrevistar operadores sobre problemas observados
- Analisar parâmetros de máquinas (temperatura, pressão)
- Verificar calibração de equipamentos de teste

### Riscos de Qualidade
- Insatisfação de clientes
- Possível reclamação em massa
- Reputação prejudicada
- Custo elevado de retrabalho (7x mais caro)

### Próximos Passos Recomendados
1. Implementar inspeção 100% até 0,5% for atingido
2. Treinar operadores em procedimento correto (4h)
3. Aumentar frequência de manutenção preventiva
4. Formar equipe de melhoria contínua (reunião semanal)

### Informações Necessárias
- Registros de defeitos dos últimos 60 dias
- Especificação de qualidade esperada
- Histórico de mudanças de processo
- Dados de performance das máquinas
- Histórico de fornecedores de material`
  },
  {
    area: "operacoes",
    input: {
      area: "Operações",
      tipo: "Planejamento",
      prioridade: "média",
      descricao_estruturada: "Previsão de demanda para Q4 mostra crescimento de 40%. Avaliar capacidade de produção e recursos",
      sugestao_proximo_passo: "Planejar aumento de capacidade"
    },
    output: `## Planejamento de Aumento de Capacidade

### Análise de Gap
1. Capacidade atual: ___ unidades/mês
2. Demanda esperada Q4: ___ unidades/mês
3. Gap de capacidade: 40%
4. Tempo disponível: 6 semanas

### Opções de Aumento de Capacidade
- **Opção A**: Terceirizar 30% da produção (+2 sem. setup)
- **Opção B**: Adicionar turno extra (implementação 1 sem.)
- **Opção C**: Subcontratar mão de obra temporária (+3 sem. treinamento)
- **Opção D**: Aluguel de equipamentos adicionais (2-3 sem.)

### Riscos de Operação
- Falta de capacidade pode gerar perda de vendas
- Qualidade pode sofrer com ramp-up rápido
- Custo de produção pode aumentar significativamente
- Dificuldade em encontrar recursos à curto prazo

### Próximos Passos Recomendados
1. **Semana 1**: Validar previsão com vendas
2. **Semana 1-2**: Contatar potenciais subcontratados
3. **Semana 2-3**: Recrutar e treinar equipe adicional
4. **Semana 3**: Começar ramp-up de produção
5. **Semana 4-6**: Monitora qualidade e capacidade

### Informações Necessárias
- Previsão detalhada por produto
- Capacidade instalada e utilização atual
- Turnos disponíveis
- Disponibilidade de trabalhadores treinados
- Contratos com potenciais subcontratados`
  },

  // Facilities
  {
    area: "facilities",
    input: {
      area: "Facilities",
      tipo: "Manutenção",
      prioridade: "alta",
      descricao_estruturada: "Vazamento de água no teto do escritório, afetando salas 3 e 4. Danificando equipamentos e documentos",
      sugestao_proximo_passo: "Interromper vazamento e proteger ativos"
    },
    output: `## Resposta a Emergência de Vazamento

### Ações Imediatas
1. **Agora**: Desligar fornecimento de água no setor se possível
2. Colocar baldes e coberturas em equipamentos críticos
3. Evacuação de dados antes de dano maior
4. Contatar encanador de emergência

### Investigação de Causa
- Verificar caixa d'água ou tubulação no andar acima
- Revisar manutenção preventiva anterior
- Avaliar se é estrutural ou operacional

### Riscos Imediatos
- Curto-circuito elétrico e riscos de segurança
- Perda de dados e documentos críticos
- Dano a equipamentos caros
- Possível perda total de dois setores

### Próximos Passos Recomendados
1. **Urgente**: Reparar causa do vazamento (2-6h)
2. **Hoje**: Secar completamente com desumidificadores
3. **Hoje**: Enviar equipamentos para inspeção técnica
4. **2 dias**: Reabre salas após limpeza e inspeção

### Informações Necessárias
- Causa exata (cano rompido, vazamento de caixa, etc)
- Localização exata da origem do vazamento
- Avaliação de dano em equipamentos
- Cobertura de seguro (contenção de água)`
  },
  {
    area: "facilities",
    input: {
      area: "Facilities",
      tipo: "Segurança",
      prioridade: "média",
      descricao_estruturada: "Auditoria de segurança identificou 5 saídas de emergência bloqueadas. Ajustar layout e remover obstáculos",
      sugestao_proximo_passo: "Implementar ações corretivas de segurança"
    },
    output: `## Correção de Não-Conformidades de Segurança

### Análise de Risco
1. Qual lei/norma foi violada (NR-12, CIPA, etc)
2. Número de pessoas em risco
3. Severidade potencial em caso de emergência
4. Timeline para correção

### Ações Corretivas
- Remover todos os objetos bloqueando saídas
- Implementar sinalização clara em verde fluorescente
- Treinar equipe sobre procedimentos de evacuação
- Agendar simulado de incêndio

### Riscos Legais e Operacionais
- Possível auto de infração de órgão regulador
- Responsabilidade civil em caso de acidente
- Multa administrativa
- Possível interdição parcial

### Próximos Passos Recomendados
1. **Hoje**: Remover todos obstáculos (2h)
2. **Esta semana**: Instalar sinalização apropriada
3. **Próx. semana**: Treinar equipe sobre evacuação
4. **2 semanas**: Simulado de incêndio com cronômetro

### Informações Necessárias
- Plantas baixas com saídas de emergência
- Mapeamento de obstáculos por saída
- Requisitos regulatórios aplicáveis
- Contato com corpo de bombeiros local`
  },
  {
    area: "facilities",
    input: {
      area: "Facilities",
      tipo: "Limpeza",
      prioridade: "baixa",
      descricao_estruturada: "Inspeção de rotina identificou nível de limpeza insatisfatório em áreas comuns. Revisar contrato com empresa de limpeza",
      sugestao_proximo_passo: "Notificar prestador e aumentar frequência"
    },
    output: `## Gestão de Qualidade de Limpeza

### Avaliação do Problema
1. Quais áreas específicas apresentam problemas
2. Quando começou a queda na qualidade
3. Houve mudança de equipe de limpeza
4. Frequência atual é adequada?

### Investigação
- Revisar termos do contrato de limpeza
- Conferir se empresa está cumprindo cronograma
- Avaliar se frequência é suficiente (diária, 2x/dia?)
- Comparar com padrão de mercado

### Riscos Operacionais
- Impacto na percepção de clientes/visitantes
- Possível problema de higiene
- Afeta moral de funcionários
- Risco de contaminação/pragas

### Próximos Passos Recomendados
1. Enviar notificação formal à empresa de limpeza (carta)
2. Estabelecer prazo de 5 dias para melhoria
3. Agendar inspeção semanal por 1 mês
4. Se não melhorar: considerar trocar de fornecedor

### Informações Necessárias
- Contrato atual com empresa de limpeza
- Fotos do estado atual de limpeza
- Cronograma de limpeza esperado
- Contatos de fornecedores alternativos
- Requisitos de limpeza específicos`
  },
  {
    area: "facilities",
    input: {
      area: "Facilities",
      tipo: "Sustentabilidade",
      prioridade: "média",
      descricao_estruturada: "Implementar programa de eficiência energética. Reduzir consumo em 20% em 12 meses",
      sugestao_proximo_passo: "Auditar consumo atual e identificar oportunidades"
    },
    output: `## Programa de Eficiência Energética

### Avaliação de Consumo
1. Consumo atual: ___ kWh/mês (ano base)
2. Custo mensal: R$ ___
3. Principais consumidores (A/C, iluminação, servidores)
4. Comparação com benchmarks similares

### Oportunidades de Redução
- **Iluminação**: Trocar por LED (-60% consumo)
- **A/C**: Ajustar temperatura base, manutenção preventiva
- **Servidores**: Otimizar utilização, virtualização
- **Comportamento**: Campanhas de conscientização

### Benefícios
- Redução de custos (~R$ X/ano)
- Imagem de sustentabilidade corporativa
- Possível acesso a incentivos governamentais
- Ambiente mais confortável

### Próximos Passos Recomendados
1. **Mês 1-2**: Fazer auditoria energética profissional
2. **Mês 2-3**: Implementar lâmpadas LED (quick win)
3. **Mês 3-6**: Otimizar sistemas de A/C e servidores
4. **Mês 6-12**: Monitorar e ajustar metas

### Informações Necessárias
- Histórico de 12 meses de consumo energético
- Contas de energia com detalhamento
- Planta técnica com consumidores principais
- Orçamento aprovado para investimentos`
  },

  // Vendas
  {
    area: "vendas",
    input: {
      area: "Vendas",
      tipo: "Proposta",
      prioridade: "alta",
      descricao_estruturada: "Cliente grande solicitou proposta de volume para 50 mil unidades. Preço solicitado: 30% abaixo da tabela. Prazo: 3 dias",
      sugestao_proximo_passo: "Avaliar viabilidade e estruturar proposta"
    },
    output: `## Análise de Oportunidade com Desconto Agressivo

### Análise Comercial
1. Margem atual na tabela: ___% 
2. Margem com desconto de 30%: ___% (viável?)
3. Volume potencial (50k unidades) = faturamento de R$ X
4. Cliente é pedra fundamental (sim/não)?

### Considerações Estratégicas
- É cliente novo ou existente?
- Pode levar a outras vendas futuras?
- Impacto na base de clientes (guerra de preços?)
- Capacidade de produção para 50k?

### Riscos Comerciais
- Margem muito baixa pode ser não-viável
- Pode estabelecer precedente de preço baixo
- Concorrência pode oferecer ainda mais barato
- Prazo de 3 dias é apertado para análise

### Próximos Passos Recomendados
1. Contraproposta de 15-20% de desconto (margem mínima)
2. Condicionar a: pagamento adiantado + exclusividade regional
3. Propor ciclo de redução de preço se volume aumentar
4. Confirmar capacidade de produção urgente

### Informações Necessárias
- Tabela de preços e margens por volume
- Capacidade de produção disponível
- Histórico de relacionamento com cliente
- Cálculo de ponto de equilíbrio de margem`
  },
  {
    area: "vendas",
    input: {
      area: "Vendas",
      tipo: "Pipeline",
      prioridade: "média",
      descricao_estruturada: "Pipeline de vendas para Q4 está 40% abaixo da meta. Velocidade de ciclo de vendas aumentou 3x",
      sugestao_proximo_passo: "Analisar gargalos e acelerar fechamentos"
    },
    output: `## Análise e Recuperação de Pipeline

### Diagnóstico do Problema
1. Qual é a meta de Q4 vs real atual
2. Onde está o gap principal (prospects novos vs fechamento)
3. Ciclo de vendas mudou (por quê?)
4. Concorrentes aumentaram pressão (sim/não)?

### Análise por Fase
- **Prospecção**: Suficiente volume de leads?
- **Qualificação**: Taxa de conversão caiu?
- **Proposta**: Tempo de resposta longo?
- **Negociação**: Objeções novas surgiram?
- **Fechamento**: Decisores demorando mais?

### Riscos de Negócio
- Meta de receita para Q4 em risco
- Possível impacto em bônus da equipe
- Falta de previsibilidade de receita
- Possível pressão para descontos agressivos

### Próximos Passos Recomendados
1. **Hoje**: Review 1:1 com cada vendedor (gargalos?)
2. **Amanhã**: Contactar 20 prospects em "proposta" para urgência
3. **Esta semana**: Oferecer pequeno desconto para fechamentos até dia 15
4. **Semana 2**: Prospectação agressiva para Q1

### Informações Necessárias
- Detalhamento completo do pipeline por fase
- Histórico de ciclo de vendas (3-6 meses)
- Propostas abertas há mais de 30 dias
- Motivos de perdas recentes`
  },
  {
    area: "vendas",
    input: {
      area: "Vendas",
      tipo: "Estratégia",
      prioridade: "média",
      descricao_estruturada: "Mercado de referência está em contração. Necessário expandir para novos segmentos de clientes ou geográficas",
      sugestao_proximo_passo: "Pesquisar mercados alternativos e viabilidade"
    },
    output: `## Estratégia de Diversificação de Mercado

### Análise Atual
1. Mercado principal em contração: __% ao ano
2. Dependência de um segmento: ___% da receita
3. Competição no segmento principal: aumentou (sim/não)?
4. Nossos diferenciais aplicáveis a outros segmentos?

### Oportunidades de Expansão
- **Segmento A**: _____ (potencial X, complexidade Y)
- **Segmento B**: _____ (potencial X, complexidade Y)
- **Região A**: _____ (potencial X, desafios Y)
- **Região B**: _____ (potencial X, desafios Y)

### Riscos Estratégicos
- Falta de expertise em novo segmento
- Distribuição/logística complexa em nova região
- Necessidade de novo modelo comercial
- Investimento de recursos significativo

### Próximos Passos Recomendados
1. **Mês 1**: Fazer pesquisa de mercado (2-3 oportunidades)
2. **Mês 1-2**: Pilotar com 3-5 clientes em novo segmento
3. **Mês 2-3**: Avaliar viabilidade e ROI
4. **Mês 4+**: Scale-up se validado

### Informações Necessárias
- Tamanho de mercado dos segmentos alternativos
- Principais competidores em novos segmentos
- Necessidades específicas de clientes
- Capacidade operacional de servir novos segmentos`
  },
  {
    area: "vendas",
    input: {
      area: "Vendas",
      tipo: "Competição",
      prioridade: "alta",
      descricao_estruturada: "Concorrente principal ofereceu ao cliente chave preço 25% menor. Cliente em avaliação. Decisão em 5 dias",
      sugestao_proximo_passo: "Preparar contraproposta com value diferenciado"
    },
    output: `## Resposta Estratégica a Pressão Competitiva

### Análise da Ameaça
1. Cliente é crítico? (faturamento ___% da receita)
2. Concorrente pode realmente entregar qualidade?
3. Qual é o valor total (preço + serviço)?
4. Relação histórica com cliente (forte/média/fraca)?

### Opções de Resposta
- **Opção A**: Igualar preço (impacto em margem: ___)
- **Opção B**: Manter preço + agregar valor diferenciado
- **Opção C**: Oferecer desconto seletivo (5-10%)
- **Opção D**: Deixar partir e manter posicionamento premium

### Análise de Valor Diferenciado
- Qualidade/confiabilidade histórica
- Suporte técnico superior
- Facilidades de pagamento
- Integração/customização
- Relacionamento de longo prazo

### Riscos de Ação
- Igualar preço prejudica margem
- Abandonar cliente cria precedente
- Overpricing pode afastá-lo permanentemente

### Próximos Passos Recomendados
1. **Hoje**: Ligar para cliente explorando preocupações
2. **Hoje**: Solicitar reunião face-a-face (urgência)
3. **Amanhã**: Apresentar proposta com value diferenciado
4. **3 dias**: Decisão sobre desconto se necessário

### Informações Necessárias
- Detalhes da proposta do concorrente
- Histórico de desempenho com cliente
- Margem atual e mínima aceitável
- Pontos de diferenciação reais vs concorrente`
  }
];
