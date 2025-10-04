"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Upload,
  Download,
  Edit,
  Trash2,
  Phone,
  Mail,
  UserPlus,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Link,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Lead {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  errorReason?: string;
  createdAt: Date;
}

interface LeadListDetail {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    leads: number;
  };
  leads: Lead[];
  assignedCampaigns: Array<{
    id: string;
    name: string;
    tenant: {
      id: string;
      name: string;
    };
  }>;
}

export default function LeadListDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [leadList, setLeadList] = useState<LeadListDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("NONE");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Filter and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    // Only fetch on client side
    if (typeof window !== 'undefined' && id && typeof id === "string") {
      fetchLeadListDetails();
      fetchCampaigns();
    }
  }, [id]);

  const fetchLeadListDetails = async () => {
    if (!id || typeof id !== "string") return;

    try {
      setIsLoading(true);
      const response = await gobiService.leadLists.getDetails(id);
      setLeadList(response.data || response);
    } catch (error: any) {
      console.error("Error fetching lead list:", error);
      toast.error("Failed to fetch lead list details");
      router.push("/lead-lists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await gobiService.campaigns.getAll();
      setCampaigns(response.data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const handleEdit = () => {
    if (!leadList) return;
    setEditName(leadList.name);
    setEditDescription(leadList.description || "");
    setEditDialogOpen(true);
  };

  const handleUpdateList = async () => {
    if (!leadList || !editName.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    setIsEditing(true);
    try {
      await gobiService.leadLists.update(leadList.id, {
        name: editName,
        description: editDescription || undefined,
      });
      toast.success("Lead list updated successfully!");
      setEditDialogOpen(false);
      await fetchLeadListDetails();
    } catch (error: any) {
      toast.error(`Failed to update list: ${error.message}`);
    } finally {
      setIsEditing(false);
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile || !leadList) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const csvContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(csvFile);
      });

      // Prepare upload data with optional campaign ID
      const uploadData: any = {
        listId: leadList.id,
        content: csvContent,
      };

      // Add campaign ID only if a campaign is selected
      if (selectedCampaign && selectedCampaign !== "NONE") {
        uploadData.campaignId = selectedCampaign;
      }

      const response = await gobiService.leadLists.uploadLeads(uploadData);

      toast.success(
        `Successfully uploaded ${response.data?.newLeads || 0} leads! (${
          response.data?.duplicates || 0
        } duplicates skipped)`
      );
      setCsvFile(null);
      setSelectedCampaign("NONE");
      setUploadDialogOpen(false);
      await fetchLeadListDetails();
    } catch (error: any) {
      toast.error(`Failed to upload leads: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCSV = () => {
    if (!leadList || !leadList.leads || leadList.leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    // Create CSV content
    const headers = ["Name", "Phone Number", "Email", "Status", "Error Reason", "Created At"];
    const rows = leadList.leads.map((lead) => [
      lead.name || "",
      lead.phoneNumber,
      lead.email || "",
      lead.status,
      lead.errorReason || "",
      new Date(lead.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${leadList.name}_leads_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Leads exported successfully!");
  };

  const handleDeleteList = async () => {
    if (!leadList) return;

    setIsDeleting(true);
    try {
      await gobiService.leadLists.delete(leadList.id);
      toast.success("Lead list deleted successfully!");
      router.push("/lead-lists");
    } catch (error: any) {
      toast.error(`Failed to delete list: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Calculate stats
  const totalLeads = leadList?._count?.leads || 0;
  const processedLeads =
    leadList?.leads?.filter((l) => l.status === "PROCESSED").length || 0;
  const failedLeads =
    leadList?.leads?.filter((l) => l.status === "FAILED").length || 0;
  const pendingLeads =
    leadList?.leads?.filter((l) => l.status === "PENDING").length || 0;

  // Filter leads
  const filteredLeads =
    leadList?.leads?.filter((lead) => {
      const matchesSearch =
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phoneNumber.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "ALL") return matchesSearch;
      return matchesSearch && lead.status === statusFilter;
    }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!leadList) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Lead list not found</p>
          <Button onClick={() => router.push("/lead-lists")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lead Lists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/lead-lists")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{leadList.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {leadList.description || "No description"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLeadListDetails()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Leads</p>
                  <p className="text-2xl font-semibold">{totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Processed</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {processedLeads}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending</p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {pendingLeads}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Failed</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {failedLeads}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">
              <Users className="h-4 w-4 mr-2" />
              Leads ({totalLeads})
            </TabsTrigger>
            <TabsTrigger value="campaigns">
              <Link className="h-4 w-4 mr-2" />
              Campaigns ({leadList.assignedCampaigns?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Leads</CardTitle>
                    <CardDescription className="text-xs">
                      Manage leads in this list
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 w-full sm:w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSED">Processed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No leads found</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Leads
                    </Button>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Name</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-3 w-3 text-gray-400" />
                                <span className="font-medium">
                                  {lead.name || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <span className="font-mono text-sm">
                                  {lead.phoneNumber}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">
                                  {lead.email || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.status === "PROCESSED"
                                    ? "default"
                                    : lead.status === "FAILED"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {lead.status === "PROCESSED" && (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                {lead.status === "FAILED" && (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {lead.status === "PENDING" && (
                                  <Clock className="h-3 w-3 mr-1" />
                                )}
                                {lead.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lead.errorReason ? (
                                <span className="text-xs text-red-600">
                                  {lead.errorReason}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-gray-600">
                          Showing {startIndex + 1} to{" "}
                          {Math.min(endIndex, filteredLeads.length)} of{" "}
                          {filteredLeads.length} leads
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm px-3">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Assigned Campaigns</CardTitle>
                <CardDescription className="text-xs">
                  Campaigns using this lead list
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadList.assignedCampaigns && leadList.assignedCampaigns.length > 0 ? (
                  <div className="space-y-3">
                    {leadList.assignedCampaigns.map((campaign) => (
                      <Card key={campaign.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{campaign.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Organization: {campaign.tenant.name}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/campaigns/${campaign.id}`)
                              }
                            >
                              View Campaign
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Link className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No campaigns assigned</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Assign this list to a campaign to start using it
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">List Details</CardTitle>
                <CardDescription className="text-xs">
                  Information about this lead list
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">List Name</Label>
                      <p className="font-medium mt-1">{leadList.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Total Leads</Label>
                      <p className="font-medium mt-1">{totalLeads}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Created</Label>
                      <p className="font-medium mt-1">
                        {new Date(leadList.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Last Updated</Label>
                      <p className="font-medium mt-1">
                        {new Date(leadList.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Description</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {leadList.description || "No description provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lead List</DialogTitle>
              <DialogDescription>
                Update the name and description of this lead list
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>List Name</Label>
                <Input
                  placeholder="Enter list name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Enter list description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditName("");
                    setEditDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateList} disabled={isEditing}>
                  {isEditing ? "Updating..." : "Update List"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Leads</DialogTitle>
              <DialogDescription>
                Upload a CSV file with leads to add to this list
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>CSV File</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-medium text-blue-900 mb-2">
                    CSV Format Requirements:
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>
                      Required column: <code>phoneNumber</code> or <code>phone</code>
                    </li>
                    <li>
                      Optional columns: <code>name</code>, <code>email</code>
                    </li>
                    <li>First row should contain column headers</li>
                    <li>Duplicate phone numbers will be skipped</li>
                  </ul>
                </div>
              </div>
              <div>
                <Label>Assign to Campaign (Optional)</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No campaign</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setCsvFile(null);
                    setSelectedCampaign("NONE");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUploadCSV} disabled={isUploading || !csvFile}>
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the lead list "{leadList.name}" and all{" "}
                {totalLeads} leads in it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteList}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Lead List"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
