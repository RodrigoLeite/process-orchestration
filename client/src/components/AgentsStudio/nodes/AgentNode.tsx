import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { ChevronDown, Bot } from 'lucide-react';
import { useAgentsStore } from '@/lib/store/agentsStore';

export default function AgentNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const { updateNode } = useAgentsStore();

  const {
    label = 'Agent Executor',
    temperature = 0.7,
    maxTokens = 2000,
    logicType = 'none',
    condition = '',
    modelProvider = 'OpenAI',
    modelName = 'gpt-4o-mini',
  } = data;

  const [title, setTitle] = useState(label);
  const [tempProvider, setTempProvider] = useState(modelProvider);
  const [tempModel, setTempModel] = useState(modelName);
  const [tempTemp, setTempTemp] = useState(temperature);
  const [tempMaxTokens, setTempMaxTokens] = useState(maxTokens);
  const [tempLogicType, setTempLogicType] = useState(logicType);
  const [tempCondition, setTempCondition] = useState(condition);

  const updateNodeData = useCallback((newData: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((n: any) =>
        n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
    updateNode(id, newData);
  }, [id, setNodes, updateNode]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateNodeData({ label: newTitle });
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setTempProvider(newProvider);
    updateNodeData({ modelProvider: newProvider });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setTempModel(newModel);
    updateNodeData({ modelName: newModel });
  };

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTemp = parseFloat(e.target.value);
    setTempTemp(newTemp);
    updateNodeData({ temperature: newTemp });
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTokens = parseInt(e.target.value);
    setTempMaxTokens(newTokens);
    updateNodeData({ maxTokens: newTokens });
  };

  const handleLogicTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLogicType = e.target.value;
    setTempLogicType(newLogicType);
    updateNodeData({ logicType: newLogicType });
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCondition = e.target.value;
    setTempCondition(newCondition);
    updateNodeData({ condition: newCondition });
  };

  const providerOptions = ['OpenAI', 'Anthropic', 'Google', 'Cohere'];
  const modelOptions: { [key: string]: string[] } = {
    OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    Anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    Google: ['gemini-pro', 'gemini-1.5-pro'],
    Cohere: ['command-r', 'command-light'],
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <Handle type="target" position={Position.Top} />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-indigo-600 flex-shrink-0" />
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent font-bold text-gray-900 outline-none text-lg border-b border-transparent hover:border-gray-300 focus:border-indigo-500"
            data-testid={`input-agent-node-title-${id}`}
          />
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
        Executa um agente de IA com configuração de modelo e lógica customizada.
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Model Provider */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Model Provider
          </label>
          <select
            value={tempProvider}
            onChange={handleProviderChange}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            data-testid={`select-provider-${id}`}
          >
            {providerOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Model Name
          </label>
          <select
            value={tempModel}
            onChange={handleModelChange}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            data-testid={`select-model-${id}`}
          >
            {modelOptions[tempProvider]?.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Temperature: <span className="text-indigo-600 font-normal">{tempTemp.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={tempTemp}
            onChange={handleTempChange}
            className="w-full"
            data-testid={`slider-temperature-${id}`}
          />
          <div className="text-xs text-gray-500 mt-1">
            {tempTemp < 0.5 ? 'Determinístico' : tempTemp < 1 ? 'Equilibrado' : 'Criativo'}
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            value={tempMaxTokens}
            onChange={handleMaxTokensChange}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            data-testid={`input-max-tokens-${id}`}
          />
        </div>

        {/* Logic Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Logic Type
          </label>
          <select
            value={tempLogicType}
            onChange={handleLogicTypeChange}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            data-testid={`select-logic-type-${id}`}
          >
            <option value="none">None</option>
            <option value="filter">Filter</option>
            <option value="routing">Routing</option>
            <option value="aggregation">Aggregation</option>
          </select>
        </div>

        {/* Condition */}
        {tempLogicType !== 'none' && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Condition
            </label>
            <textarea
              value={tempCondition}
              onChange={handleConditionChange}
              placeholder="e.g., priority >= 5"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-xs resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-16"
              data-testid={`textarea-condition-${id}`}
            />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
