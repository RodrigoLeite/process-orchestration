import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const { isAuthenticated, login, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (user?.lastWorkspaceId) {
        // Se o usuário já tiver um workspace salvo, tenta carregar ele
        // O tenantId será injetado pelo contexto ou passado via header
        navigate('/app');
      } else {
        navigate('/app');
      }
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-black" data-testid="text-logo">
            Process Orchestration
          </h2>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4" data-testid="text-welcome">
            Welcome back
          </h1>
        </div>

        {/* Google Login Button */}
        <div className="space-y-4 mb-8">
          <button
            onClick={login}
            data-testid="button-google-login"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition-colors"
          >
            {/* Google Logo SVG */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              data-testid="icon-google"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Log in with Google
          </button>
        </div>

        {/* Signup Link */}
        <div className="mb-8">
          <a
            href="#"
            className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            data-testid="link-create-account"
          >
            Create new account
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-sm text-gray-500">or continue with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Apple Login (Placeholder) */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-apple-login"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.05 13.5c-.91 0-1.82.55-2.08 1.47-.5 1.72.12 3.45 1.51 4.09 1.39.64 3.06-.49 3.56-2.21.5-1.72-.12-3.45-1.51-4.09-.54-.25-1.10-.26-1.48-.26zm-2.6-2.5c.3 0 .6 0 .9-.1.57-.2.97-.77.9-1.36-.07-.6-.58-1.05-1.18-1.05-.3 0-.6 0-.9.1-.57.2-.97.77-.9 1.36.07.6.58 1.05 1.18 1.05z" />
          </svg>
          Log in with Apple
        </button>

        {/* Terms */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <a href="#" className="hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
