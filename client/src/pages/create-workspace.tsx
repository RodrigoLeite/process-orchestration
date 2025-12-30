import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

const createWorkspaceSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  area: z.string().min(1, 'Selecione uma área'),
});

type CreateWorkspaceData = z.infer<typeof createWorkspaceSchema>;

const AREAS = [
  { value: 'ti', label: 'Tecnologia da Informação (TI)' },
  { value: 'rh', label: 'Recursos Humanos (RH)' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'operacoes', label: 'Operações' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outro', label: 'Outro' },
];

export default function CreateWorkspacePage() {
  const { isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateWorkspaceData>({
    name: '',
    area: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleChange = (field: keyof CreateWorkspaceData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = createWorkspaceSchema.parse(formData);
      setIsSubmitting(true);

      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: validated.name,
          area: validated.area,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao criar workspace');
      }

      const data = await response.json();
      toast.success('Workspace criado com sucesso!');
      
      // Switch to the new workspace and redirect
      const workspaceId = data.workspace.id;
      
      const switchResponse = await fetch(`/api/workspaces/${workspaceId}/switch`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (switchResponse.ok) {
        // Invalidate queries
        await queryClient.invalidateQueries({ queryKey: ['user-workspaces'] });
        await queryClient.invalidateQueries({ queryKey: ['auth-session'] });
        
        // Redirect to the new workspace dashboard
        setTimeout(() => {
          navigate('/');
        }, 500);
      } else {
        // If switch fails, just redirect to workspaces
        navigate('/workspaces');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      } else {
        toast.error(error instanceof Error ? error.message : 'Erro ao criar workspace');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-white border-gray-200 p-8 shadow-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-create-workspace-title">
              Criar novo workspace
            </h1>
            <p className="text-gray-600">Configure um novo espaço de trabalho para sua equipe</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-create-workspace">
            <div>
              <Label htmlFor="name" className="text-gray-700 text-sm font-medium block mb-3">
                Nome do workspace *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Workspace de Rodrigo 2"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="border-gray-300"
                data-testid="input-workspace-name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="area" className="text-gray-700 text-sm font-medium block mb-3">
                Área de atuação *
              </Label>
              <Select value={formData.area} onValueChange={(value) => handleChange('area', value)}>
                <SelectTrigger className="border-gray-300" data-testid="select-area">
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200" data-testid="select-content-area">
                  {AREAS.map((area) => (
                    <SelectItem key={area.value} value={area.value} className="text-gray-900">
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.area && <p className="text-red-500 text-sm mt-1">{errors.area}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/workspaces')}
                className="flex-1"
                data-testid="button-cancel-create"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-submit-create"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Workspace'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
