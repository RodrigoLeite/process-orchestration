import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PlayCircle,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "@/lib/hooks/useTranslation";

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

const getNodeColor = (
  type: string
): { bg: string; border: string; topBar: string; icon: string } => {
  switch (type) {
    case "agent":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        topBar: "bg-blue-500",
        icon: "text-blue-600",
      };
    case "system":
      return {
        bg: "bg-purple-50",
        border: "border-purple-200",
        topBar: "bg-purple-500",
        icon: "text-purple-600",
      };
    case "decision":
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        topBar: "bg-green-500",
        icon: "text-green-600",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-200",
        topBar: "bg-gray-500",
        icon: "text-gray-600",
      };
  }
};

interface PipelineNodeProps {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}

const PipelineNode = ({ node, isSelected, onClick }: PipelineNodeProps) => {
  const colors = getNodeColor(node.type);

  return (
    <div
      onClick={onClick}
      className={`flex flex-col rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
        isSelected
          ? `${colors.border} shadow-lg shadow-blue-300/40 ring-2 ring-blue-400`
          : `${colors.border} hover:shadow-md`
      }`}
    >
      {/* Top colored bar */}
      <div className={`h-1.5 ${colors.topBar}`}></div>

      {/* Content */}
      <div className={`p-4 ${colors.bg}`}>
        <div className="font-semibold text-sm text-gray-900 mb-1">
          {node.label}
        </div>
        <div className="text-xs text-gray-500 mb-2">{node.type}</div>
        <div className="text-xs text-gray-600 line-clamp-2">
          {node.description}
        </div>
      </div>
    </div>
  );
};

export default function WorkflowGraph() {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [testInput, setTestInput] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(Math.max(z + delta, 0.5), 2));
    }
  };

  // Fetch graph data
  const { data: graphData, isLoading: graphLoading } = useQuery<GraphData>({
    queryKey: ["workflow-graph", language],
    queryFn: async () => {
      const res = await fetch(`/api/ai/graph?lang=${language}`);
      if (!res.ok) throw new Error("Failed to fetch graph");
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch selected node details
  const { data: nodeDetail, isLoading: nodeLoading } = useQuery<NodeDetail>({
    queryKey: ["workflow-node", selectedNodeId, language],
    queryFn: async () => {
      const res = await fetch(`/api/ai/graph/${selectedNodeId}?lang=${language}`);
      if (!res.ok) throw new Error("Failed to fetch node details");
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedNodeId,
    staleTime: 0,
    gcTime: 0,
  });

  // Execute graph test
  const executeMutation = useMutation({
    mutationFn: async (input: string) => {
      const headers: any = { "Content-Type": "application/json" };
      const tenantId = localStorage.getItem("currentTenantId");
      if (tenantId) headers["x-tenant-id"] = tenantId;

      const res = await fetch("/api/ai/graph/run", {
        method: "POST",
        headers,
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error("Failed to execute graph");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("executionGraph.successMessage"));
      setTestInput("");
      queryClient.invalidateQueries({ queryKey: ["workflow-graph"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-node"] });
    },
    onError: (error: Error) => {
      toast.error(
        `${t("executionGraph.errorMessage")}: ${error.message}`
      );
    },
  });

  const handleExecute = () => {
    if (!testInput.trim()) {
      toast.error(t("executionGraph.emptyInputError"));
      return;
    }
    executeMutation.mutate(testInput);
  };

  // Get nodes in pipeline order
  const pipelineNodes = graphData?.nodes.filter((n) => n.type !== "decision") || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 bg-gray-50 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {t("executionGraph.title") || "Execution Pipeline"}
            </h2>
            <p className="text-sm text-gray-600">
              {t("executionGraph.subtitle") ||
                "Visualize your AI workflow execution pipeline"}
            </p>
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-700 block mb-2">
              {t("executionGraph.testInputLabel")}
            </label>
            <div className="flex gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder={t("executionGraph.testInputPlaceholder")}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 flex-1"
                data-testid="input-test-graph"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecute();
                }}
              />
              <Button
                onClick={handleExecute}
                disabled={executeMutation.isPending || !testInput.trim()}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                data-testid="button-execute-graph"
              >
                <PlayCircle className="w-4 h-4" />
                {executeMutation.isPending
                  ? t("executionGraph.executingButton")
                  : t("executionGraph.executeButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Zoom Controls Bar */}
        <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            className="gap-2"
            data-testid="button-zoom-in"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            className="gap-2"
            data-testid="button-zoom-out"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetZoom}
            className="gap-2"
            data-testid="button-zoom-reset"
            title="Resetar zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="text-sm text-gray-600 ml-2">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Pipeline Container - Top (60%) */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto border-b border-gray-300 relative"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            backgroundColor: "#f3f4f6",
          }}
          onWheel={handleWheel}
        >
          {/* Zoom hint */}
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 pointer-events-none">
            Ctrl + Scroll para zoom
          </div>
          {graphLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">{t("executionGraph.loadingGraph")}</div>
            </div>
          ) : pipelineNodes.length > 0 ? (
            <div
              className="inline-flex items-center gap-4 p-8 min-w-full origin-top-left transition-transform"
              style={{ transform: `scale(${zoom})` }}
            >
              {pipelineNodes.map((node, index) => (
                <div key={node.id} className="flex items-center gap-4 flex-shrink-0">
                  {/* Node Card */}
                  <div className="w-56">
                    <PipelineNode
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                    />
                  </div>

                  {/* Arrow connector (except for last node) */}
                  {index < pipelineNodes.length - 1 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-gray-400 to-gray-300"></div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <div className="w-6 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">{t("executionGraph.noNodesFound")}</div>
            </div>
          )}
        </div>

        {/* Details Panel - Bottom (40%) */}
        <div className="h-[40%] bg-gray-50 overflow-y-auto">
          {!selectedNodeId ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {t("executionGraph.selectNodeHint")}
                </p>
              </div>
            </div>
          ) : nodeLoading ? (
            <div className="p-4">
              <div className="text-gray-500 text-sm">{t("executionGraph.loading")}</div>
            </div>
          ) : nodeDetail ? (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Left column - Node Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
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

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {t("executionGraph.nodeDescription")}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {nodeDetail.description}
                    </p>
                  </div>
                </div>

                {/* Middle column - Configuration */}
                {nodeDetail.meta && Object.keys(nodeDetail.meta).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t("executionGraph.nodeMetadata")}
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(nodeDetail.meta).map(([key, value]) => (
                        <div
                          key={key}
                          className="bg-white rounded-lg p-3 border border-gray-200"
                        >
                          <div className="text-xs font-medium text-gray-500 mb-1 uppercase">
                            {key}
                          </div>
                          <div className="text-sm text-gray-900 font-semibold">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Right column - Last Runs */}
                {nodeDetail.lastRuns && nodeDetail.lastRuns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t("executionGraph.nodeLastRuns")}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {nodeDetail.lastRuns.map((run) => (
                        <div
                          key={run.id}
                          className="bg-white rounded-lg p-3 border border-gray-200"
                          data-testid={`run-item-${run.id}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {run.status === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-600 font-medium">
                              {run.status === "success" ? "Success" : "Failed"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(run.timestamp).toLocaleString("pt-BR")}
                          </div>
                          {run.duration && (
                            <div className="text-xs text-gray-600 mt-1">
                              ⏱ {(run.duration / 1000).toFixed(2)}s
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  className="gap-2 border-gray-300 hover:bg-gray-100"
                  disabled
                  data-testid="button-run-agent"
                  title={t("executionGraph.notImplemented")}
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("executionGraph.executeAgent")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
