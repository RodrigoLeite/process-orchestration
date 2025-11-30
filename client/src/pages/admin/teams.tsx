import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
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
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
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

export default function AdminTeamsPage() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = useAdminTeams();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(COLOR_OPTIONS[0]);
    setEditTeam(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setFormName(team.name);
    setFormDescription(team.description || "");
    setFormColor(team.color || COLOR_OPTIONS[0]);
    setEditTeam(team);
    setCreateModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Team name is required");
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
        toast.success("Team updated successfully");
      } else {
        await createTeam.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          color: formColor,
        });
        toast.success("Team created successfully");
      }
      setCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save team");
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This will remove all members from this team.`)) {
      return;
    }

    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success("Team deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team");
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
            <p className="text-destructive">Error loading teams: {(error as Error).message}</p>
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
            <h1 className="text-2xl font-bold">Teams</h1>
            <p className="text-muted-foreground">Organize users into teams and groups</p>
          </div>
        </div>

        <Button onClick={openCreateModal} data-testid="button-create-team">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {data?.teams?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to organize users
            </p>
            <Button onClick={openCreateModal} data-testid="button-create-first-team">
              <Plus className="h-4 w-4 mr-2" />
              Create First Team
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
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
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
                    <DropdownMenuItem onClick={() => openEditModal(team)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(team)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">{team.description}</p>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Members</Label>
                  {team.members.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {team.members.slice(0, 5).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8" title={member.name || member.email || ""}>
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.members.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                          +{team.members.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No members yet</p>
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
            <DialogTitle>{editTeam ? "Edit Team" : "Create Team"}</DialogTitle>
            <DialogDescription>
              {editTeam ? "Update team details" : "Create a new team to organize users"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                placeholder="Engineering"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-testid="input-team-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="A brief description of this team..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                data-testid="textarea-team-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
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
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createTeam.isPending || updateTeam.isPending}
              data-testid="button-save-team"
            >
              {createTeam.isPending || updateTeam.isPending
                ? "Saving..."
                : editTeam
                ? "Save Changes"
                : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
