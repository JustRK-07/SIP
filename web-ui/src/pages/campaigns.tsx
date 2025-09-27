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
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Play,
  Pause,
  CheckCircle, 
  XCircle,
  Clock,
  Users,
  Phone,
  TrendingUp,
  RefreshCw,
  Edit,
  Trash2,
  Link,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";

type Campaign = {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
  createdAt: Date;
  _count: {
    leads: number;
  };
  script?: string;
  assignedLeadLists: Array<{
    id: string;
    name: string;
    _count: {
      leads: number;
    };
  }>;
};

type LeadList = {
  id: string;
  name: string;
  description: string | null;
  _count: {
    leads: number;
  };
  assignedCampaigns: Array<{
    id: string;
    name: string;
  }>;
};

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [selectedLeadLists, setSelectedLeadLists] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries and Mutations
  const { data: campaigns, refetch: refetchCampaigns, isLoading } = api.campaign.getAll.useQuery();
  const { data: leadLists } = api.leadList.getAll.useQuery();

  const { mutate: createCampaign, isPending: isCreating } = api.campaign.create.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully!");
      setNewCampaignName("");
      setNewCampaignDescription("");
      setSelectedLeadLists([]);
      setCreateDialogOpen(false);
      void refetchCampaigns();
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const { mutate: updateCampaignStatus, isPending: isUpdatingStatus } = api.campaign.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Campaign status updated!");
      void refetchCampaigns();
    },
    onError: (error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    createCampaign({
      name: newCampaignName,
      description: newCampaignDescription,
      leadListIds: selectedLeadLists,
    });
  };

  const handleStatusUpdate = (campaignId: string, status: "ACTIVE" | "PAUSED" | "COMPLETED") => {
    updateCampaignStatus({ id: campaignId, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "default";
      case "PAUSED": return "secondary";
      case "COMPLETED": return "outline";
      case "DRAFT": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Play className="h-3 w-3" />;
      case "PAUSED": return <Pause className="h-3 w-3" />;
      case "COMPLETED": return <CheckCircle className="h-3 w-3" />;
      case "DRAFT": return <FileText className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Stats calculations
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter(c => c.status === "ACTIVE").length || 0;
  const pausedCampaigns = campaigns?.filter(c => c.status === "PAUSED").length || 0;
  const totalLeads = campaigns?.reduce((sum, c) => sum + c._count.leads, 0) || 0;

  // Filter campaigns
  const filteredCampaigns = campaigns?.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil((filteredCampaigns?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredCampaigns?.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
            <p className="text-sm text-gray-600 mt-1">Create and manage outreach campaigns</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchCampaigns()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new campaign and assign lead lists for automated outreach
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Campaign Name</Label>
                    <Input
                      placeholder="Enter campaign name"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Enter campaign description"
                      value={newCampaignDescription}
                      onChange={(e) => setNewCampaignDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Assign Lead Lists</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 mt-2">
                      {leadLists && leadLists.length > 0 ? (
                        leadLists.map((list) => (
                          <div key={list.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={list.id}
                              checked={selectedLeadLists.includes(list.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadLists([...selectedLeadLists, list.id]);
                                } else {
                                  setSelectedLeadLists(selectedLeadLists.filter(id => id !== list.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={list.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{list.name}</span>
                                <span className="text-sm text-gray-500">{list._count.leads} leads</span>
                              </div>
                              {list.description && (
                                <p className="text-sm text-gray-600">{list.description}</p>
                              )}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 mb-2">No lead lists available</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('/lead-lists', '_blank')}
                          >
                            Create Lead List
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCampaign} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Campaign"}
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
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-xl font-semibold">{totalCampaigns}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Active</p>
                  <p className="text-xl font-semibold text-green-600">{activeCampaigns}</p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Paused</p>
                  <p className="text-xl font-semibold text-yellow-600">{pausedCampaigns}</p>
                </div>
                <Pause className="h-8 w-8 text-yellow-500" />
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
        </div>

        {/* Table Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Campaigns</CardTitle>
                <CardDescription className="text-xs">
                  Manage your outreach campaigns and track performance
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search campaigns..."
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
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
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
            ) : filteredCampaigns?.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No campaigns found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first campaign to get started</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lead Lists</TableHead>
                      <TableHead>Total Leads</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCampaigns?.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-400" />
                            <span>{campaign.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(campaign.status)} className="gap-1">
                            {getStatusIcon(campaign.status)}
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {campaign.assignedLeadLists.length > 0 ? (
                              <>
                                <Link className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{campaign.assignedLeadLists.length} lists</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-sm font-medium">{campaign._count.leads}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(campaign.createdAt).toLocaleDateString()}
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
                              {campaign.status === "ACTIVE" ? (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(campaign.id, "PAUSED")}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Campaign
                                </DropdownMenuItem>
                              ) : campaign.status === "PAUSED" || campaign.status === "DRAFT" ? (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Campaign
                                </DropdownMenuItem>
                              ) : null}
                              {campaign.status !== "COMPLETED" && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(campaign.id, "COMPLETED")}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <TrendingUp className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
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
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredCampaigns?.length || 0)} of {filteredCampaigns?.length || 0} results
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
      </div>
    </div>
  );
}