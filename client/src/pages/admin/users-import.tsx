import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useCSVImport, useAdminTeams } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

interface ParsedRow {
  email: string;
  name?: string;
  role?: string;
  team?: string;
  valid: boolean;
  error?: string;
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => {
    const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
    
    const email = parts[0] || "";
    const name = parts[1] || undefined;
    const role = parts[2]?.toLowerCase() || undefined;
    const team = parts[3] || undefined;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRoles = ["admin", "manager", "member", "viewer"];

    let valid = true;
    let error: string | undefined;

    if (!email || !emailRegex.test(email)) {
      valid = false;
      error = "Invalid email format";
    } else if (role && !validRoles.includes(role)) {
      valid = false;
      error = `Invalid role: ${role}`;
    }

    return { email, name, role, team, valid, error };
  });
}

export default function AdminUsersImportPage() {
  const [, navigate] = useLocation();
  const { data: teamsData } = useAdminTeams();
  const csvImport = useCSVImport();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultRole, setDefaultRole] = useState("member");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    valid: any[];
    invalid: any[];
    invitations: any[];
  } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = parsedRows
      .filter(row => row.valid)
      .map(row => ({
        email: row.email,
        name: row.name,
        role: row.role,
        team: row.team,
      }));

    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    try {
      const result = await csvImport.mutateAsync({
        rows: validRows,
        defaultRole,
      });
      
      setImportResult(result);
      
      if (result.invitations?.length > 0) {
        toast.success(`${result.invitations.length} invitations sent successfully`);
      }
      if (result.invalid?.length > 0) {
        toast.warning(`${result.invalid.length} rows had errors`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import users");
    }
  };

  const handleDownloadTemplate = () => {
    const template = "email,name,role,team\njohn@example.com,John Doe,member,Engineering\njane@example.com,Jane Smith,admin,";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/users")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Users from CSV</h1>
          <p className="text-muted-foreground">Upload a CSV file to invite multiple users at once</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Your CSV should have columns: email, name (optional), role (optional), team (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-csv-file"
              />
              
              {fileName ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{fileName}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-csv">
                      Choose CSV File
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop your file here
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <div className="flex items-center gap-2">
                <Label htmlFor="default-role" className="text-sm">Default Role:</Label>
                <Select value={defaultRole} onValueChange={setDefaultRole}>
                  <SelectTrigger className="w-32" data-testid="select-default-role">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Required Columns</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li><strong>email</strong> - User email address</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Optional Columns</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li><strong>name</strong> - User display name</li>
                <li><strong>role</strong> - admin, manager, member, or viewer</li>
                <li><strong>team</strong> - Team name (must exist in workspace)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Available Teams</h4>
              <div className="flex flex-wrap gap-2">
                {teamsData?.teams?.map((team) => (
                  <Badge key={team.id} variant="outline" style={{ borderColor: team.color }}>
                    {team.name}
                  </Badge>
                ))}
                {(!teamsData?.teams || teamsData.teams.length === 0) && (
                  <span className="text-sm text-muted-foreground">No teams created yet</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview ({parsedRows.length} rows)</CardTitle>
                <CardDescription>
                  <span className="text-green-600">{validCount} valid</span>
                  {invalidCount > 0 && (
                    <span className="text-red-600 ml-2">{invalidCount} with errors</span>
                  )}
                </CardDescription>
              </div>
              
              {!importResult && (
                <Button
                  onClick={handleImport}
                  disabled={csvImport.isPending || validCount === 0}
                  data-testid="button-import"
                >
                  {csvImport.isPending ? "Importing..." : `Import ${validCount} Users`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, index) => (
                  <TableRow key={index} data-testid={`row-preview-${index}`}>
                    <TableCell>
                      {row.valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.role || defaultRole}</Badge>
                    </TableCell>
                    <TableCell>{row.team || "-"}</TableCell>
                    <TableCell>
                      {row.error && (
                        <span className="text-red-600 text-sm">{row.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult.invitations?.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {importResult.invitations.length} invitations sent successfully
                </AlertDescription>
              </Alert>
            )}
            
            {importResult.invalid?.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Some rows failed</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc list-inside">
                    {importResult.invalid.map((item: any, index: number) => (
                      <li key={index}>
                        Line {item.line}: {item.email} - {item.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setParsedRows([]);
                  setFileName(null);
                  setImportResult(null);
                }}
              >
                Import More Users
              </Button>
              <Button onClick={() => navigate("/admin/users")}>
                Back to User Management
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
