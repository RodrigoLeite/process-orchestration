import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useAdminTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAdminAreas,
  useMoveTeamToArea,
  useUpdateTeamMemberRole,
  useAdminUsers,
  useAssignUserToTeam,
  useRemoveUserFromTeam,
  type Team,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Building2,
  UserCog,
  Crown,
  User,
  Eye,
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

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  lead: { label: "Líder", icon: <Crown className="h-3 w-3" />, color: "bg-amber-500" },
  member: { label: "Membro", icon: <User className="h-3 w-3" />, color: "bg-blue-500" },
  viewer: { label: "Visualizador", icon: <Eye className="h-3 w-3" />, color: "bg-gray-500" },
};

export default function AdminTeamsPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch: refetchTeams } = useAdminTeams();
  const { data: areasData } = useAdminAreas();
  const { data: usersData, refetch: refetchUsers } = useAdminUsers();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [formAreaId, setFormAreaId] = useState("");

  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const moveTeamToArea = useMoveTeamToArea();
  const updateMemberRole = useUpdateTeamMemberRole();
  const assignUserToTeam = useAssignUserToTeam();
  const removeUserFromTeam = useRemoveUserFromTeam();

  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(COLOR_OPTIONS[0]);
    setFormAreaId(areasData?.areas?.[0]?.id || "");
    setEditTeam(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setFormName(team.name);
    setFormDescription(team.description || "");
    setFormColor(team.color || COLOR_OPTIONS[0]);
    setFormAreaId(team.areaId || "");
    setEditTeam(team);
    setCreateModalOpen(true);
  };

  const openMembersModal = (team: Team) => {
    setSelectedTeam(team);
    setMembersModalOpen(true);
    setSelectedUserId("");
    
    // Find current lead if any
    const currentLead = team.members?.find((m: any) => m.role === "lead");
    setSelectedLeadId(currentLead?.userId || "none");
  };

  const [selectedLeadId, setSelectedLeadId] = useState<string>("none");

  const handleLeadChange = async (userId: string) => {
    if (!selectedTeam) return;
    setSelectedLeadId(userId);

    try {
      if (userId === "none") {
        // Remove lead role from anyone who has it
        const currentLead = selectedTeam.members?.find((m: any) => m.role === "lead");
        if (currentLead) {
          await updateMemberRole.mutateAsync({
            teamId: selectedTeam.id,
            userId: currentLead.userId,
            role: "member",
          });
        }
      } else {
        await updateMemberRole.mutateAsync({
          teamId: selectedTeam.id,
          userId,
          role: "lead",
        });
      }
      toast.success("Team Lead atualizado");
      await Promise.all([refetchUsers(), refetchTeams()]);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filter users for Team Lead selection: Tenant Owner, Tenant Admin, Area Owner, Area Admin, Team Lead
  const leadEligibleUsers = usersData?.users?.filter((u: any) => {
    const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => typeof r === 'string' ? r : (r.name || r.id)) : [u.role];
    return roles.some((r: string) => 
      ["tenant_owner", "tenant_admin", "area_owner", "area_admin", "lead", "Tenant Owner", "Tenant Admin", "Area Owner", "Area Admin", "Team Lead"].includes(r)
    );
  }) || [];

  // Filter users for Team Member selection: all roles allowed
  const memberEligibleUsers = usersData?.users?.filter((u: any) => {
    const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => typeof r === 'string' ? r : (r.name || r.id)) : [u.role];
    return roles.some((r: string) => 
      ["tenant_owner", "tenant_admin", "area_owner", "area_admin", "lead", "member", "viewer", "Tenant Owner", "Tenant Admin", "Area Owner", "Area Admin", "Team Lead", "Team Member", "Team Viewer"].includes(r)
    );
  }) || [];

  useEffect(() => {
    if (selectedTeam && data?.teams) {
      const updated = data.teams.find(t => t.id === selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    }
  }, [data?.teams]);

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error(t('admin.teamName') + " required");
      return;
    }

    try {
      if (editTeam) {
        await updateTeam.mutateAsync({
          teamId: editTeam.id,
          name: formName,
          description: formDescription || undefined,
          color: formColor,
        });
        if (formAreaId && formAreaId !== editTeam.areaId) {
          await moveTeamToArea.mutateAsync({
            teamId: editTeam.id,
            areaId: formAreaId,
          });
        }
        toast.success(t('admin.teamUpdated'));
      } else {
        const result = await createTeam.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          color: formColor,
        });
        if (formAreaId && result?.team?.id) {
          await moveTeamToArea.mutateAsync({
            teamId: result.team.id,
            areaId: formAreaId,
          });
        }
        toast.success(t('admin.teamCreated'));
      }
      setCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(t('admin.deleteTeamConfirm'))) {
      return;
    }

    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success(t('admin.teamDeleted'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    if (!selectedTeam) return;

    try {
      await updateMemberRole.mutateAsync({
        teamId: selectedTeam.id,
        userId,
        role: newRole as 'lead' | 'member' | 'viewer',
      });
      toast.success("Papel atualizado");
      await Promise.all([refetchUsers(), refetchTeams()]);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return;

    try {
      await assignUserToTeam.mutateAsync({
        userId: selectedUserId,
        teamId: selectedTeam.id
      });
      toast.success("Membro adicionado com sucesso");
      setSelectedUserId("");
      
      // Force immediate refresh of data
      await Promise.all([refetchTeams(), refetchUsers()]);
      
      // The useEffect at line 128 will handle updating selectedTeam when data?.teams changes
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      await removeUserFromTeam.mutateAsync({
        userId,
        teamId: selectedTeam.id
      });
      toast.success("Membro removido com sucesso");
      await Promise.all([refetchUsers(), refetchTeams()]);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getAreaName = (areaId: string | null) => {
    if (!areaId || !areasData?.areas) return null;
    const area = areasData.areas.find(a => a.id === areaId);
    return area?.name;
  };

  const getAreaColor = (areaId: string | null) => {
    if (!areaId || !areasData?.areas) return "#6366f1";
    const area = areasData.areas.find(a => a.id === areaId);
    return area?.color || "#6366f1";
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
            <h1 className="text-2xl font-bold">{t('admin.teamsTitle')}</h1>
            <p className="text-muted-foreground">{t('admin.teamsSubtitle')}</p>
          </div>
        </div>

        <Button onClick={openCreateModal} data-testid="button-create-team">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createTeam')}
        </Button>
      </div>

      {data?.teams?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('admin.noTeams')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('admin.createFirstTeam')}
            </p>
            <Button onClick={openCreateModal} data-testid="button-create-first-team">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.createTeam')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.teams?.map((team) => (
            <Card key={team.id} data-testid={`card-team-${team.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      {team.memberCount} {t('admin.teamMembers').toLowerCase()}
                    </CardDescription>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`menu-team-${team.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openMembersModal(team)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Gerenciar Membros
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditModal(team)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('admin.editTeam')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(team)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('admin.deleteTeam')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                {getAreaName(team.areaId) && (
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: getAreaColor(team.areaId), color: getAreaColor(team.areaId) }}
                    >
                      {getAreaName(team.areaId)}
                    </Badge>
                  </div>
                )}

                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">{team.description}</p>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('admin.teamMembers')}</Label>
                  {team.members.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {team.members.slice(0, 5).map((member: any) => (
                        <div key={member.id} className="relative">
                          <Avatar className="h-8 w-8" title={`${member.name || member.email} - ${ROLE_LABELS[member.role || 'member']?.label}`}>
                            <AvatarImage src={member.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {member.role === 'lead' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <Crown className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {team.members.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                          +{team.members.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('admin.noTeam')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTeam ? t('admin.editTeam') : t('admin.createTeam')}</DialogTitle>
            <DialogDescription>
              {t('admin.teamsSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('admin.teamName')}</Label>
              <Input
                id="name"
                placeholder={t('admin.teamNamePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-team-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.teamDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('admin.teamDescriptionPlaceholder')}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                data-testid="textarea-team-description"
              />
            </div>

            {areasData?.areas && areasData.areas.length > 0 && (
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={formAreaId} onValueChange={setFormAreaId}>
                  <SelectTrigger data-testid="select-team-area">
                    <SelectValue placeholder="Selecione uma área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areasData.areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: area.color || "#6366f1" }}
                          />
                          {area.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('admin.teamColor')}</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      formColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    data-testid={`button-color-${color}`}
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
              disabled={createTeam.isPending || updateTeam.isPending}
              data-testid="button-save-team"
            >
              {createTeam.isPending || updateTeam.isPending
                ? t('common.loading')
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Membros do Time</DialogTitle>
            <DialogDescription>
              {selectedTeam?.name} - Gerencie os membros e seus papéis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-4 border-b pb-6 mb-4">
              <div className="space-y-2">
                <Label>Team Lead</Label>
                <Select value={selectedLeadId} onValueChange={handleLeadChange}>
                  <SelectTrigger data-testid="select-team-lead">
                    <SelectValue placeholder="Selecione o Líder do Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leadEligibleUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">O Líder tem permissões totais sobre as demandas deste time.</p>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Adicionar Membro</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger data-testid="select-add-member">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberEligibleUsers
                        ?.filter(u => !selectedTeam?.members?.some((m: any) => m.userId === u.id))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMember} disabled={!selectedUserId || assignUserToTeam.isPending} data-testid="button-add-member">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {selectedTeam?.members?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum membro neste time</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Membros Atuais</Label>
                {selectedTeam?.members?.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>
                          {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name || member.email}</p>
                        {member.name && member.email && (
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select 
                        value={member.role || 'member'} 
                        onValueChange={(value) => handleRoleChange(member.id, member.userId, value)}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-role-${member.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-amber-500" />
                              Líder
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              Membro
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-gray-500" />
                              Visualizador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
