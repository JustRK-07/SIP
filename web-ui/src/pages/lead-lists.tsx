import { useState } from "react";
import { api } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Upload,
  Download,
  Edit,
  Trash2,
  Link,
  UserPlus,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";

type LeadList = {
  id: string;
  name: string;
  description?: string;
  totalLeads: number;
  processedLeads: number;
  createdAt: Date;
  updatedAt: Date;
  assignedCampaigns: {
    id: string;
    name: string;
  }[];
};

type Lead = {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  errorReason?: string;
  createdAt: Date;
};

export default function LeadLists() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries
  const { data: leadLists, refetch: refetchLists, isLoading } = api.leadList.getAll.useQuery();
  const { data: campaigns } = api.campaign.getAll.useQuery();
  
  const { data: listDetails, refetch: refetchDetails } = api.leadList.getDetails.useQuery(
    { id: selectedList! },
    { enabled: !!selectedList && viewDialogOpen }
  );

  // Mutations
  const { mutate: createList, isPending: isCreating } = api.leadList.create.useMutation({
    onSuccess: () => {
      toast.success("Lead list created successfully!");
      setNewListName("");
      setNewListDescription("");
      setCreateDialogOpen(false);
      void refetchLists();
    },
    onError: (error) => {
      toast.error(`Failed to create list: ${error.message}`);
    },
  });

  const { mutate: uploadLeads, isPending: isUploading } = api.leadList.uploadLeads.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully uploaded ${data.count} leads!`);
      setCsvFile(null);
      setUploadDialogOpen(false);
      setSelectedList(null);
      void refetchLists();
    },
    onError: (error) => {
      toast.error(`Failed to upload leads: ${error.message}`);
    },
  });

  const { mutate: deleteList, isPending: isDeleting } = api.leadList.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead list deleted successfully!");
      void refetchLists();
    },
    onError: (error) => {
      toast.error(`Failed to delete list: ${error.message}`);
    },
  });

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    createList({
      name: newListName,
      description: newListDescription || undefined,
    });
  };

  const handleUploadCSV = () => {
    if (!csvFile || !selectedList) {
      toast.error("Please select a file and list");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      uploadLeads({
        listId: selectedList,
        csvContent,
      });
    };
    reader.readAsText(csvFile);
  };

  const handleDeleteList = (id: string) => {
    if (confirm("Are you sure you want to delete this lead list?")) {
      deleteList({ id });
    }
  };

  // Stats calculations
  const totalLists = leadLists?.length || 0;
  const totalLeads = leadLists?.reduce((sum, list) => sum + list.totalLeads, 0) || 0;
  const processedLeads = leadLists?.reduce((sum, list) => sum + list.processedLeads, 0) || 0;
  const pendingLeads = totalLeads - processedLeads;

  // Filter lists
  const filteredLists = leadLists?.filter((list) => {
    const matchesSearch = list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "ACTIVE") return matchesSearch && list.assignedCampaigns.length > 0;
    if (statusFilter === "INACTIVE") return matchesSearch && list.assignedCampaigns.length === 0;
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil((filteredLists?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLists = filteredLists?.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Lists</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your lead lists and contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchLists()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lead List</DialogTitle>
                  <DialogDescription>
                    Create a new list to organize your leads
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>List Name</Label>
                    <Input
                      placeholder="Enter list name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Enter list description"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateList} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create List"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Lists</p>
                  <p className="text-xl font-semibold">{totalLists}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Leads</p>
                  <p className="text-xl font-semibold text-blue-600">{totalLeads}</p>
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
                  <p className="text-xl font-semibold text-green-600">{processedLeads}</p>
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
                  <p className="text-xl font-semibold text-yellow-600">{pendingLeads}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Lead Lists</CardTitle>
                <CardDescription className="text-xs">
                  Organize and manage your contact lists
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search lists..."
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
                    <SelectItem value="ALL">All Lists</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredLists?.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No lead lists found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first list to get started</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>List Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Total Leads</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLists?.map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                            <span>{list.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {list.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-sm font-medium">{list.totalLeads}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${list.totalLeads > 0 ? (list.processedLeads / list.totalLeads) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {list.processedLeads}/{list.totalLeads}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {list.assignedCampaigns.length > 0 ? (
                            <Badge variant="secondary" className="gap-1">
                              <Link className="h-3 w-3" />
                              {list.assignedCampaigns.length}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(list.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedList(list.id);
                                setViewDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Leads
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedList(list.id);
                                setUploadDialogOpen(true);
                              }}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Leads
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Export List
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit List
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteList(list.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredLists?.length || 0)} of {filteredLists?.length || 0} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Upload CSV Dialog */}
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
                <p className="text-xs text-gray-500 mt-2">
                  CSV should contain columns: name, phoneNumber, email
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setUploadDialogOpen(false);
                  setCsvFile(null);
                  setSelectedList(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUploadCSV} disabled={isUploading || !csvFile}>
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Leads Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View and manage leads in this list
              </DialogDescription>
            </DialogHeader>
            {listDetails?.leads && listDetails.leads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listDetails.leads.map((lead: Lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-3 w-3 text-gray-400" />
                          {lead.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {lead.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {lead.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          lead.status === "PROCESSED" ? "default" :
                          lead.status === "FAILED" ? "destructive" : "secondary"
                        }>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No leads in this list</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Leads
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}