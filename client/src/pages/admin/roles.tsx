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
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Users,
  RefreshCw,
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

const CATEGORY_LABELS: Record<string, string> = {
  tenant: "Tenant Management",
  workflow: "Workflows",
  card: "Cards / Demands",
};

export default function AdminRolesPage() {
  const [, navigate] = useLocation();
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
      toast.error("Role name is required");
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
        toast.success("Role updated successfully");
      } else {
        await createRole.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          permissionIds: Array.from(selectedPermissions),
        });
        toast.success("Role created successfully");
      }
      setCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"? Users with this role will lose its permissions.`)) {
      return;
    }

    try {
      await deleteRole.mutateAsync(role.id);
      toast.success("Role deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
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
            <p className="text-destructive">Error loading roles: {(rolesError as Error).message}</p>
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
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">Manage custom roles and their permissions</p>
          </div>
        </div>

        <Button onClick={openCreateModal} data-testid="button-create-role">
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Roles</CardTitle>
          <CardDescription>
            These are the built-in roles with predefined permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {["Owner", "Admin", "Manager", "Member", "Viewer"].map((role) => (
              <div key={role} className="p-4 border rounded-lg text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium">{role}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {role === "Owner" && "Full control"}
                  {role === "Admin" && "Manage users & workflows"}
                  {role === "Manager" && "Manage department"}
                  {role === "Member" && "Execute tasks"}
                  {role === "Viewer" && "Read only"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Roles</CardTitle>
          <CardDescription>
            Create custom roles with specific permission combinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesData?.roles?.length === 0 ? (
            <div className="py-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No custom roles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create custom roles to fine-tune permissions
              </p>
              <Button onClick={openCreateModal} data-testid="button-create-first-role">
                <Plus className="h-4 w-4 mr-2" />
                Create First Role
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
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Permissions</Label>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 4).map((perm) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            {perm.key.split(".")[1]}
                          </Badge>
                        ))}
                        {role.permissions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 4} more
                          </Badge>
                        )}
                        {role.permissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">No permissions</span>
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
            <DialogTitle>{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editRole ? "Update role details and permissions" : "Create a custom role with specific permissions"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  placeholder="Super User"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  data-testid="input-role-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="A brief description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  data-testid="input-role-description"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
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
                {selectedPermissions.size} permissions selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRole.isPending || updateRole.isPending}
              data-testid="button-save-role"
            >
              {createRole.isPending || updateRole.isPending
                ? "Saving..."
                : editRole
                ? "Save Changes"
                : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
