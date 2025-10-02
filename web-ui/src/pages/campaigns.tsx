import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import type { Campaign as GobiCampaign, PhoneNumber, CreateCampaignData } from "@/services/gobiService";
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
  Bot,
  PhoneIncoming,
  PhoneOutgoing,
  Wifi,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Using GobiCampaign type from service

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
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [selectedLeadLists, setSelectedLeadLists] = useState<string[]>([]);
  const [campaignType, setCampaignType] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Gobi-main data
  const [campaigns, setCampaigns] = useState<GobiCampaign[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Gobi-main lead lists
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);

  // Fetch campaigns from gobi-main
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await gobiService.campaigns.getAll();
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch phone numbers from gobi-main
  const fetchPhoneNumbers = async () => {
    try {
      const response = await gobiService.numbers.getAll();
      setPhoneNumbers(response.data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  // Fetch lead lists from gobi-main
  const fetchLeadLists = async () => {
    try {
      const response = await gobiService.leadLists.getAll();
      setLeadLists(response || []);
    } catch (error) {
      console.error('Error fetching lead lists:', error);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchPhoneNumbers();
    fetchLeadLists();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsCreating(true);
    try {
      const campaignData: CreateCampaignData = {
        name: newCampaignName,
        description: newCampaignDescription,
        campaignType,
        agentName: selectedAgent || undefined,
        numberIds: selectedPhoneNumbers.length > 0 ? selectedPhoneNumbers : undefined,
      };

      await gobiService.campaigns.create(campaignData);
      toast.success("Campaign created successfully with LiveKit trunk!");

      // Reset form
      setNewCampaignName("");
      setNewCampaignDescription("");
      setCampaignType('INBOUND');
      setSelectedAgent("");
      setSelectedPhoneNumbers([]);
      setSelectedLeadLists([]);
      setCreateDialogOpen(false);

      // Refresh campaigns
      await fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (campaignId: string, status: string) => {
    try {
      await gobiService.campaigns.update(campaignId, { isActive: status === 'ACTIVE' });
      toast.success("Campaign status updated!");
      await fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to update campaign");
    }
  };

  const viewTrunkDetails = (campaign: GobiCampaign) => {
    const trunk = campaign.livekitTrunk;
    if (!trunk) return;

    const details = `
LiveKit Trunk Details:
- Name: ${trunk.name || 'N/A'}
- Type: ${trunk.trunkType || campaign.campaignType}
- Status: ${trunk.status}
- Trunk ID: ${trunk.livekitTrunkId || 'Not provisioned'}
- Max Concurrent Calls: ${trunk.maxConcurrentCalls || 10}
${campaign.dispatchRule ? `\n- Agent: ${campaign.dispatchRule.agentName}` : ''}
${campaign.phoneNumbers?.length ? `\n- Phone Numbers: ${campaign.phoneNumbers.length} assigned` : ''}
    `;

    alert(details);
  };

  const handleViewDetails = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete the campaign "${campaignName}"?\n\nThis will also remove the associated LiveKit trunk and dispatch rules.`)) {
      return;
    }

    try {
      await gobiService.campaigns.delete(campaignId);
      toast.success(`Campaign "${campaignName}" deleted successfully!`);
      await fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete campaign");
    }
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
  const inboundCampaigns = campaigns?.filter(c => c.campaignType === "INBOUND").length || 0;
  const outboundCampaigns = campaigns?.filter(c => c.campaignType === "OUTBOUND").length || 0;
  const trunksActive = campaigns?.filter(c => c.livekitTrunk?.status === "ACTIVE").length || 0;
  const trunksProvisioning = campaigns?.filter(c => c.livekitTrunk?.status === "PROVISIONING").length || 0;

  // Filter campaigns
  const filteredCampaigns = campaigns?.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ||
                         (statusFilter === "ACTIVE" && campaign.status === "ACTIVE") ||
                         (statusFilter === "INACTIVE" && campaign.status !== "ACTIVE");
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Campaign Name</Label>
                      <Input
                        placeholder="Enter campaign name"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Campaign Type</Label>
                      <Select value={campaignType} onValueChange={(value: 'INBOUND' | 'OUTBOUND') => setCampaignType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INBOUND">
                            <div className="flex items-center gap-2">
                              <PhoneIncoming className="h-4 w-4" />
                              <span>Inbound</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="OUTBOUND">
                            <div className="flex items-center gap-2">
                              <PhoneOutgoing className="h-4 w-4" />
                              <span>Outbound</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <Label>AI Agent Name (Optional)</Label>
                    <Input
                      placeholder="Enter agent name (e.g., sales-agent)"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Agent will be assigned to handle calls</p>
                  </div>

                  <div>
                    <Label>Assign Phone Numbers</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 mt-2">
                      {phoneNumbers && phoneNumbers.length > 0 ? (
                        phoneNumbers.map((phone) => (
                          <div key={phone.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={phone.id}
                              checked={selectedPhoneNumbers.includes(phone.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPhoneNumbers([...selectedPhoneNumbers, phone.id]);
                                } else {
                                  setSelectedPhoneNumbers(selectedPhoneNumbers.filter(id => id !== phone.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={phone.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{phone.number}</span>
                                <Badge variant="outline" className="text-xs">
                                  {phone.status}
                                </Badge>
                              </div>
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No phone numbers available</p>
                          <p className="text-xs text-gray-400 mt-1">Purchase numbers from Phone Numbers tab</p>
                        </div>
                      )}
                    </div>
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
                                <span className="text-sm text-gray-500">{list.totalLeads || 0} leads</span>
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
                  <p className="text-xs text-gray-600">Inbound</p>
                  <p className="text-xl font-semibold text-blue-600">{inboundCampaigns}</p>
                </div>
                <PhoneIncoming className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Outbound</p>
                  <p className="text-xl font-semibold text-purple-600">{outboundCampaigns}</p>
                </div>
                <PhoneOutgoing className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LiveKit Trunk Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Active Trunks</p>
                  <p className="text-xl font-semibold text-green-600">{trunksActive}</p>
                  <p className="text-xs text-gray-500 mt-1">Ready for calls</p>
                </div>
                <div className="relative">
                  <Wifi className="h-8 w-8 text-green-500" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Provisioning</p>
                  <p className="text-xl font-semibold text-yellow-600">{trunksProvisioning}</p>
                  <p className="text-xs text-gray-500 mt-1">Setting up</p>
                </div>
                <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Dispatch Rules</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {campaigns?.filter(c => c.dispatchRule).length || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Agent routing</p>
                </div>
                <Bot className="h-8 w-8 text-blue-500" />
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
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Phone Numbers</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCampaigns?.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-gray-400" />
                              <span>{campaign.name}</span>
                            </div>
                            {campaign.livekitTrunk && (
                              <div className="flex items-center gap-1">
                                {campaign.livekitTrunk.status === 'ACTIVE' ? (
                                  <>
                                    <Wifi className="h-3 w-3 text-green-500 animate-pulse" />
                                    <span className="text-xs text-green-600">Trunk Active</span>
                                  </>
                                ) : campaign.livekitTrunk.status === 'PROVISIONING' ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />
                                    <span className="text-xs text-yellow-600">Provisioning</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 text-red-500" />
                                    <span className="text-xs text-red-600">Trunk Error</span>
                                  </>
                                )}
                                {campaign.livekitTrunk.livekitTrunkId && (
                                  <span className="text-xs text-gray-400 ml-2">
                                    ID: {campaign.livekitTrunk.livekitTrunkId.slice(-8)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={campaign.campaignType === 'INBOUND' ? 'default' : 'secondary'} className="gap-1">
                            {campaign.campaignType === 'INBOUND' ? (
                              <PhoneIncoming className="h-3 w-3" />
                            ) : (
                              <PhoneOutgoing className="h-3 w-3" />
                            )}
                            {campaign.campaignType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(campaign.status)} className="gap-1">
                            {getStatusIcon(campaign.status)}
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.dispatchRule?.agentName ? (
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{campaign.dispatchRule.agentName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No agent</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {campaign.phoneNumbers && campaign.phoneNumbers.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{campaign.phoneNumbers.length}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
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
                              <DropdownMenuItem onClick={() => handleViewDetails(campaign.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(campaign.id, 'ACTIVE')}>
                                <Play className="h-4 w-4 mr-2" />
                                Activate Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(campaign.id, 'PAUSED')}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause Campaign
                              </DropdownMenuItem>
                              {campaign.livekitTrunk && (
                                <DropdownMenuItem onClick={() => viewTrunkDetails(campaign)}>
                                  <Wifi className="h-4 w-4 mr-2" />
                                  View Trunk Details
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
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Campaign
                              </DropdownMenuItem>
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