import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Demands from "@/pages/demands";
import AllDemands from "@/pages/all-demands";
import DemandsManager from "@/pages/demands-manager";
import DemandDetail from "@/pages/demand-detail";
import DemandFlow from "@/pages/demand-flow";
import KanbanBoardPage from "@/pages/kanban-board";
import DashboardPage from "@/pages/dashboard";
import AreaDetailsPage from "@/pages/area-details";
import AreasListPage from "@/pages/areas-list";
import InsightsPage from "@/pages/insights";
import BottlenecksPage from "@/pages/bottlenecks";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/demands" component={Demands} />
        <Route path="/app/demands" component={DemandsManager} />
        <Route path="/app/demands/:id" component={DemandDetail} />
        <Route path="/app/demands/:id/flow" component={DemandFlow} />
        <Route path="/app/all-demands" component={AllDemands} />
        <Route path="/app/board" component={KanbanBoardPage} />
        <Route path="/app/dashboard" component={DashboardPage} />
        <Route path="/app/areas" component={AreasListPage} />
        <Route path="/app/areas/:id" component={AreaDetailsPage} />
        <Route path="/app/insights" component={InsightsPage} />
        <Route path="/app/bottlenecks" component={BottlenecksPage} />
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
