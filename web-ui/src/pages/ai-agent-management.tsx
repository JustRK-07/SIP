import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { agentService, type Agent, type AgentTemplate, type CreateAgentData } from "@/services/agentService";
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
  Bot,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Square,
  Settings,
  Trash2,
  Edit,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Mic,
  Cloud,
  Server,
  Cpu,
  FileCode,
  Eye,
  Rocket,
  Brain,
  Copy,
  TestTube,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface AgentForm {
  name: string;
  description: string;
  prompt: string;
  model: string;
  voice: string;
  temperature: number;
  deploymentMode: "local" | "livekit";
  type?: string;
  maxTokens?: number;
}

export default function AIAgentManagement() {
  const { } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deployingAgentId, setDeployingAgentId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [scriptPreviewAgent, setScriptPreviewAgent] = useState<any>(null);
  const [scriptPreviewOpen, setScriptPreviewOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const itemsPerPage = 10;

  // State for agents from our backend API
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    training: 0,
  });

  // Form state
  const [agentForm, setAgentForm] = useState<CreateAgentData>({
    name: "",
    description: "",
    prompt: "",
    model: "gpt-4",
    voice: "nova",
    temperature: 0.7,
    deploymentMode: "livekit",
    maxTokens: 1000,
  });

  // Fetch agents from our backend API
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgents();
      setAgents(data.agents || []);

      // Calculate stats
      const agentList = data.agents || [];
      setStats({
        total: agentList.length,
        active: agentList.filter((a) => a.status === 'ACTIVE').length,
        inactive: agentList.filter((a) => a.status === 'INACTIVE').length,
        training: agentList.filter((a) => a.status === 'RUNNING').length,
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchTemplates();
  }, [currentPage, statusFilter]);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const data = await agentService.getTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    }
  };

  // Create agent
  const handleCreateAgent = async () => {
    try {
      const result = await agentService.createAgent(agentForm);
      toast.success('Agent created successfully');
      setCreateDialogOpen(false);
      setAgentForm({
        name: "",
        description: "",
        prompt: "",
        model: "gpt-4",
        voice: "nova",
        temperature: 0.7,
        deploymentMode: "livekit",
        maxTokens: 1000,
      });
      fetchAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    }
  };

  // Update agent
  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    try {
      await agentService.updateAgent(selectedAgent.id, {
        name: agentForm.name,
        description: agentForm.description,
        prompt: agentForm.prompt,
        model: agentForm.model,
        voice: agentForm.voice,
        temperature: agentForm.temperature,
        maxTokens: agentForm.maxTokens,
      });

      toast.success(`Agent updated successfully!`);
      setEditDialogOpen(false);
      fetchAgents();
      resetForm();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId: string) => {
    try {
      await agentService.deleteAgent(agentId);
      toast.success('Agent deleted successfully');
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  // Deploy agent
  const handleDeployAgent = async (agentId: string) => {
    setIsDeploying(true);
    setDeployingAgentId(agentId);

    try {
      const data = await agentService.deployAgent(agentId, {
        recordCalls: true,
        transcribeRealtime: true,
      });
      toast.success(`Agent deployed successfully!`);
      fetchAgents();
    } catch (error) {
      console.error('Error deploying agent:', error);
      toast.error('Failed to deploy agent');
    } finally {
      setIsDeploying(false);
      setDeployingAgentId(null);
    }
  };

  // Test agent
  const handleTestAgent = async (agentId: string) => {
    try {
      const data = await agentService.testCall(agentId, '+1234567890');
      toast.success('Test call initiated!');
    } catch (error) {
      console.error('Error testing agent:', error);
      toast.error('Failed to initiate test call');
    }
  };

  // Clone agent
  const handleCloneAgent = async (agentId: string, agentName: string) => {
    const newName = prompt(`Enter name for cloned agent:`, `${agentName} (Copy)`);
    if (!newName) return;

    try {
      const data = await agentService.cloneAgent(agentId, newName);
      toast.success(`Agent cloned as "${newName}"`);
      fetchAgents();
    } catch (error) {
      console.error('Error cloning agent:', error);
      toast.error('Failed to clone agent');
    }
  };

  // Fetch analytics
  const fetchAnalytics = async (agentId: string) => {
    try {
      const data = await agentService.getAnalytics(agentId);
      setAnalytics(data);
      setAnalyticsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    }
  };

  const resetForm = () => {
    setAgentForm({
      name: "",
      description: "",
      prompt: "",
      model: "gpt-4",
      voice: "nova",
      temperature: 0.7,
      deploymentMode: "livekit",
      type: "INBOUND",
      maxTokens: 1000,
    });
    setSelectedAgent(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'TRAINING':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Training</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter agents based on search and status
  const filteredAgents = agents;

  // Pagination
  const paginatedAgents = filteredAgents;
  const totalFilteredPages = totalPages;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Brain className="h-8 w-8 mr-3 text-blue-600" />
            AI Agent Management
          </h2>
          <p className="text-muted-foreground">
            Manage and deploy AI-powered voice agents with advanced capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAgents}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[80vw] max-w-none max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New AI Agent</DialogTitle>
                <DialogDescription>
                  Configure your AI agent with custom prompts and advanced settings
                </DialogDescription>
              </DialogHeader>

              {/* Quick Templates */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">🚀 Quick Templates</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAgentForm({
                        ...agentForm,
                        name: "Sales Agent",
                        description: "Professional sales representative",
                        prompt: "You are a professional sales agent. Be friendly, persuasive, and focus on understanding customer needs. Ask qualifying questions and present solutions that match their requirements.",
                        model: "gpt-4",
                        voice: "nova",
                        temperature: 0.7,
                        deploymentMode: "livekit"
                      });
                    }}
                    className="text-xs"
                  >
                    💼 Sales Agent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAgentForm({
                        ...agentForm,
                        name: "Support Agent",
                        description: "Customer support specialist",
                        prompt: "You are a helpful customer support agent. Be patient, empathetic, and solution-oriented. Listen carefully to customer issues and provide clear, step-by-step solutions.",
                        model: "gpt-4",
                        voice: "alloy",
                        temperature: 0.5,
                        deploymentMode: "livekit"
                      });
                    }}
                    className="text-xs"
                  >
                    🎧 Support Agent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAgentForm({
                        ...agentForm,
                        name: "Lead Qualifier",
                        description: "Lead qualification specialist",
                        prompt: "You are a lead qualification agent. Ask strategic questions to understand prospect needs, budget, timeline, and decision-making process. Be consultative and build rapport.",
                        model: "gpt-4",
                        voice: "echo",
                        temperature: 0.6,
                        deploymentMode: "livekit"
                      });
                    }}
                    className="text-xs"
                  >
                    🎯 Lead Qualifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAgentForm({
                        ...agentForm,
                        name: "Appointment Setter",
                        description: "Appointment scheduling specialist",
                        prompt: "You are an appointment setting agent. Be professional and efficient. Focus on scheduling meetings with qualified prospects. Handle objections gracefully and confirm details clearly.",
                        model: "gpt-3.5-turbo",
                        voice: "shimmer",
                        temperature: 0.8,
                        deploymentMode: "livekit"
                      });
                    }}
                    className="text-xs"
                  >
                    📅 Appointment Setter
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Agent Name *</Label>
                  <Input
                    id="name"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                    placeholder="Enter a name for your agent"
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="model" className="text-sm font-semibold text-gray-700">AI Model *</Label>
                    <Select value={agentForm.model} onValueChange={(value) => setAgentForm({...agentForm, model: value})}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">🚀 GPT-4 (Most Advanced)</SelectItem>
                        <SelectItem value="gpt-4-turbo">⚡ GPT-4 Turbo (Fast & Efficient)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">💰 GPT-3.5 Turbo (Budget)</SelectItem>
                        <SelectItem value="claude-3">🎯 Claude 3 (Analytical)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {agentForm.model === "gpt-4" && "Best for complex conversations and reasoning"}
                      {agentForm.model === "gpt-4-turbo" && "Fast responses, optimized for speed"}
                      {agentForm.model === "gpt-3.5-turbo" && "Budget-friendly for simple conversations"}
                      {agentForm.model === "claude-3" && "Excellent for analytical and detailed responses"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="voice" className="text-sm font-semibold text-gray-700">Voice *</Label>
                    <Select value={agentForm.voice} onValueChange={(value) => setAgentForm({...agentForm, voice: value})}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nova">🎙️ Nova (Warm & Professional)</SelectItem>
                        <SelectItem value="alloy">🎵 Alloy (Neutral & Clear)</SelectItem>
                        <SelectItem value="echo">🔊 Echo (Confident & Strong)</SelectItem>
                        <SelectItem value="fable">📚 Fable (Storytelling & Engaging)</SelectItem>
                        <SelectItem value="onyx">💼 Onyx (Deep & Authoritative)</SelectItem>
                        <SelectItem value="shimmer">✨ Shimmer (Friendly & Energetic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description</Label>
                  <Input
                    id="description"
                    value={agentForm.description}
                    onChange={(e) => setAgentForm({...agentForm, description: e.target.value})}
                    placeholder="Brief description of this agent's purpose"
                    className="h-11"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Deployment Mode</Label>
                  <div className="h-11 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md flex items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">🌐</span>
                      <span className="text-blue-900 font-medium">LiveKit Cloud</span>
                      <span className="text-blue-600 text-sm">(Always)</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    ✅ All agents deploy to LiveKit cloud infrastructure for scalability and reliability
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="prompt" className="text-sm font-semibold text-gray-700">System Prompt *</Label>
                  <Textarea
                    id="prompt"
                    value={agentForm.prompt}
                    onChange={(e) => setAgentForm({...agentForm, prompt: e.target.value})}
                    placeholder="Enter the system prompt that defines how this agent should behave..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">💡 Tip: Be specific about the agent's role, tone, and behavior</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="temperature" className="text-sm font-semibold text-gray-700">Temperature ({agentForm.temperature})</Label>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={agentForm.temperature}
                    onChange={(e) => setAgentForm({...agentForm, temperature: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>More Focused (0)</span>
                    <span>Balanced</span>
                    <span>More Creative (2)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="maxTokens" className="text-sm font-semibold text-gray-700">Max Response Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={agentForm.maxTokens}
                    onChange={(e) => setAgentForm({...agentForm, maxTokens: parseInt(e.target.value)})}
                    placeholder="1000"
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">Maximum number of tokens in each response (default: 1000)</p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAgent} disabled={!agentForm.name || !agentForm.prompt}>
                    Create Agent
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All configured agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Pause className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Not deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.training}</div>
            <p className="text-xs text-muted-foreground">Being configured</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">AI Agents</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAgents()}
                  className="pl-8 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : paginatedAgents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No agents found</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first agent
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          agent.status === 'ACTIVE' ? "bg-green-100" : "bg-gray-100"
                        )}>
                          <Bot className={cn(
                            "h-5 w-5",
                            agent.status === 'ACTIVE' ? "text-green-600" : "text-gray-600"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.description || 'No description'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{agent.model}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mic className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{agent.voice}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span>{agent.totalConversations || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAgent(agent);
                            setAgentForm({
                              name: agent.name,
                              description: agent.description || '',
                              prompt: agent.prompt,
                              model: agent.model,
                              voice: agent.voice,
                              temperature: agent.temperature,
                              deploymentMode: agent.deploymentMode || 'livekit',
                              maxTokens: agent.maxTokens,
                            });
                            setEditDialogOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {agent.status === 'INACTIVE' && (
                            <DropdownMenuItem
                              onClick={() => handleDeployAgent(agent.id)}
                              disabled={deployingAgentId === agent.id}
                            >
                              <Rocket className="mr-2 h-4 w-4" />
                              {deployingAgentId === agent.id ? 'Deploying...' : 'Deploy'}
                            </DropdownMenuItem>
                          )}
                          {agent.status === 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => handleTestAgent(agent.id)}>
                              <TestTube className="mr-2 h-4 w-4" />
                              Test Call
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => fetchAnalytics(agent.id)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCloneAgent(agent.id, agent.name)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
                                handleDeleteAgent(agent.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalFilteredPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalFilteredPages}
              </div>
              <div className="flex items-center space-x-2">
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalFilteredPages, currentPage + 1))}
                  disabled={currentPage === totalFilteredPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalFilteredPages)}
                  disabled={currentPage === totalFilteredPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Agent Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[80vw] max-w-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update your AI agent configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gray-700">Agent Name *</Label>
              <Input
                id="edit-name"
                value={agentForm.name}
                onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                placeholder="Enter a name for your agent"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="edit-model" className="text-sm font-semibold text-gray-700">AI Model *</Label>
                <Select value={agentForm.model} onValueChange={(value) => setAgentForm({...agentForm, model: value})}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">🚀 GPT-4 (Most Advanced)</SelectItem>
                    <SelectItem value="gpt-4-turbo">⚡ GPT-4 Turbo (Fast & Efficient)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">💰 GPT-3.5 Turbo (Budget)</SelectItem>
                    <SelectItem value="claude-3">🎯 Claude 3 (Analytical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-voice" className="text-sm font-semibold text-gray-700">Voice *</Label>
                <Select value={agentForm.voice} onValueChange={(value) => setAgentForm({...agentForm, voice: value})}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">🎙️ Nova (Warm & Professional)</SelectItem>
                    <SelectItem value="alloy">🎵 Alloy (Neutral & Clear)</SelectItem>
                    <SelectItem value="echo">🔊 Echo (Confident & Strong)</SelectItem>
                    <SelectItem value="fable">📚 Fable (Storytelling & Engaging)</SelectItem>
                    <SelectItem value="onyx">💼 Onyx (Deep & Authoritative)</SelectItem>
                    <SelectItem value="shimmer">✨ Shimmer (Friendly & Energetic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-700">Description</Label>
              <Input
                id="edit-description"
                value={agentForm.description}
                onChange={(e) => setAgentForm({...agentForm, description: e.target.value})}
                placeholder="Brief description of this agent's purpose"
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="edit-prompt" className="text-sm font-semibold text-gray-700">System Prompt *</Label>
              <Textarea
                id="edit-prompt"
                value={agentForm.prompt}
                onChange={(e) => setAgentForm({...agentForm, prompt: e.target.value})}
                placeholder="Enter the system prompt that defines how this agent should behave..."
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="edit-temperature" className="text-sm font-semibold text-gray-700">Temperature ({agentForm.temperature})</Label>
              <input
                id="edit-temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={agentForm.temperature}
                onChange={(e) => setAgentForm({...agentForm, temperature: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>More Focused (0)</span>
                <span>Balanced</span>
                <span>More Creative (2)</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAgent}>
                Update Agent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agent Analytics</DialogTitle>
            <DialogDescription>
              Performance metrics and insights
            </DialogDescription>
          </DialogHeader>
          {analytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{analytics.totalCalls}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{Math.round(analytics.successRate * 100)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Avg Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{analytics.avgCallDuration}s</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resolution Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{Math.round(analytics.resolutionRate * 100)}%</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Label>Peak Hours</Label>
                <div className="flex gap-2 mt-2">
                  {analytics.peakHours?.map((hour: string) => (
                    <Badge key={hour}>{hour}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}