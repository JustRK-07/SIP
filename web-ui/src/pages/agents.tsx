import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService, type Agent, type CreateAgentData } from "@/services/gobiService";
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
  BarChart3,
  Copy,
  Volume2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { AgentScriptPreview } from "@/components/AgentScriptPreview";

interface AgentForm {
  name: string;
  description: string;
  prompt: string;
  model: string;
  voice: string;
  temperature: number;
  deploymentMode: "local" | "livekit";
}

export default function Agents() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deployingAgentId, setDeployingAgentId] = useState<string | null>(null);
  const [logPollingInterval, setLogPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [scriptPreviewAgent, setScriptPreviewAgent] = useState<any>(null);
  const [scriptPreviewOpen, setScriptPreviewOpen] = useState(false);
  const [testCallDialogOpen, setTestCallDialogOpen] = useState(false);
  const [testCallAgent, setTestCallAgent] = useState<Agent | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testScenario, setTestScenario] = useState("general");
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneAgent, setCloneAgent] = useState<Agent | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [includeKnowledge, setIncludeKnowledge] = useState(true);
  const itemsPerPage = 10;

  // State for gobi-main data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Removed LocalAgent cleanup scheduler - using gobi-main PostgreSQL Agent system only

  // Form state
  const [agentForm, setAgentForm] = useState<AgentForm>({
    name: "",
    description: "",
    prompt: "",
    model: "gpt-4o",
    voice: "nova",
    temperature: 0.7,
    deploymentMode: "livekit",
  });

  // Fetch data from gobi-main
  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await gobiService.agents.getAll({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined
      });
      setAgents(response.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await gobiService.agents.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await gobiService.agents.getTemplates();
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchAgents();
    fetchStats();
    fetchTemplates();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAgents();
        fetchStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentPage, statusFilter, searchTerm, autoRefresh]);

  // Agent operations
  const handleCreateAgent = async () => {
    if (!agentForm.name.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    setIsCreatingAgent(true);
    try {
      const agentData: CreateAgentData = {
        name: agentForm.name,
        description: agentForm.description,
        prompt: agentForm.prompt,
        model: agentForm.model,
        voice: agentForm.voice,
        temperature: agentForm.temperature,
        deploymentMode: agentForm.deploymentMode,
      };

      await gobiService.agents.create(agentData);
      setCreateDialogOpen(false);
      setAgentForm({ name: "", description: "", prompt: "", model: "gpt-4o", voice: "nova", temperature: 0.7, deploymentMode: "livekit" });
      await fetchAgents();
      await fetchStats();
      toast.success("Agent created successfully!");
    } catch (error: any) {
      toast.error(`Failed to create agent: ${error.message}`);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleDeployAgent = async (agentId: string) => {
    try {
      await gobiService.agents.deploy(agentId, {});
      toast.success("Agent deployed successfully!");
      await fetchAgents();
    } catch (error: any) {
      toast.error(`Failed to deploy agent: ${error.message}`);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      await gobiService.agents.stop(agentId);
      toast.success("Agent stopped successfully!");
      await fetchAgents();
    } catch (error: any) {
      toast.error(`Failed to stop agent: ${error.message}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      try {
        await gobiService.agents.delete(agentId);
        toast.success("Agent deleted successfully!");
        await fetchAgents();
        await fetchStats();
      } catch (error: any) {
        toast.error(`Failed to delete agent: ${error.message}`);
      }
    }
  };

  // Function to fetch deployment logs from API
  const fetchDeploymentLogs = async (agentId: string) => {
    try {
      const response = await fetch(`/api/deployment-logs/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.logs && Array.isArray(data.logs)) {
          setDeploymentLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deployment logs:', error);
    }
  };

  const handleOpenTestCall = (agent: Agent) => {
    setTestCallAgent(agent);
    setTestPhoneNumber("");
    setTestScenario("general");
    setTestCallDialogOpen(true);
  };

  const handleTestCall = async () => {
    if (!testCallAgent || !testPhoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    try {
      const result = await gobiService.agents.testCall(testCallAgent.id, {
        testPhoneNumber,
        scenario: testScenario
      });
      toast.success(result.message);
      setTestCallDialogOpen(false);
      setTestPhoneNumber("");
    } catch (error: any) {
      toast.error(`Failed to initiate test call: ${error.message}`);
    }
  };

  const handleOpenClone = (agent: Agent) => {
    setCloneAgent(agent);
    setCloneName(`${agent.name} (Copy)`);
    setIncludeKnowledge(true);
    setCloneDialogOpen(true);
  };

  const handleCloneAgent = async () => {
    if (!cloneAgent || !cloneName.trim()) {
      toast.error("Please enter a name for the cloned agent");
      return;
    }

    try {
      const result = await gobiService.agents.clone(cloneAgent.id, {
        name: cloneName,
        includeKnowledge
      });
      toast.success(result.message);
      setCloneDialogOpen(false);
      setCloneName("");
      await fetchAgents();
    } catch (error: any) {
      toast.error(`Failed to clone agent: ${error.message}`);
    }
  };

  const handlePreviewScript = (agent: any) => {
    setScriptPreviewAgent(agent);
    setScriptPreviewOpen(true);
  };

  const handleDeployPythonAgent = (agentId: string) => {
    setIsDeploying(true);
    setDeployingAgentId(agentId);
    deployPythonMutation.mutate({ id: agentId });
  };




  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "RUNNING": return "default";
      case "ACTIVE": return "secondary"; // Not deployed, just configured
      case "STOPPED":
      case "INACTIVE": return "secondary";
      case "ERROR": return "destructive";
      case "DEPLOYING": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RUNNING": return <Play className="h-3 w-3" />;
      case "ACTIVE": return <Clock className="h-3 w-3" />; // Configured but not deployed
      case "STOPPED":
      case "INACTIVE": return <Square className="h-3 w-3" />;
      case "ERROR": return <XCircle className="h-3 w-3" />;
      case "DEPLOYING": return <RefreshCw className="h-3 w-3 animate-spin" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Stats calculations
  const totalAgents = agents?.length || 0;
  const runningAgents = agents?.filter(a => a.status === "RUNNING").length || 0;
  const stoppedAgents = agents?.filter(a => a.status === "STOPPED" || a.status === "INACTIVE" || a.status === "ACTIVE").length || 0;
  const deployingAgents = agents?.filter(a => a.status === "DEPLOYING").length || 0;
  const errorAgents = agents?.filter(a => a.status === "ERROR").length || 0;

  // Filter agents
  const filteredAgents = agents?.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Use deployed agents from API (includes local agents)
  const deployedAgentsList = agents || [];

  // Pagination
  const totalPages = Math.ceil((filteredAgents?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAgents = filteredAgents?.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and deploy your AI agents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsSyncing(true);
                await fetchAgents();
                setIsSyncing(false);
                toast.success("Agents synced successfully");
              }}
              title="Sync with LiveKit Cloud"
              disabled={isSyncing}
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                isSyncing && "animate-spin"
              )} />
              Sync
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
                  <DialogTitle>Create New Agent</DialogTitle>
                  <DialogDescription>
                    Configure your AI agent with custom prompts and settings
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
                          model: "gpt-4o",
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
                          model: "gpt-4o",
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
                          model: "gpt-4o",
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
                          <SelectItem value="gpt-4o">🚀 GPT-4o (Most Advanced)</SelectItem>
                          <SelectItem value="gpt-4o-mini">⚡ GPT-4o Mini (Fast & Efficient)</SelectItem>
                          <SelectItem value="gpt-4-turbo">🎯 GPT-4 Turbo</SelectItem>
                          <SelectItem value="gpt-4">🔧 GPT-4 (Standard)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">💰 GPT-3.5 Turbo (Budget)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {agentForm.model === "gpt-4o" && "Best for complex conversations and reasoning"}
                        {agentForm.model === "gpt-4o-mini" && "Fast responses, cost-effective for high volume"}
                        {agentForm.model === "gpt-4-turbo" && "High performance for complex tasks"}
                        {agentForm.model === "gpt-4" && "Reliable standard model"}
                        {agentForm.model === "gpt-3.5-turbo" && "Budget-friendly for simple conversations"}
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0 (Focused)</span>
                      <span>1 (Balanced)</span>
                      <span>2 (Creative)</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {agentForm.temperature <= 0.3 && "🎯 Focused & Deterministic"}
                      {agentForm.temperature > 0.3 && agentForm.temperature <= 0.7 && "⚖️ Balanced & Creative"}
                      {agentForm.temperature > 0.7 && agentForm.temperature <= 1.3 && "🎨 Creative & Varied"}
                      {agentForm.temperature > 1.3 && "🌟 Very Creative & Unpredictable"}
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAgent}
                      disabled={isCreatingAgent || !agentForm.name || !agentForm.prompt}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreatingAgent ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Agent
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Agents</p>
                  <p className="text-xl font-semibold">{totalAgents}</p>
                </div>
                <Bot className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Running</p>
                  <p className="text-xl font-semibold text-green-600">{runningAgents}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Stopped</p>
                  <p className="text-xl font-semibold text-gray-600">{stoppedAgents}</p>
                </div>
                <Square className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Deploying</p>
                  <p className="text-xl font-semibold text-blue-600">{deployingAgents}</p>
                </div>
                <RefreshCw className={cn(
                  "h-8 w-8 text-blue-500",
                  deployingAgents > 0 && "animate-spin"
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Errors</p>
                  <p className="text-xl font-semibold text-red-600">{errorAgents}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deployed Agents Section */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="border-b bg-white/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Deployed Agents
                      <Badge variant="default" className="bg-green-500">
                        {deployedAgentsList.filter(a => a.status === "RUNNING" || a.status === "ACTIVE").length} Running
                      </Badge>
                      {deployedAgentsList.filter(a => a.status === "DEPLOYING").length > 0 && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          {deployedAgentsList.filter(a => a.status === "DEPLOYING").length} Deploying
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Currently active and deploying agents
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAutoRefresh(!autoRefresh);
                      toast.success(autoRefresh ? "Auto-refresh disabled" : "Auto-refresh enabled (5s)");
                    }}
                    className={autoRefresh ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4 mr-2",
                      autoRefresh && "animate-spin"
                    )} />
                    {autoRefresh ? "Auto" : "Manual"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await fetchAgents();
                      toast.success("Refreshed deployed agents");
                    }}
                    className="bg-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {deployedAgentsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deployedAgentsList.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <span className="font-semibold text-sm text-gray-800">
                          {agent.name}
                        </span>
                      </div>
                      {agent.status === "DEPLOYING" ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Deploying
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          {agent.deploymentMode === "livekit" ? (
                            <><Cloud className="h-3 w-3 mr-1" />Cloud</>
                          ) : agent.deploymentMode === "local" ? (
                            <><Server className="h-3 w-3 mr-1" />Local</>
                          ) : (
                            <><Activity className="h-3 w-3 mr-1" />Live</>
                          )}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Cpu className="h-3 w-3" />
                        <span>Model: <span className="font-medium">{agent.model || "gpt-4"}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mic className="h-3 w-3" />
                        <span>Voice: <span className="font-medium">{agent.voice || "nova"}</span></span>
                      </div>
                      {agent.isLocal && agent.processId && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Server className="h-3 w-3" />
                          <span>PID: <span className="font-medium">{agent.processId}</span></span>
                        </div>
                      )}
                      {agent.isLocal && agent.host && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Server className="h-3 w-3" />
                          <span>Host: <span className="font-medium">{agent.host}</span></span>
                        </div>
                      )}
                      {agent.deploymentMode && (
                        <div className="flex items-center gap-2 text-gray-600">
                          {agent.deploymentMode === "livekit" ? (
                            <Cloud className="h-3 w-3" />
                          ) : (
                            <Server className="h-3 w-3" />
                          )}
                          <span>Mode: <span className="font-medium">{agent.deploymentMode}</span></span>
                        </div>
                      )}
                      {agent.phoneNumber && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{agent.phoneNumber.number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {agent.totalConversations || 0} conversations
                        </span>
                        <div className="flex gap-1">
                          {agent.status !== "DEPLOYING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleStopAgent(agent.id)}
                              title="Stop Agent"
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            title="View Logs"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gray-100 rounded-full">
                      <Bot className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">No Deployed Agents</p>
                      <p className="text-sm text-gray-500 mt-1">Deploy an agent to see it here</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Table Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Agents</CardTitle>
                <CardDescription className="text-xs">
                  Configure and manage your AI agents
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search agents..."
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
                    <SelectItem value="RUNNING">Running</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="STOPPED">Stopped</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DEPLOYING">Deploying</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
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
            ) : filteredAgents?.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No agents found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first agent to get started</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Voice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAgents?.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-gray-400" />
                            <span>{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {agent.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs w-fit">
                              {agent.model}
                            </Badge>
                            {agent.deploymentMode && (
                              <span className="text-xs text-gray-500">
                                {agent.deploymentMode === "livekit" ? "☁️ Cloud" : "🖥️ Local"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mic className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{agent.voice}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusColor(agent.status)} 
                            className={cn(
                              "gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                              agent.status === "DEPLOYING" && "bg-blue-100 text-blue-700 border-blue-300",
                              agent.status === "RUNNING" && "bg-green-100 text-green-700 border-green-300",
                              agent.status === "ACTIVE" && "bg-yellow-100 text-yellow-700 border-yellow-300",
                              agent.status === "ERROR" && "bg-red-100 text-red-700 border-red-300",
                              agent.status === "STOPPED" && "bg-gray-100 text-gray-700 border-gray-300",
                              agent.status === "INACTIVE" && "bg-gray-100 text-gray-700 border-gray-300"
                            )}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setDeploymentLogs([]); // Reset logs for new agent
                              setIsDeploying(false);
                              setStatusModalOpen(true);
                            }}
                          >
                            {getStatusIcon(agent.status)}
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agent.phoneNumber ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{agent.phoneNumber.number}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
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
                              <DropdownMenuItem onClick={() => handlePreviewScript(agent)}>
                                <FileCode className="h-4 w-4 mr-2" />
                                Preview Python Script
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/agents/${agent.id}`)}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                              {(agent.status === "STOPPED" || agent.status === "INACTIVE" || agent.status === "ACTIVE") && (
                                <>
                                  <DropdownMenuItem onClick={() => handleDeployPythonAgent(agent.id)}>
                                    <Rocket className="h-4 w-4 mr-2" />
                                    Deploy Python Agent
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeployAgent(agent.id)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Deploy Node Agent (Legacy)
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(agent.status === "ERROR") && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeployAgent(agent.id)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Redeploy Agent
                                </DropdownMenuItem>
                              )}
                              {(agent.status === "RUNNING") && (
                                <DropdownMenuItem onClick={() => handleStopAgent(agent.id)}>
                                  <Square className="h-4 w-4 mr-2" />
                                  Stop Agent
                                </DropdownMenuItem>
                              )}
                              {agent.status === "DEPLOYING" && (
                                <DropdownMenuItem disabled className="opacity-50">
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Deploying...
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenTestCall(agent)}>
                                <Phone className="h-4 w-4 mr-2" />
                                Test Call
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenClone(agent)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Clone Agent
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Agent
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteAgent(agent.id)}
                                disabled={agent.status === "RUNNING" || agent.status === "ACTIVE"}
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
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAgents?.length || 0)} of {filteredAgents?.length || 0} results
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

        {/* Status Details Modal */}
        <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agent Status Details</DialogTitle>
              <DialogDescription>
                View detailed deployment and configuration status
              </DialogDescription>
            </DialogHeader>
            {selectedAgent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Agent Name</label>
                    <p className="text-lg font-semibold">{selectedAgent.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={getStatusColor(selectedAgent.status)} 
                        className={cn(
                          "gap-1",
                          selectedAgent.status === "DEPLOYING" && "bg-blue-100 text-blue-700",
                          selectedAgent.status === "RUNNING" && "bg-green-100 text-green-700",
                          selectedAgent.status === "ACTIVE" && "bg-yellow-100 text-yellow-700",
                          selectedAgent.status === "ERROR" && "bg-red-100 text-red-700"
                        )}
                      >
                        {getStatusIcon(selectedAgent.status)}
                        {selectedAgent.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Model:</span> {selectedAgent.model}
                    </div>
                    <div>
                      <span className="text-gray-500">Voice:</span> {selectedAgent.voice}
                    </div>
                    <div>
                      <span className="text-gray-500">Temperature:</span> {selectedAgent.temperature}
                    </div>
                    <div>
                      <span className="text-gray-500">Deployment Mode:</span> {selectedAgent.deploymentMode || "livekit"}
                    </div>
                  </div>
                </div>

                {selectedAgent.livekitConfig && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">LiveKit Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Room Name:</span> {selectedAgent.livekitConfig.roomName || "Not assigned"}
                      </div>
                      <div>
                        <span className="text-gray-500">Server URL:</span> {selectedAgent.livekitConfig.serverUrl || "Not configured"}
                      </div>
                      {selectedAgent.livekitConfig.sipUri && (
                        <div>
                          <span className="text-gray-500">SIP URI:</span> {selectedAgent.livekitConfig.sipUri}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Deployment Status</h4>
                  <div className="space-y-2">
                    {!isDeploying && !deploymentLogs.length && (
                      <>
                        {selectedAgent.status === "ACTIVE" && (
                          <p className="text-sm text-yellow-600">
                            Agent is configured but not deployed. Click "Deploy Agent" to start the agent on LiveKit Cloud.
                          </p>
                        )}
                        {selectedAgent.status === "RUNNING" && (
                          <p className="text-sm text-green-600">
                            Agent is running and ready to handle calls.
                          </p>
                        )}
                        {selectedAgent.status === "DEPLOYING" && (
                          <p className="text-sm text-blue-600">
                            Agent is being deployed. This may take a few moments...
                          </p>
                        )}
                        {selectedAgent.status === "STOPPED" && (
                          <p className="text-sm text-gray-600">
                            Agent is stopped. Deploy the agent to start handling calls.
                          </p>
                        )}
                        {selectedAgent.status === "ERROR" && (
                          <p className="text-sm text-red-600">
                            Agent deployment failed. Please check the configuration and try again.
                          </p>
                        )}
                      </>
                    )}
                    
                    {/* Deployment Logs */}
                    {(isDeploying || deploymentLogs.length > 0) && (
                      <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-1">
                          {deploymentLogs.length > 0 ? (
                            deploymentLogs.map((log, index) => {
                              // Parse timestamp if present in log
                              const timestampMatch = log.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)/);
                              const timestamp = timestampMatch ? timestampMatch[1] : new Date().toLocaleTimeString();
                              const message = timestampMatch ? timestampMatch[2] : log;
                              
                              return (
                                <div key={index} className="text-xs font-mono">
                                  <span className="text-gray-500">[{timestamp}]</span>{" "}
                                  <span className={
                                    message.includes("✅") || message.includes("✓") ? "text-green-600" :
                                    message.includes("❌") || message.includes("Error") || message.includes("Failed") ? "text-red-600" :
                                    message.includes("🎉") || message.includes("🚀") ? "text-blue-600 font-semibold" :
                                    message.includes("⚠️") ? "text-yellow-600" :
                                    message.includes("☁️") ? "text-purple-600" :
                                    "text-gray-700"
                                  }>
                                    {message}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-gray-500 font-mono">
                              {isDeploying ? "📋 Waiting for deployment logs..." : "No deployment logs available"}
                            </div>
                          )}
                          {isDeploying && deploymentLogs.length > 0 && (
                            <div className="text-xs font-mono text-gray-500 animate-pulse">
                              🔄 Streaming real-time logs...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  {(selectedAgent.status === "ACTIVE" || selectedAgent.status === "STOPPED" || selectedAgent.status === "ERROR") && !isDeploying && (
                    <Button 
                      onClick={() => {
                        handleDeployAgent(selectedAgent.id);
                        // Keep modal open to show deployment progress
                      }}
                      size="sm"
                      className={selectedAgent.status === "ERROR" ? "bg-orange-600 hover:bg-orange-700" : ""}
                    >
                      {selectedAgent.status === "ERROR" ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Redeploy Agent
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Deploy Agent
                        </>
                      )}
                    </Button>
                  )}
                  {isDeploying && (
                    <Button 
                      disabled
                      size="sm"
                      className="cursor-not-allowed"
                    >
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </Button>
                  )}
                  {selectedAgent.status === "RUNNING" && (
                    <Button 
                      onClick={() => {
                        handleStopAgent(selectedAgent.id);
                        setStatusModalOpen(false);
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Agent
                    </Button>
                  )}
                  <Button 
                    onClick={() => setStatusModalOpen(false)} 
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Python Script Preview Modal */}
      {scriptPreviewAgent && (
        <AgentScriptPreview
          agent={scriptPreviewAgent}
          isOpen={scriptPreviewOpen}
          onClose={() => {
            setScriptPreviewOpen(false);
            setScriptPreviewAgent(null);
          }}
          onDeploy={() => {
            setScriptPreviewOpen(false);
            handleDeployPythonAgent(scriptPreviewAgent.id);
          }}
        />
      )}

      {/* Test Call Dialog */}
      <Dialog open={testCallDialogOpen} onOpenChange={setTestCallDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Test Call - {testCallAgent?.name}</DialogTitle>
            <DialogDescription>
              Initiate a test call to verify your agent's functionality
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testPhoneNumber">Phone Number *</Label>
              <Input
                id="testPhoneNumber"
                placeholder="+1234567890"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="testScenario">Test Scenario</Label>
              <Select value={testScenario} onValueChange={setTestScenario}>
                <SelectTrigger id="testScenario">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Conversation</SelectItem>
                  <SelectItem value="sales">Sales Pitch</SelectItem>
                  <SelectItem value="support">Customer Support</SelectItem>
                  <SelectItem value="appointment">Appointment Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTestCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestCall} disabled={!testPhoneNumber}>
              <Phone className="h-4 w-4 mr-2" />
              Initiate Test Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone Agent Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Clone Agent - {cloneAgent?.name}</DialogTitle>
            <DialogDescription>
              Create a copy of this agent with all its configurations
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cloneName">New Agent Name *</Label>
              <Input
                id="cloneName"
                placeholder="Enter name for cloned agent"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeKnowledge"
                checked={includeKnowledge}
                onChange={(e) => setIncludeKnowledge(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="includeKnowledge" className="text-sm font-normal cursor-pointer">
                Include knowledge base items
              </Label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                The cloned agent will inherit all configurations including prompt, voice settings, and model parameters.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneAgent} disabled={!cloneName.trim()}>
              <Copy className="h-4 w-4 mr-2" />
              Clone Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}