import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminUsers,
  useAdminTeams,
  useInviteUser,
  useBulkInvite,
  useCancelInvitation,
  useResendInvitation,
  useUpdateUserRole,
  useRemoveUser,
  type TenantUser,
  type Invitation,
} from "@/hooks/useAdmin";
import { formatDate } from "@/lib/dateUtils";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hooks/useTranslation";
import {
  ArrowLeft,
  UserPlus,
  Users,
  MoreHorizontal,
  Mail,
  Clock,
  X,
  RefreshCw,
  Upload,
  Trash2,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "tenant_owner", label: "Tenant Owner", level: "tenant" },
  { value: "tenant_admin", label: "Tenant Admin", level: "tenant" },
  { value: "area_owner", label: "Area Owner", level: "area" },
  { value: "area_admin", label: "Area Admin", level: "area" },
  { value: "team_lead", label: "Team Lead", level: "team" },
  { value: "team_member", label: "Team Member", level: "team" },
  { value: "team_viewer", label: "Team Viewer", level: "team" },
];

const ROLE_COLORS: Record<string, string> = {
  tenant_owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  tenant_admin: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  area_owner: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  area_admin: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  team_lead: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  team_member: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300",
  team_viewer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "admin.roleNames.tenant_owner",
  tenant_admin: "admin.roleNames.tenant_admin",
  area_owner: "admin.roleNames.area_owner",
  area_admin: "admin.roleNames.area_admin",
  team_lead: "admin.roleNames.team_lead",
  team_member: "admin.roleNames.team_member",
  team_viewer: "admin.roleNames.team_viewer",
  owner: "admin.roleNames.tenant_owner",
  admin: "admin.roleNames.tenant_admin",
  manager: "admin.roleNames.area_admin",
  member: "admin.roleNames.team_member",
  viewer: "admin.roleNames.team_viewer",
};

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useAdminUsers();
  const { data: teamsData } = useAdminTeams();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState("team_member");
  const [bulkTeamId, setBulkTeamId] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddEmail, setQuickAddEmail] = useState("");
  const [quickAddRole, setQuickAddRole] = useState("team_member");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (!quickAddEmail || !quickAddEmail.includes("@")) {
      toast.error("Por favor, insira um e-mail válido");
      return;
    }

    setIsQuickAdding(true);
    try {
      const res = await fetch("/api/admin/users/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: quickAddEmail, role: quickAddRole })
      });

      if (!res.ok) throw new Error("Falha ao adicionar usuário");

      toast.success("Usuário adicionado com sucesso. Ele poderá acessar ao logar com este e-mail.");
      setQuickAddModalOpen(false);
      setQuickAddEmail("");
      await refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const inviteUser = useInviteUser();
  const bulkInvite = useBulkInvite();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const updateUserRole = useUpdateUserRole();
  const removeUser = useRemoveUser();

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error(t('admin.inviteError'));
      return;
    }

    try {
      await inviteUser.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        teamId: inviteTeamId,
      });
      toast.success(t('admin.inviteSent'));
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("team_member");
      setInviteTeamId(null);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || t('admin.inviteError'));
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes("@"));

    if (emails.length === 0) {
      toast.error(t('admin.inviteError'));
      return;
    }

    try {
      const result = await bulkInvite.mutateAsync({
        emails,
        role: bulkRole,
        teamId: bulkTeamId,
      });
      
      if (result.success?.length > 0) {
        toast.success(t('admin.inviteCount').replace('{count}', result.success.length.toString()));
      }
      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} emails failed`);
      }
      
      setBulkInviteModalOpen(false);
      setBulkEmails("");
      setBulkRole("team_member");
      setBulkTeamId(null);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || t('admin.inviteError'));
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    try {
      await cancelInvitation.mutateAsync(invitation.id);
      toast.success(t('admin.inviteCancelled'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      await resendInvitation.mutateAsync(invitation.id);
      toast.success(t('admin.inviteResent'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleOpenEdit = (user: TenantUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditTeamIds(user.teams?.map(t => t.id) || []);
    setEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          teamIds: editTeamIds
        })
      });
      
      if (!res.ok) throw new Error("Failed to update user");
      
      toast.success("Usuário atualizado com sucesso");
      setEditModalOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateRole = async (user: TenantUser, newRole: string) => {
    try {
      await updateUserRole.mutateAsync({ userId: user.id, role: newRole });
      toast.success(t('admin.successUpdateRole'));
    } catch (error: any) {
      toast.error(error.message || t('admin.errorUpdateRole'));
    }
  };

  const handleRemoveUser = async (user: TenantUser) => {
    if (!confirm(t('admin.removeUserConfirm'))) {
      return;
    }

    try {
      await removeUser.mutateAsync(user.id);
      toast.success(t('admin.userRemoved'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const canManageUsers = data?.currentUserPermissions?.includes("tenant.manage_users");

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{t('admin.errorLoadUsers')}: {(error as Error).message}</p>
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
            <h1 className="text-2xl font-bold">{t('admin.usersTitle')}</h1>
            <p className="text-muted-foreground">{t('admin.usersSubtitle')}</p>
          </div>
        </div>

        {canManageUsers && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users/import")}
              data-testid="button-import-csv"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('admin.importCSV')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkInviteModalOpen(true)}
              data-testid="button-bulk-invite"
            >
              <Users className="h-4 w-4 mr-2" />
              {t('admin.bulkInvite')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setQuickAddModalOpen(true)}
              data-testid="button-quick-add"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adição Rápida (Teste)
            </Button>
            <Button
              onClick={() => setInviteModalOpen(true)}
              data-testid="button-invite-user"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('admin.inviteUser')}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-users">
            {t('admin.activeUsers')} ({data?.users?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-invites">
            {t('admin.pendingInvitations')} ({data?.pendingInvitations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.activeUsers')}</CardTitle>
              <CardDescription>{t('admin.usersSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.columnName')}</TableHead>
                    <TableHead>{t('admin.columnRole')}</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users?.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>
                              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name || "-"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManageUsers && user.role !== "owner" && user.role !== "tenant_owner" ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleUpdateRole(user, value)}
                          >
                            <SelectTrigger className="w-36" data-testid={`select-role-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.filter(r => r.value !== "tenant_owner").map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {t(`admin.roleNames.${role.value}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS.team_member}>
                            {t(ROLE_LABELS[user.role] || user.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`menu-user-${user.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                              <Users className="h-4 w-4 mr-2" />
                              Editar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveUser(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('admin.removeUser')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.users || data.users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('admin.noUsersFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.pendingInvitations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.columnEmail')}</TableHead>
                    <TableHead>{t('admin.columnRole')}</TableHead>
                    <TableHead>{t('admin.columnTeams')}</TableHead>
                    <TableHead>{t('admin.expiresAt')}</TableHead>
                    {canManageUsers && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.pendingInvitations?.map((invitation) => (
                    <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {invitation.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[invitation.role] || ROLE_COLORS.member}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invitation.teamName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDate(invitation.expiresAt)}
                        </div>
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`menu-invitation-${invitation.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleResendInvitation(invitation)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('admin.resendInvite')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCancelInvitation(invitation)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                {t('admin.cancelInvite')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!data?.pendingInvitations || data.pendingInvitations.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('admin.noPendingInvitations')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={quickAddModalOpen} onOpenChange={setQuickAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adição Rápida de Usuário (Teste)</DialogTitle>
            <DialogDescription>
              Adicione um usuário diretamente pelo e-mail. Ele terá acesso ao workspace assim que fizer login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-email">E-mail do Usuário</Label>
              <Input
                id="quick-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={quickAddEmail}
                onChange={(e) => setQuickAddEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-role">Cargo</Label>
              <Select value={quickAddRole} onValueChange={setQuickAddRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleQuickAdd} disabled={isQuickAdding}>
              {isQuickAdding ? "Adicionando..." : "Adicionar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere o cargo e os times de {editingUser?.name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Times</Label>
              <div className="grid grid-cols-2 gap-2">
                {teamsData?.teams?.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-muted cursor-pointer" 
                       onClick={() => {
                         setEditTeamIds(prev => 
                           prev.includes(team.id) 
                             ? prev.filter(id => id !== team.id) 
                             : [...prev, team.id]
                         );
                       }}>
                    <div className={`w-3 h-3 rounded-full ${editTeamIds.includes(team.id) ? "opacity-100" : "opacity-20"}`} 
                         style={{ backgroundColor: team.color }} />
                    <span className={`text-sm ${editTeamIds.includes(team.id) ? "font-bold" : ""}`}>
                      {team.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateUser}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.inviteTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('admin.inviteEmail')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('admin.inviteEmailPlaceholder')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.inviteRole')}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(r => r.value !== "owner").map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">{t('admin.inviteTeam')}</Label>
              <Select value={inviteTeamId || "none"} onValueChange={(v) => setInviteTeamId(v === "none" ? null : v)}>
                <SelectTrigger data-testid="select-invite-team">
                  <SelectValue placeholder={t('admin.selectTeam')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('admin.noTeam')}</SelectItem>
                  {teamsData?.teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteUser.isPending}
              data-testid="button-send-invite"
            >
              {inviteUser.isPending ? t('admin.sending') : t('admin.sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkInviteModalOpen} onOpenChange={setBulkInviteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.bulkInviteTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.bulkInviteDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emails">{t('admin.inviteEmail')}</Label>
              <Textarea
                id="emails"
                placeholder={t('admin.emailsPlaceholder')}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
                data-testid="textarea-bulk-emails"
              />
              <p className="text-xs text-muted-foreground">
                {bulkEmails.split(/[\n,;]+/).filter(e => e.trim() && e.includes("@")).length} emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-role">{t('admin.inviteRole')}</Label>
              <Select value={bulkRole} onValueChange={setBulkRole}>
                <SelectTrigger data-testid="select-bulk-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(r => r.value !== "owner").map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-team">{t('admin.inviteTeam')}</Label>
              <Select value={bulkTeamId || "none"} onValueChange={(v) => setBulkTeamId(v === "none" ? null : v)}>
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder={t('admin.selectTeam')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('admin.noTeam')}</SelectItem>
                  {teamsData?.teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkInviteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkInvite}
              disabled={bulkInvite.isPending}
              data-testid="button-send-bulk-invite"
            >
              {bulkInvite.isPending ? t('admin.sending') : t('admin.sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
