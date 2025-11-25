import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'wouter';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [, navigate] = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/app');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Process Orchestration
            </h1>
            <p className="text-slate-400">
              Manage demands and workflows efficiently
            </p>
          </div>

          <button
            onClick={login}
            data-testid="button-google-login"
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Chrome size={20} />
            Continue with Google
          </button>

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Sign in to access your workspace</p>
            <p className="text-xs mt-2">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>Secure authentication powered by Google</p>
        </div>
      </div>
    </div>
  );
}
