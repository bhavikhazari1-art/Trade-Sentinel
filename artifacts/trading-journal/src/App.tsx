import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TradesProvider } from "@/contexts/TradesContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AddTrade from "@/pages/AddTrade";
import Analytics from "@/pages/Analytics";
import AICoach from "@/pages/AICoach";
import Calendar from "@/pages/Calendar";
import Profile from "@/pages/Profile";
import Goals from "@/pages/Goals";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  return (
    <TradesProvider>
      <GoalsProvider>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/add" component={AddTrade} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/ai" component={AICoach} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/goals" component={Goals} />
            <Route path="/profile" component={Profile} />
            <Route>
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Page not found</p>
              </div>
            </Route>
          </Switch>
        </Layout>
      </GoalsProvider>
    </TradesProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
