import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  SelectionMode,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PlayCircle,
  ChevronRight,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "agent" | "system" | "decision";
  description: string;
  meta?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface NodeDetail {
  id: string;
  label: string;
  description: string;
  type: string;
  meta?: Record<string, any>;
  lastRuns?: Array<{
    id: string;
    status: "success" | "error";
    timestamp: string;
    duration?: number;
  }>;
}

const getNodeColor = (type: string): string => {
  switch (type) {
    case "agent":
      return "bg-blue-100 border-blue-400";
    case "system":
      return "bg-purple-100 border-purple-400";
    case "decision":
      return "bg-green-100 border-green-400";
    default:
      return "bg-gray-100 border-gray-400";
  }
};

const CustomNode = ({ data, selected }: NodeProps<GraphNode>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 transition-all min-w-[150px] ${getNodeColor(
        data.type
      )} ${selected ? "border-blue-500 shadow-lg shadow-blue-300/50" : ""}`}
      title={data.description}
      data-testid={`node-${data.id}`}
    >
      <Handle 
        type="target" 
        position={Position.Top}
        id={`${data.id}-input`}
        isConnectable={true}
        style={{ width: 10, height: 10 }}
      />
      <div className="font-semibold text-sm text-gray-900">{data.label}</div>
      <div className="text-xs text-gray-600 mt-1">{data.type}</div>
      <Handle 
        type="source" 
        position={Position.Bottom}
        id={`${data.id}-output`}
        isConnectable={true}
        style={{ width: 10, height: 10 }}
      />
    </div>
  );
};

// Memoize nodeTypes to avoid React Flow warning
const nodeTypes = {
  default: CustomNode,
};

export default function WorkflowGraph() {
  const queryClient = useQueryClient();
  const [testInput, setTestInput] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch graph data
  const { data: graphData, isLoading: graphLoading } = useQuery<GraphData>({
    queryKey: ["workflow-graph"],
    queryFn: async () => {
      const res = await fetch("/api/ai/graph");
      if (!res.ok) throw new Error("Failed to fetch graph");
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch selected node details
  const { data: nodeDetail, isLoading: nodeLoading } = useQuery<NodeDetail>({
    queryKey: ["workflow-node", selectedNodeId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/graph/${selectedNodeId}`);
      if (!res.ok) throw new Error("Failed to fetch node details");
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedNodeId,
  });

  // Execute graph test
  const executeMutation = useMutation({
    mutationFn: async (input: string) => {
      const res = await fetch("/api/ai/graph/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error("Failed to execute graph");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Execução iniciada com sucesso!");
      setTestInput("");
      queryClient.invalidateQueries({ queryKey: ["workflow-graph"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-node"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao executar: ${error.message}`);
    },
  });

  // Build React Flow nodes and edges from API data
  useMemo(() => {
    if (!graphData) return;

    const rfNodes: Node[] = graphData.nodes.map((node, index) => ({
      id: node.id,
      data: node,
      position: {
        x: (index % 3) * 300,
        y: Math.floor(index / 3) * 150,
      },
      type: "default",
    }));

    const rfEdges: Edge[] = graphData.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [graphData, setNodes, setEdges]);

  const handleSelectionChange = (changes: { nodes: Array<{ id: string }>; edges: Array<any> }) => {
    if (changes.nodes.length > 0) {
      setSelectedNodeId(changes.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  };

  const handleExecute = () => {
    if (!testInput.trim()) {
      toast.error("Por favor, digite um input para testar");
      return;
    }
    executeMutation.mutate(testInput);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 bg-gray-50 p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-700 block mb-2">
              Input para Teste
            </label>
            <div className="flex gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Digite o input para testar o graph..."
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                data-testid="input-test-graph"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecute();
                }}
              />
              <Button
                onClick={handleExecute}
                disabled={executeMutation.isPending || !testInput.trim()}
                className="gap-2"
                data-testid="button-execute-graph"
              >
                <PlayCircle className="w-4 h-4" />
                {executeMutation.isPending ? "Executando..." : "Executar Graph"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden gap-0">
        {/* Graph Container (70%) */}
        <div className="flex-1 bg-white overflow-hidden">
          {graphLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">Carregando grafo...</div>
            </div>
          ) : nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={handleSelectionChange}
              fitView
              selectionMode={SelectionMode.Full}
              nodeTypes={nodeTypes}
            >
              <Background
                color="#e5e7eb"
                gap={12}
                size={1}
                style={{ backgroundColor: "#ffffff" }}
              />
              <Controls />
              <MiniMap
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            </ReactFlow>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">Nenhum nodo encontrado</div>
            </div>
          )}
        </div>

        {/* Sidebar (30%) */}
        <div className="w-[30%] bg-gray-50 border-l border-gray-300 overflow-y-auto">
          {!selectedNodeId ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  Clique em um nodo para ver detalhes
                </p>
              </div>
            </div>
          ) : nodeLoading ? (
            <div className="p-4">
              <div className="text-gray-500 text-sm">Carregando...</div>
            </div>
          ) : nodeDetail ? (
            <div className="p-4 space-y-4">
              {/* Node Title */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {nodeDetail.label}
                </h3>
                <Badge
                  variant="outline"
                  className="bg-white text-gray-700 border-gray-300"
                  data-testid="badge-node-type"
                >
                  {nodeDetail.type}
                </Badge>
              </div>

              {/* Node Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Descrição
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {nodeDetail.description}
                </p>
              </div>

              {/* Node Metadata */}
              {nodeDetail.meta && Object.keys(nodeDetail.meta).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Metadados
                  </h4>
                  <div className="bg-white rounded-lg p-3 text-xs text-gray-600 max-h-32 overflow-y-auto font-mono border border-gray-200">
                    {JSON.stringify(nodeDetail.meta, null, 2)}
                  </div>
                </div>
              )}

              {/* Last Runs */}
              {nodeDetail.lastRuns && nodeDetail.lastRuns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Últimas Execuções
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {nodeDetail.lastRuns.map((run) => (
                      <div
                        key={run.id}
                        className="bg-white rounded p-2 border border-gray-200"
                        data-testid={`run-item-${run.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {run.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(run.timestamp).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {run.duration && (
                          <div className="text-xs text-gray-600">
                            ⏱ {(run.duration / 1000).toFixed(2)}s
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-300">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-gray-300 hover:bg-gray-100"
                  disabled
                  data-testid="button-run-agent"
                  title="Funcionalidade ainda não implementada"
                >
                  <PlayCircle className="w-4 h-4" />
                  Executar Agente
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
