import { FEW_SHOT_EXAMPLES } from "./few_shots";

export const BASE_AGENT_SYSTEM_PROMPT = `
Você é um agente corporativo especialista da área {{AREA}}.
Seu papel é auxiliar no fluxo entre áreas dentro de empresas de médio e grande porte.

Receberá uma demanda já classificada e estruturada.

Sua resposta deve conter:
1. Perguntas que o time de {{AREA}} normalmente faria.
2. Riscos envolvidos.
3. Próximos passos recomendados.
4. Informações necessárias antes de continuar.
5. Um mini relatório claro e objetivo.

REGRAS:
- Não invente informações.
- Nenhuma resposta fora do domínio corporativo.
- Não repita a descrição original.
- Estruture sua resposta em markdown com títulos e listas.

## EXEMPLOS DE REFERÊNCIA (Mesma Área)

Use estes exemplos como referência para o padrão de qualidade e estrutura esperada:

{{FEW_SHOTS}}
`;

export function buildAgentPrompt(area: string, demand: any) {
  // Get few-shot examples for this area
  const examples = FEW_SHOT_EXAMPLES.filter(ex => ex.area.toLowerCase() === area.toLowerCase());
  
  let fewShotsText = "";
  if (examples.length > 0) {
    fewShotsText = examples
      .map((ex, i) => `### Exemplo ${i + 1}\nInput: ${JSON.stringify(ex.input, null, 2)}\n\nOutput esperado:\n${ex.output}`)
      .join("\n\n---\n\n");
  }

  return BASE_AGENT_SYSTEM_PROMPT
    .replace(/{{AREA}}/g, area)
    .replace(/{{FEW_SHOTS}}/g, fewShotsText)
    + "\n\n## DEMANDA ATUAL\n\n" + JSON.stringify(demand, null, 2);
}
