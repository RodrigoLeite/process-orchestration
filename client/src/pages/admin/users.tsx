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
  Shield,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", description: "Full control" },
  { value: "admin", label: "Admin", description: "Manage users, workflows" },
  { value: "manager", label: "Manager", description: "Manage department workflows" },
  { value: "member", label: "Member", description: "Execute tasks" },
  { value: "viewer", label: "Viewer", description: "Read only" },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  manager: "bg-green-100 text-green-800",
  member: "bg-gray-100 text-gray-800",
  viewer: "bg-yellow-100 text-yellow-800",
};

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = useAdminUsers();
  const { data: teamsData } = useAdminTeams();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState("member");
  const [bulkTeamId, setBulkTeamId] = useState<string | null>(null);

  const inviteUser = useInviteUser();
  const bulkInvite = useBulkInvite();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const updateUserRole = useUpdateUserRole();
  const removeUser = useRemoveUser();

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await inviteUser.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        teamId: inviteTeamId,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteTeamId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes("@"));

    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    try {
      const result = await bulkInvite.mutateAsync({
        emails,
        role: bulkRole,
        teamId: bulkTeamId,
      });
      
      if (result.success?.length > 0) {
        toast.success(`${result.success.length} invitations sent successfully`);
      }
      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} emails failed: ${result.errors.map((e: any) => e.email).join(", ")}`);
      }
      
      setBulkInviteModalOpen(false);
      setBulkEmails("");
      setBulkRole("member");
      setBulkTeamId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitations");
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    try {
      await cancelInvitation.mutateAsync(invitation.id);
      toast.success(`Invitation to ${invitation.email} cancelled`);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation");
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      await resendInvitation.mutateAsync(invitation.id);
      toast.success(`Invitation resent to ${invitation.email}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    }
  };

  const handleUpdateRole = async (user: TenantUser, newRole: string) => {
    try {
      await updateUserRole.mutateAsync({ userId: user.id, role: newRole });
      toast.success(`Role updated for ${user.email}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  const handleRemoveUser = async (user: TenantUser) => {
    if (!confirm(`Are you sure you want to remove ${user.email} from this workspace?`)) {
      return;
    }

    try {
      await removeUser.mutateAsync(user.id);
      toast.success(`${user.email} removed from workspace`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user");
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
            <p className="text-destructive">Error loading users: {(error as Error).message}</p>
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
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users and invitations for your workspace</p>
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
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkInviteModalOpen(true)}
              data-testid="button-bulk-invite"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Invite
            </Button>
            <Button
              onClick={() => setInviteModalOpen(true)}
              data-testid="button-invite-user"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-users">
            Active Users ({data?.users?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-invites">
            Pending Invites ({data?.pendingInvitations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Users with access to this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Joined</TableHead>
                    {canManageUsers && <TableHead className="w-12"></TableHead>}
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
                            <div className="font-medium">{user.name || "No name"}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManageUsers && user.role !== "owner" ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleUpdateRole(user, value)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
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
                        ) : (
                          <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS.member}>
                            {user.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.teams?.length > 0 ? (
                            user.teams.map((team) => (
                              <Badge
                                key={team.id}
                                variant="outline"
                                style={{ borderColor: team.color, color: team.color }}
                              >
                                {team.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No teams</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          {user.role !== "owner" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`menu-user-${user.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveUser(user)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove from workspace
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!data?.users || data.users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
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
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Invitations waiting to be accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Invited By</TableHead>
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
                          {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.invitedByName || "-"}
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
                                Resend invitation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCancelInvitation(invitation)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel invitation
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
                        No pending invitations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(r => r.value !== "owner").map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team (optional)</Label>
              <Select value={inviteTeamId || "none"} onValueChange={(v) => setInviteTeamId(v === "none" ? null : v)}>
                <SelectTrigger data-testid="select-invite-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
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
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteUser.isPending}
              data-testid="button-send-invite"
            >
              {inviteUser.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkInviteModalOpen} onOpenChange={setBulkInviteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Invite Users</DialogTitle>
            <DialogDescription>
              Paste multiple email addresses, one per line or separated by commas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email addresses</Label>
              <Textarea
                id="emails"
                placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
                data-testid="textarea-bulk-emails"
              />
              <p className="text-xs text-muted-foreground">
                {bulkEmails.split(/[\n,;]+/).filter(e => e.trim() && e.includes("@")).length} valid emails detected
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-role">Role for all users</Label>
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
              <Label htmlFor="bulk-team">Team for all users (optional)</Label>
              <Select value={bulkTeamId || "none"} onValueChange={(v) => setBulkTeamId(v === "none" ? null : v)}>
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
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
              Cancel
            </Button>
            <Button
              onClick={handleBulkInvite}
              disabled={bulkInvite.isPending}
              data-testid="button-send-bulk-invite"
            >
              {bulkInvite.isPending ? "Sending..." : "Send Invitations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
