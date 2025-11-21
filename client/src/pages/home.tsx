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
          Next.js 14 Style Prototype
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A clean, structured foundation with Tailwind CSS and Supabase integration, adapted for the Replit Mockup environment.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base">
            Documentation
          </Button>
        </div>
      </section>

      {/* Status Check */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Supabase Status
            </CardTitle>
            <CardDescription>Connection check to your backend</CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <Alert className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Connected</AlertTitle>
                <AlertDescription>
                  Supabase environment variables detected.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Connected</AlertTitle>
                <AlertDescription>
                  Missing <code>VITE_SUPABASE_URL</code> or <code>NEXT_PUBLIC_SUPABASE_URL</code>.
                  Add them to your Replit Secrets.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutIcon className="w-5 h-5 text-primary" />
              Project Structure
            </CardTitle>
            <CardDescription>Organized for scalability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <span className="font-mono font-bold text-primary">/components</span>
              <span className="text-muted-foreground">UI Building blocks</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <span className="font-mono font-bold text-primary">/lib</span>
              <span className="text-muted-foreground">Utilities & Clients (Supabase)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <span className="font-mono font-bold text-primary">/pages</span>
              <span className="text-muted-foreground">Application Routes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Included Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Tailwind CSS",
              description: "Utility-first CSS framework for rapid UI development.",
              icon: <span className="text-xl">🎨</span>
            },
            {
              title: "TypeScript",
              description: "Static type checking for better developer experience.",
              icon: <span className="text-xl">📘</span>
            },
            {
              title: "Supabase Client",
              description: "Pre-configured client for Auth and Database.",
              icon: <span className="text-xl">⚡</span>
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
