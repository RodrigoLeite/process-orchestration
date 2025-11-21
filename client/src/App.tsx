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
import KanbanBoardPage from "@/pages/kanban-board";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/demands" component={Demands} />
        <Route path="/app/demands" component={DemandsManager} />
        <Route path="/app/demands/:id" component={DemandDetail} />
        <Route path="/app/all-demands" component={AllDemands} />
        <Route path="/app/board" component={KanbanBoardPage} />
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
