import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useAdminRoles,
  useAdminPermissions,
  useSeedPermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  type Role,
  type Permission,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Users,
} from "lucide-react";

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  
  permissions.forEach(permission => {
    const [category] = permission.key.split(".");
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
  });
  
  return groups;
}

export default function AdminRolesPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useAdminRoles();
  const { data: permissionsData, isLoading: permissionsLoading } = useAdminPermissions();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const seedPermissions = useSeedPermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const CATEGORY_LABELS: Record<string, string> = {
    tenant: t('admin.permCategoryTenant'),
    workflow: t('admin.permCategoryWorkflow'),
    card: t('admin.permCategoryCard'),
  };

  useEffect(() => {
    if (permissionsData?.permissions?.length === 0) {
      seedPermissions.mutate();
    }
  }, [permissionsData]);

  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setSelectedPermissions(new Set());
    setEditRole(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setFormName(role.name);
    setFormDescription(role.description || "");
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    setEditRole(role);
    setCreateModalOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  const toggleCategory = (categoryPermissions: Permission[]) => {
    const categoryIds = categoryPermissions.map(p => p.id);
    const allSelected = categoryIds.every(id => selectedPermissions.has(id));
    
    const newSet = new Set(selectedPermissions);
    if (allSelected) {
      categoryIds.forEach(id => newSet.delete(id));
    } else {
      categoryIds.forEach(id => newSet.add(id));
    }
    setSelectedPermissions(newSet);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error(t('admin.roleName') + " required");
      return;
    }

    try {
      if (editRole) {
        await updateRole.mutateAsync({
          roleId: editRole.id,
          name: formName,
          description: formDescription || undefined,
          permissionIds: Array.from(selectedPermissions),
        });
        toast.success(t('admin.roleUpdated'));
      } else {
        await createRole.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          permissionIds: Array.from(selectedPermissions),
        });
        toast.success(t('admin.roleCreated'));
      }
      setCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(t('admin.deleteRoleConfirm'))) {
      return;
    }

    try {
      await deleteRole.mutateAsync(role.id);
      toast.success(t('admin.roleDeleted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const groupedPermissions = permissionsData?.permissions ? groupPermissions(permissionsData.permissions) : {};

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{t('common.error')}: {(rolesError as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.rolesTitle')}</h1>
            <p className="text-muted-foreground">{t('admin.rolesSubtitle')}</p>
          </div>
        </div>

        <Button onClick={openCreateModal} data-testid="button-create-role">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createRole')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.defaultRoles')}</CardTitle>
          <CardDescription>
            {t('admin.availableRoles')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            {[
              { id: "tenant_owner", name: "Tenant Owner", desc: "Controle total sobre o workspace e todas as configurações" },
              { id: "tenant_admin", name: "Tenant Admin", desc: "Pode gerenciar usuários, áreas, roles, times e boards" },
              { id: "area_owner", name: "Area Owner", desc: "Pode criar boards, definir SLAs e automações da área" },
              { id: "area_admin", name: "Area Admin", desc: "Pode criar e editar workflows e automações da área" },
              { id: "team_lead", name: "Team Lead", desc: "Líder de execução com permissão em todos os kanbans da área" },
              { id: "team_member", name: "Team Member", desc: "Membro de execução nos kanbans atribuídos" },
              { id: "team_viewer", name: "Team Viewer", desc: "Acesso somente leitura aos kanbans atribuídos" },
            ].map((role) => (
              <div key={role.id} className="p-4 border rounded-lg text-center flex flex-col items-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">{role.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{role.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.customRoles')}</CardTitle>
          <CardDescription>
            {t('admin.rolesSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesData?.roles?.length === 0 ? (
            <div className="py-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('admin.noRoles')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('admin.rolesSubtitle')}
              </p>
              <Button onClick={openCreateModal} data-testid="button-create-first-role">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.createRole')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rolesData?.roles?.map((role) => (
                <Card key={role.id} data-testid={`card-role-${role.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {role.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {role.userCount} {role.userCount === 1 ? "user" : "users"}
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`menu-role-${role.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(role)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('admin.editRole')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('admin.deleteRole')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('admin.permissions')}</Label>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 4).map((perm) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            {perm.key.split(".")[1]}
                          </Badge>
                        ))}
                        {role.permissions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 4}
                          </Badge>
                        )}
                        {role.permissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editRole ? t('admin.editRole') : t('admin.createRole')}</DialogTitle>
            <DialogDescription>
              {t('admin.rolesSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.roleName')}</Label>
                <Input
                  id="name"
                  placeholder={t('admin.roleNamePlaceholder')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  data-testid="input-role-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('admin.roleDescription')}</Label>
                <Input
                  id="description"
                  placeholder={t('admin.roleDescriptionPlaceholder')}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  data-testid="input-role-description"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.permissions')}</Label>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={perms.every(p => selectedPermissions.has(p.id))}
                            onCheckedChange={() => toggleCategory(perms)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`checkbox-category-${category}`}
                          />
                          <span className="font-medium">
                            {CATEGORY_LABELS[category] || category}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {perms.filter(p => selectedPermissions.has(p.id)).length}/{perms.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-6">
                          {perms.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                                data-testid={`checkbox-permission-${permission.key}`}
                              />
                              <Label
                                htmlFor={permission.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                <span className="font-medium">{permission.key}</span>
                                {permission.description && (
                                  <span className="text-muted-foreground ml-2">
                                    - {permission.description}
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedPermissions.size} {t('admin.permissions').toLowerCase()}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRole.isPending || updateRole.isPending}
              data-testid="button-save-role"
            >
              {createRole.isPending || updateRole.isPending
                ? t('common.loading')
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
