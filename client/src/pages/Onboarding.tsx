import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';

export default function OnboardingPage() {
  const { isAuthenticated, tenant } = useAuth();
  const [, navigate] = useRouter();
  const [workspaceName, setWorkspaceName] = useState(tenant?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (tenant?.isConfigured) {
      navigate('/app');
    }
  }, [tenant?.isConfigured, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tenant/update`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          name: workspaceName,
          isConfigured: true,
        }),
      });

      if (response.ok) {
        // Reload auth session after tenant update
        window.location.href = '/app';
      } else {
        alert('Failed to configure workspace');
      }
    } catch (error) {
      console.error('Error configuring workspace:', error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Configure Your Workspace
          </h1>
          <p className="text-slate-400 mb-6">
            Let's set up your workspace to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="workspace-name"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Workspace Name
              </label>
              <Input
                id="workspace-name"
                data-testid="input-workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g., My Company"
                className="w-full"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !workspaceName.trim()}
              className="w-full"
              data-testid="button-configure-workspace"
            >
              {isSubmitting ? 'Configuring...' : 'Continue'}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            You can update this later in settings
          </div>
        </div>
      </div>
    </div>
  );
}
