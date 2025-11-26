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

const onboardingSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  area: z.string().min(1, 'Selecione uma área'),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

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

export default function OnboardingPage() {
  const { tenant, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingData>({
    name: tenant?.name || '',
    area: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Card className="max-w-md p-8">
          <p className="text-red-500">Erro: Tenant não encontrado</p>
        </Card>
      </div>
    );
  }

  const handleChange = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = onboardingSchema.parse(formData);
      setIsSubmitting(true);

      const response = await fetch('/api/tenant/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: validated.name,
          isConfigured: true,
          metadata: {
            area: validated.area,
            logo: logoPreview,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao atualizar workspace');
      }

      toast.success('Workspace configurado com sucesso!');
      setTimeout(() => navigate('/app'), 1000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      } else {
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-slate-900 border-slate-700 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-onboarding-title">
              Configure seu workspace
            </h1>
            <p className="text-slate-400">Personalize seu espaço de trabalho para começar</p>
          </div>

          <div className="mb-8 flex items-center gap-2">
            <div className="flex-1 h-1 bg-blue-500 rounded"></div>
            <span className="text-xs font-medium text-slate-400">Passo 1 de 1</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-onboarding">
            <div>
              <Label htmlFor="logo" className="text-slate-300 text-sm font-medium block mb-3">
                Logo do workspace (opcional)
              </Label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    data-testid="input-logo"
                  />
                </div>
                {logoPreview && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-800">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" data-testid="img-logo-preview" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="name" className="text-slate-300 text-sm font-medium block mb-2">
                Nome do workspace
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Minha Empresa"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-workspace-name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="area" className="text-slate-300 text-sm font-medium block mb-2">
                Área de atuação
              </Label>
              <Select value={formData.area} onValueChange={(v) => handleChange('area', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-area">
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-white">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              data-testid="button-complete-setup"
            >
              {isSubmitting ? 'Configurando...' : 'Completar configuração'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400">💡 Você pode modificar essas informações depois nas configurações</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
