import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Building2, Plus, LogIn } from 'lucide-react';
import { useState } from 'react';
import { queryClient } from '@/lib/queryClient';

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export default function WorkspacesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isCreating, setIsCreating] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['user-workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load workspaces');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3" data-testid="text-workspaces-title">
          <Building2 className="w-8 h-8 text-primary" />
          Meus Workspaces
        </h1>
        <p className="text-gray-600">Gerencie seus workspaces e crie novos</p>
      </div>

      {/* Create New Workspace */}
      <Card className="p-6 mb-8 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer" data-testid="card-create-workspace">
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex flex-col items-center justify-center gap-3 py-8 bg-transparent border-none cursor-pointer"
          data-testid="button-create-workspace"
        >
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Criar novo workspace</p>
            <p className="text-sm text-gray-600">Configure um novo workspace para sua equipe</p>
          </div>
        </button>
      </Card>

      {/* Workspaces Grid */}
      {workspaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-workspaces">
          {workspaces.map((workspace: Workspace) => (
            <Card
              key={workspace.id}
              className="p-6 hover:shadow-lg transition-shadow"
              data-testid={`card-workspace-${workspace.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate" data-testid={`text-workspace-name-${workspace.id}`}>
                    {workspace.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800" data-testid={`badge-role-${workspace.id}`}>
                      {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      console.log('[WORKSPACE SWITCH] Attempting to switch to', workspace.id);
                      // Switch to this workspace
                      const res = await fetch(`/api/workspaces/${workspace.id}/switch`, {
                        method: 'POST',
                        credentials: 'include',
                      });
                      console.log('[WORKSPACE SWITCH] Response status:', res.status);
                      if (res.ok) {
                        console.log('[WORKSPACE SWITCH] Success, invalidating session and redirecting');
                        // Invalidate auth session to reload the new workspace
                        await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
                        // Redirect to the workspace
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 200);
                      } else {
                        console.error('[WORKSPACE SWITCH] Failed with status', res.status);
                      }
                    } catch (error) {
                      console.error('[WORKSPACE SWITCH] Error:', error);
                    }
                  }}
                  data-testid={`button-switch-to-${workspace.id}`}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Acessar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center" data-testid="card-no-workspaces">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Você ainda não faz parte de nenhum workspace</p>
          <Button onClick={() => setIsCreating(true)} data-testid="button-create-first-workspace">
            <Plus className="w-4 h-4 mr-2" />
            Criar seu primeiro workspace
          </Button>
        </Card>
      )}

      {/* Create Workspace Modal - redirects to create workspace page */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" data-testid="modal-create-workspace" onClick={() => setIsCreating(false)}>
          <Card className="p-8 max-w-md w-full mx-4 bg-white shadow-xl" data-testid="card-create-workspace-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Criar novo workspace</h2>
            <p className="text-gray-600 mb-6">
              Configure um novo workspace para sua equipe.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="flex-1"
                data-testid="button-cancel-create"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  navigate('/workspaces/create');
                }}
                className="flex-1"
                data-testid="button-confirm-create"
              >
                Continuar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
