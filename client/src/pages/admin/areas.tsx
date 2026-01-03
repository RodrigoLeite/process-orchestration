import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
  useAddAreaAdmin,
  useRemoveAreaAdmin,
  useAdminUsers,
  type Area,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { getAreaName, getAreaDescription } from "@/lib/i18n";
import { useI18nStore } from "@/lib/store/i18nStore";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Users,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const COLOR_OPTIONS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

const ICON_OPTIONS = ["building", "folder", "layers", "box", "briefcase", "star"];

interface AreaAdmin {
  id: string;
  userId: string;
  role: "owner" | "admin";
  user?: { name: string; email: string };
}

export interface AreaAdminEnriched extends AreaAdmin {
  user?: { id: string; name: string; email: string; image?: string };
}

export interface AreaEnriched extends Omit<Area, 'teams'> {
  teams: any[];
  admins: AreaAdminEnriched[];
  teamCount: number;
  adminCount: number;
}

export default function AdminAreasPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { data, isLoading, error } = useAdminAreas() as { data: { areas: AreaEnriched[] } | undefined, isLoading: boolean, error: any };
  const { data: usersData } = useAdminUsers();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formIcon, setFormIcon] = useState(ICON_OPTIONS[0]);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  const addAreaAdmin = useAddAreaAdmin();
  const removeAreaAdmin = useRemoveAreaAdmin();

  // Filter users based on their roles for governance assignment
  const allUsers = usersData?.users || [];
  const areaOwnerUsers = allUsers.filter((u: any) => 
    u.role === "tenant_owner" || 
    u.role === "tenant_admin" || 
    u.role === "area_owner" ||
    u.role === "owner" ||
    u.roles?.some((r: any) => 
      ["tenant_owner", "tenant_admin", "area_owner", "owner", "Tenant Owner", "Tenant Admin", "Area Owner", "Owner"].includes(typeof r === 'string' ? r : (r.name || r.id))
    )
  );

  const areaAdminUsers = allUsers.filter((u: any) => 
    u.role === "tenant_owner" || 
    u.role === "tenant_admin" || 
    u.role === "area_owner" ||
    u.role === "area_admin" ||
    u.role === "owner" ||
    u.roles?.some((r: any) => 
      ["tenant_owner", "tenant_admin", "area_owner", "area_admin", "owner", "Tenant Owner", "Tenant Admin", "Area Owner", "Area Admin", "Owner"].includes(typeof r === 'string' ? r : (r.name || r.id))
    )
  );

  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(COLOR_OPTIONS[0]);
    setFormIcon(ICON_OPTIONS[0]);
    setEditArea(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setFormName(area.name);
    setFormDescription(area.description || "");
    setFormColor(area.color || COLOR_OPTIONS[0]);
    setFormIcon(area.icon || ICON_OPTIONS[0]);
    setEditArea(area);
    setCreateModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error(t('admin.areaNameRequired'));
      return;
    }

    try {
      if (editArea) {
        await updateArea.mutateAsync({
          areaId: editArea.id,
          name: formName,
          description: formDescription || undefined,
          color: formColor,
          icon: formIcon,
        });
        toast.success(t('admin.areaUpdated'));
      } else {
        await createArea.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          color: formColor,
          icon: formIcon,
        });
        toast.success(t('admin.areaCreated'));
      }
      setCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (area: Area) => {
    if (area.isDefault === "true") {
      toast.error(t('admin.defaultAreaDeleteError'));
      return;
    }
    if (!confirm(t('admin.areaDeleteConfirm').replace('{name}', getAreaName(area.name, language) || area.name))) {
      return;
    }

    try {
      await deleteArea.mutateAsync(area.id);
      toast.success(t('admin.areaDeleted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openAdminModal = (area: Area) => {
    setSelectedArea(area);
    const currentAdmin = area.admins?.find(a => a.role === "admin");
    const currentOwner = area.admins?.find(a => a.role === "owner");
    setSelectedAdminId(currentAdmin?.userId || "");
    setSelectedOwnerId(currentOwner?.userId || "");
    setAdminModalOpen(true);
  };

  const handleUpdateGovernance = async () => {
    if (!selectedArea) return;

    try {
      const currentAdmins = selectedArea.admins || [];
      const adminToSet = selectedAdminId === "none" ? "" : selectedAdminId;
      const ownerToSet = selectedOwnerId === "none" ? "" : selectedOwnerId;
      
      const currentAdmin = currentAdmins.find(a => a.role === "admin");
      const currentOwner = currentAdmins.find(a => a.role === "owner");

      // Handle Admin role
      if (adminToSet !== (currentAdmin?.userId || "")) {
        if (adminToSet) {
          // Backend now correctly handles replacing the old one to ensure only 1 per role
          await addAreaAdmin.mutateAsync({ areaId: selectedArea.id, userId: adminToSet, role: "admin" });
        } else if (currentAdmin) {
          await removeAreaAdmin.mutateAsync({ areaId: selectedArea.id, adminId: currentAdmin.id });
        }
      }

      // Handle Owner role
      if (ownerToSet !== (currentOwner?.userId || "")) {
        if (ownerToSet) {
          // Backend now correctly handles replacing the old one to ensure only 1 per role
          await addAreaAdmin.mutateAsync({ areaId: selectedArea.id, userId: ownerToSet, role: "owner" });
        } else if (currentOwner) {
          await removeAreaAdmin.mutateAsync({ areaId: selectedArea.id, adminId: currentOwner.id });
        }
      }

      toast.success(t('admin.governanceUpdated'));
      setAdminModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{t('common.error')}: {(error as Error).message}</p>
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
            <h1 className="text-2xl font-bold">{t('admin.adminAreasTitle')}</h1>
            <p className="text-muted-foreground">
              {t('admin.adminAreasSubtitle')}
            </p>
          </div>
        </div>

        <Button onClick={openCreateModal} data-testid="button-create-area">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.newArea')}
        </Button>
      </div>

      {data?.areas?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('admin.noAreas')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('admin.noAreasSubtitle')}
            </p>
            <Button onClick={openCreateModal} data-testid="button-create-first-area">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.createFirstArea')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.areas?.map((area) => (
            <Card key={area.id} data-testid={`card-area-${area.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: area.color || COLOR_OPTIONS[0] }}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{getAreaName(area.name, language) || area.name}</CardTitle>
                      {area.isDefault === "true" && (
                        <Badge variant="secondary" className="text-xs">{t('admin.defaultArea')}</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {t('admin.teamsCount').replace('{count}', (area.teams?.length || 0).toString())}
                    </CardDescription>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`menu-area-${area.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openAdminModal(area)}>
                      <Shield className="h-4 w-4 mr-2" />
                      {t('admin.manageAdmins')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditModal(area)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('admin.editArea')}
                    </DropdownMenuItem>
                    {area.isDefault !== "true" && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(area)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('admin.deleteArea')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                {(area.description || getAreaDescription(area.name, language)) && (
                  <p className="text-sm text-muted-foreground mb-3">{getAreaDescription(area.name, language) || area.description}</p>
                )}

                <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-3">
                  {(area.admins?.length || 0) > 0 ? (
                    <TooltipProvider>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {area.admins?.filter(a => a.role === "owner").map((admin) => (
                            <Tooltip key={`avatar-owner-${admin.id}`}>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <Avatar className="h-8 w-8 border-2 border-amber-400 ring-2 ring-background">
                                    <AvatarImage src={admin.user?.image} alt={admin.user?.name || "Owner"} />
                                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-medium">
                                      {(admin.user?.name || "O").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Shield className="absolute -bottom-1 -right-1 h-3 w-3 text-amber-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                                <p className="font-semibold">{admin.user?.name || "Owner"}</p>
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t('admin.adminRoleOwner')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {area.admins?.filter(a => a.role === "admin").map((admin) => (
                            <Tooltip key={`avatar-admin-${admin.id}`}>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <Avatar className="h-8 w-8 border-2 border-blue-400 ring-2 ring-background">
                                    <AvatarImage src={admin.user?.image} alt={admin.user?.name || "Admin"} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                                      {(admin.user?.name || "A").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <Shield className="absolute -bottom-1 -right-1 h-3 w-3 text-blue-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-popover text-popover-foreground border shadow-md">
                                <p className="font-semibold">{admin.user?.name || "Admin"}</p>
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{t('admin.adminRoleAdmin')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                        <span className="text-xs">{t('admin.adminsCount').replace('{count}', (area.admins?.length || 0).toString())}</span>
                      </div>
                    </TooltipProvider>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{t('admin.adminsCount').replace('{count}', '0')}</span>
                    </div>
                  )}
                </div>

                {area.teams && area.teams.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {area.teams.slice(0, 3).map((team: any) => (
                      <Badge key={team.id} variant="outline" className="text-xs">
                        {team.name}
                      </Badge>
                    ))}
                    {area.teams.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{area.teams.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editArea ? t('admin.editArea') : t('admin.newArea')}</DialogTitle>
            <DialogDescription>
              {editArea
                ? t('admin.areaUpdated')
                : t('admin.noAreasSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">{t('admin.areaName')}</Label>
              <Input
                id="area-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('admin.areaNamePlaceholder')}
                data-testid="input-area-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area-description">{t('admin.areaDescription')}</Label>
              <Textarea
                id="area-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('admin.areaDescriptionPlaceholder')}
                data-testid="input-area-description"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('admin.areaColor')}</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      formColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createArea.isPending || updateArea.isPending}
              data-testid="button-save-area"
            >
              {editArea ? t('common.save') : t('admin.newArea')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.areaAdminsTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.areaAdminsSubtitle').replace('{name}', getAreaName(selectedArea?.name || '', language) || selectedArea?.name || '')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>{t('admin.adminRoleAdmin')}</Label>
              <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                <SelectTrigger data-testid="select-area-admin">
                  <SelectValue placeholder={t('admin.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none')}</SelectItem>
                  {areaAdminUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('admin.areaAdminDescription')}</p>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.adminRoleOwner')}</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger data-testid="select-area-owner">
                  <SelectValue placeholder={t('admin.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none')}</SelectItem>
                  {areaOwnerUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('admin.areaOwnerDescription')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUpdateGovernance}
              disabled={addAreaAdmin.isPending || removeAreaAdmin.isPending}
              data-testid="button-save-governance"
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
