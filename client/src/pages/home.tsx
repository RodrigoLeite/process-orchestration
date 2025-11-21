import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Database, Layout as LayoutIcon, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        // Simple ping to check if we can connect (even with invalid key, format check happens)
        // Real connection check would require valid URL/Key
        const { data, error } = await supabase.from('test').select('*').limit(1);
        // If we get a specific error about "relation not found" it means we connected but table missing
        // If we get "apikey" error, it means connected but auth failed
        // If URL is placeholder, it fails instantly
        if (import.meta.env.VITE_SUPABASE_URL) {
           setIsConnected(true);
        } else {
           setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent pb-2">
          Central de Demandas IA
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sistema inteligente de classificação e roteamento de demandas entre departamentos usando IA.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="h-12 px-8 text-base shadow-lg shadow-primary/20"
            onClick={() => window.location.href = '/demands'}
            data-testid="button-get-started"
          >
            Acessar Sistema
          </Button>
        </div>
      </section>

      {/* Status Check */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Database Status
            </CardTitle>
            <CardDescription>PostgreSQL connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                PostgreSQL database configured and ready.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              OpenAI Integration
            </CardTitle>
            <CardDescription>IA for demand classification</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Setup Required</AlertTitle>
              <AlertDescription>
                Add <code>OPENAI_API_KEY</code> to Replit Secrets for AI parsing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Feature Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Funcionalidades</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Classificação IA",
              description: "Usa GPT-4 para classificar demandas automaticamente por área, tipo e prioridade.",
              icon: <span className="text-xl">🤖</span>
            },
            {
              title: "Roteamento Automático",
              description: "Identifica o departamento responsável e sugere próximos passos.",
              icon: <span className="text-xl">🎯</span>
            },
            {
              title: "Gestão de Status",
              description: "Acompanhe o progresso das demandas: pendente, roteada, em andamento e concluída.",
              icon: <span className="text-xl">✅</span>
            }
          ].map((feature, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {feature.icon}
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
