import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/home";
import Landing from "@/pages/landing";
import Demands from "@/pages/demands";
import AllDemands from "@/pages/all-demands";
import DemandsManager from "@/pages/demands-manager";
import DemandDetail from "@/pages/demand-detail";
import DemandFlow from "@/pages/demand-flow";
import KanbanBoardPage from "@/pages/kanban-board";
import KanbanDemandDetail from "@/pages/kanban-demand-detail";
import KanbanAreaDetail from "@/pages/kanban-area-detail";
import KanbanList from "@/pages/kanban-list";
import KanbanWorkflow from "@/pages/kanban-workflow";
import AreaDetailsPage from "@/pages/area-details";
import AreasListPage from "@/pages/areas-list";
import AgentsPage from "@/pages/agents";
import AgentDetailPage from "@/pages/agent-detail";
import InsightsPage from "@/pages/insights";
import BottlenecksPage from "@/pages/bottlenecks";
import AlertsPage from "@/pages/alerts";
import ObservabilityPage from "@/pages/observability";
import AILogsPage from "@/pages/ai-logs";
import AILogsDetailPage from "@/pages/ai-logs-detail";
import WorkflowGraphPage from "@/pages/workflowgraph";
import AgentsStudio from "@/pages/agents-studio";
import MonitoringPage from "@/pages/monitoring";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/landing" component={Landing} />
        <Route path="/demands" component={Demands} />
        <Route path="/app/demands" component={DemandsManager} />
        <Route path="/app/demands/:id" component={DemandDetail} />
        <Route path="/app/demands/:id/flow" component={DemandFlow} />
        <Route path="/app/all-demands" component={AllDemands} />
        <Route path="/app/board" component={KanbanBoardPage} />
        <Route path="/app/workflows" component={KanbanList} />
        <Route path="/app/kanban/workflow/:workflowId" component={KanbanWorkflow} />
        <Route path="/app/kanban/:id" component={KanbanDemandDetail} />
        <Route path="/app/kanban/area/:area" component={KanbanAreaDetail} />
        <Route path="/app/areas" component={AreasListPage} />
        <Route path="/app/areas/:id" component={AreaDetailsPage} />
        <Route path="/app/agents" component={AgentsPage} />
        <Route path="/app/agents/:id" component={AgentDetailPage} />
        <Route path="/app/agents-studio" component={AgentsStudio} />
        <Route path="/app/insights" component={InsightsPage} />
        <Route path="/app/bottlenecks" component={BottlenecksPage} />
        <Route path="/app/alerts" component={AlertsPage} />
        <Route path="/app/ai/logs" component={AILogsPage} />
        <Route path="/app/ai/logs/:id" component={AILogsDetailPage} />
        <Route path="/app/workflow-graph" component={WorkflowGraphPage} />
        <Route path="/app/monitoring" component={MonitoringPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/observability" component={ObservabilityPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
      <Sonner />
    </QueryClientProvider>
  );
}

export default App;
