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

export default function AdminAreasPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { data, isLoading, error } = useAdminAreas();
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

  const areaAdminUsers = usersData?.users?.filter((u: any) => 
    u.roles?.some((r: any) => 
      r.name === "area_admin" || 
      r.name === "Area Admin" || 
      (typeof r === 'string' && (r === "area_admin" || r === "Area Admin"))
    ) || u.role === "area_admin"
  ) || [];

  const areaOwnerUsers = usersData?.users?.filter((u: any) => 
    u.roles?.some((r: any) => 
      r.name === "area_owner" || 
      r.name === "Area Owner" ||
      (typeof r === 'string' && (r === "area_owner" || r === "Area Owner"))
    ) || u.role === "area_owner"
  ) || [];

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
      // Logic to sync admins
      const currentAdmins = selectedArea.admins || [];
      const adminToSet = selectedAdminId;
      const ownerToSet = selectedOwnerId;

      // Simple implementation: for each role, if it changed, update it
      // In a real app we might want a dedicated bulk endpoint, but here we can call the existing ones
      
      const currentAdmin = currentAdmins.find(a => a.role === "admin");
      const currentOwner = currentAdmins.find(a => a.role === "owner");

      if (adminToSet !== (currentAdmin?.userId || "")) {
        if (currentAdmin) await removeAreaAdmin.mutateAsync({ areaId: selectedArea.id, adminId: currentAdmin.id });
        if (adminToSet) await addAreaAdmin.mutateAsync({ areaId: selectedArea.id, userId: adminToSet, role: "admin" });
      }

      if (ownerToSet !== (currentOwner?.userId || "")) {
        if (currentOwner) await removeAreaAdmin.mutateAsync({ areaId: selectedArea.id, adminId: currentOwner.id });
        if (ownerToSet) await addAreaAdmin.mutateAsync({ areaId: selectedArea.id, userId: ownerToSet, role: "owner" });
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

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4" />
                  <span>{t('admin.adminsCount').replace('{count}', (area.admins?.length || 0).toString())}</span>
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
