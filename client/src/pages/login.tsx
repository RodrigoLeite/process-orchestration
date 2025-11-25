import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
          </div>
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl">Sistema de Demandas</CardTitle>
            <CardDescription>
              Faça login com sua conta Google para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-10 bg-white text-black hover:bg-gray-100 border-0 flex items-center justify-center gap-2 font-medium"
            data-testid="button-google-login"
          >
            <Chrome className="w-5 h-5" />
            Continuar com Google
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Ao fazer login, você concorda com nossos termos de serviço
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
