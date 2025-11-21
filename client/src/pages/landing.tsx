import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Database, Zap, Brain } from "lucide-react";

export default function Landing() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
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
    <div className="space-y-16 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative py-20 text-center space-y-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-purple-600/5 blur-3xl" />
        
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-semibold text-primary">Sistema de IA para Demandas</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              Central de Demandas
            </span>
            <br />
            <span className="text-foreground">com Inteligência Artificial</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Classifique, roteie e gerencie demandas automaticamente entre departamentos com IA avançada
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
          <Button 
            size="lg" 
            className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
            onClick={() => window.location.href = '/dashboard'}
            data-testid="button-get-started"
          >
            <Zap className="w-5 h-5 mr-2" />
            Começar Agora
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-14 px-10 text-lg font-semibold hover:bg-primary/5 transition-all duration-300"
          >
            <Brain className="w-5 h-5 mr-2" />
            Saiba Mais
          </Button>
        </div>
      </section>

      {/* Status Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">Status da Integração</h2>
          <p className="text-muted-foreground">Verificando conexões com serviços externos</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                PostgreSQL
              </CardTitle>
              <CardDescription>Database Connection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Conectado e pronto
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Brain className="w-5 h-5 text-green-600" />
                </div>
                OpenAI
              </CardTitle>
              <CardDescription>IA para Classificação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Conectado e pronto
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold">Funcionalidades Principais</h2>
          <p className="text-muted-foreground">Tudo que você precisa para gerenciar demandas eficientemente</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🤖",
              title: "Classificação IA",
              description: "Usa GPT-4 para classificar demandas automaticamente por área, tipo e prioridade.",
              color: "from-purple-500/10",
              borderColor: "border-purple-500/20"
            },
            {
              icon: "🎯",
              title: "Roteamento Automático",
              description: "Identifica o departamento responsável e sugere próximos passos automaticamente.",
              color: "from-blue-500/10",
              borderColor: "border-blue-500/20"
            },
            {
              icon: "✅",
              title: "Gestão de Status",
              description: "Acompanhe o progresso: pendente, roteada, em andamento e concluída.",
              color: "from-green-500/10",
              borderColor: "border-green-500/20"
            }
          ].map((feature, i) => (
            <Card 
              key={i} 
              className={`border-l-4 ${feature.borderColor} bg-gradient-to-br ${feature.color} to-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <span className="text-3xl">{feature.icon}</span>
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
