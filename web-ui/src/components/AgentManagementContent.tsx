import { useState, useEffect } from "react";
import { gobiService } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bot,
  Plus,
  Search,
  Play,
  Pause,
  Square,
  Settings,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Zap
} from "lucide-react";
import { toast } from "react-hot-toast";
import DeploymentStatusModal from "./DeploymentStatusModal";

interface AgentForm {
  name: string;
  description: string;
  prompt: string;
  model: string;
  voice: string;
  temperature: number;
  template: string;
  deploymentMode: "local" | "livekit";
  customerName?: string;
  appointmentTime?: string;
  sttProvider?: string;
  ttsProvider?: string;
}

export default function AgentManagementContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState<string | null>(null);
  const [testAgent, setTestAgent] = useState<any>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [deploymentStatusAgent, setDeploymentStatusAgent] = useState<any>(null);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);

  // Form state
  const [agentForm, setAgentForm] = useState<AgentForm>({
    name: "",
    description: "",
    prompt: "",
    model: "gpt-4o",
    voice: "nova",
    temperature: 0.7,
    template: "custom",
    deploymentMode: "livekit",
    customerName: "",
    appointmentTime: "",
    sttProvider: "deepgram",
    ttsProvider: "openai",
  });

  // Data state
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<any>(null);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch agents data
  const fetchAgents = async () => {
    try {
      const { agents: agentsList } = await gobiService.agents.getAll({});
      setAgents(agentsList || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const agentStats = await gobiService.agents.getStats();
      setStats(agentStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAgents();
    fetchStats();
    const interval = setInterval(() => {
      fetchAgents();
      fetchStats();
    }, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handler functions with async/await
  const handleCreateAgent = async () => {
    setIsCreating(true);
    try {
      const result = await gobiService.agents.create(agentForm);
      setCreateDialogOpen(false);
      setAgentForm({ name: "", description: "", prompt: "", model: "gpt-4", voice: "nova", temperature: 0.7, template: "custom", deploymentMode: "livekit", customerName: "", appointmentTime: "", sttProvider: "deepgram", ttsProvider: "openai" });
      await fetchAgents();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;
    setIsUpdating(true);
    try {
      const result = await gobiService.agents.update(selectedAgent.id, agentForm);
      setEditDialogOpen(false);
      setSelectedAgent(null);
      await fetchAgents();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to update agent");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeployAgent = async (agentId: string) => {
    setIsDeploying(agentId);
    try {
      const result = await gobiService.agents.deploy(agentId, {});
      await fetchAgents();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to deploy agent");
    } finally {
      setIsDeploying(null);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    setIsStopping(agentId);
    try {
      const result = await gobiService.agents.stop(agentId);
      await fetchAgents();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to stop agent");
    } finally {
      setIsStopping(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const result = await gobiService.agents.delete(agentId);
      await fetchAgents();
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete agent");
    }
  };

  const handleEditAgent = (agent: any) => {
    setSelectedAgent(agent);
    setAgentForm({
      name: agent.name,
      description: agent.description || "",
      prompt: agent.prompt,
      model: agent.model,
      voice: agent.voice,
      temperature: agent.temperature,
      template: agent.template || "custom",
      deploymentMode: agent.deploymentMode || "livekit",
      customerName: agent.customerName || "",
      appointmentTime: agent.appointmentTime || "",
      sttProvider: agent.sttProvider || "deepgram",
      ttsProvider: agent.ttsProvider || "openai",
    });
    setEditDialogOpen(true);
  };

  const handleDeleteAgentConfirm = async (agentId: string, agentName: string) => {
    if (confirm(`Are you sure you want to delete agent "${agentName}"? This action cannot be undone.`)) {
      await handleDeleteAgent(agentId);
    }
  };

  const handleResetStuckAgents = async () => {
    toast.info("Reset stuck agents functionality needs backend implementation");
  };

  const handleTestAgent = (agent: any) => {
    setTestAgent(agent);
    setShowTestModal(true);
  };

  const getStatusColor = (status: string, isRunning?: boolean) => {
    if (isRunning && status === "ACTIVE") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "INACTIVE": return "bg-gray-100 text-gray-800";
      case "DEPLOYING": return "bg-yellow-100 text-yellow-800";
      case "ERROR": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string, isRunning?: boolean) => {
    if (isRunning && status === "ACTIVE") {
      return <Play className="h-4 w-4 text-green-600" />;
    }
    switch (status) {
      case "ACTIVE": return <CheckCircle className="h-4 w-4" />;
      case "INACTIVE": return <XCircle className="h-4 w-4" />;
      case "DEPLOYING": return <Clock className="h-4 w-4" />;
      case "ERROR": return <AlertCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  const getRealTimeStatus = (agentId: string) => {
    return realTimeStatus?.agents?.find(status => status.id === agentId);
  };

  const filteredAgents = agents?.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>

      {/* Create Agent Button */}
      <div className="mb-6 flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={handleResetStuckAgents}
          title="Reset any agents stuck in deploying status"
        >
          <Zap className="h-4 w-4 mr-2" />
          Reset Stuck Agents
        </Button>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                      template: "sales",
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
                      model: "gpt-4o-mini",
                      voice: "alloy",
                      temperature: 0.5,
                      template: "support",
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
                      template: "lead-qualifier",
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
                      template: "appointment",
                      deploymentMode: "livekit"
                    });
                  }}
                  className="text-xs"
                >
                  📅 Appointment Setter
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Agent Name *</Label>
                  <Input
                    id="name"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                    placeholder="e.g., Sales Agent"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="template" className="text-sm font-semibold text-gray-700">Agent Template *</Label>
                  <Select value={agentForm.template || "custom"} onValueChange={(value) => setAgentForm({...agentForm, template: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">🛠️ Custom Agent</SelectItem>
                      <SelectItem value="outbound_caller">📞 Outbound Caller</SelectItem>
                      <SelectItem value="sales">💼 Sales Representative</SelectItem>
                      <SelectItem value="support">🎧 Customer Support</SelectItem>
                      <SelectItem value="lead-qualifier">🎯 Lead Qualifier</SelectItem>
                      <SelectItem value="appointment">📅 Appointment Scheduler</SelectItem>
                      <SelectItem value="transfer">📞 Call Transfer Specialist</SelectItem>
                      <SelectItem value="inbound">📥 Inbound Call Handler</SelectItem>
                      <SelectItem value="followup">🔄 Follow-up Agent</SelectItem>
                      <SelectItem value="survey">📋 Survey Collector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="model" className="text-sm font-semibold text-gray-700">OpenAI Model *</Label>
                  <Select value={agentForm.model} onValueChange={(value) => setAgentForm({...agentForm, model: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o (Latest & Most Capable)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-Effective)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo (High Performance)</SelectItem>
                      <SelectItem value="gpt-4">GPT-4 (Standard)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget Option)</SelectItem>
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
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={agentForm.temperature}
                  onChange={(e) => setAgentForm({...agentForm, temperature: parseFloat(e.target.value)})}
                  className="h-11"
                />
                <p className="text-xs text-gray-500">
                  {agentForm.temperature <= 0.3 && "🎯 Focused & Deterministic"}
                  {agentForm.temperature > 0.3 && agentForm.temperature <= 0.7 && "⚖️ Balanced & Creative"}
                  {agentForm.temperature > 0.7 && "🎨 Creative & Varied"}
                </p>
              </div>

              {/* Conditional fields for Outbound Caller template */}
              {agentForm.template === 'outbound_caller' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="customerName" className="text-sm font-semibold text-gray-700">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={agentForm.customerName || ""}
                        onChange={(e) => setAgentForm({...agentForm, customerName: e.target.value})}
                        placeholder="e.g., Kumar Deepanshu"
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">💡 Default customer name for the outbound call</p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="appointmentTime" className="text-sm font-semibold text-gray-700">Appointment Time</Label>
                      <Input
                        id="appointmentTime"
                        value={agentForm.appointmentTime || ""}
                        onChange={(e) => setAgentForm({...agentForm, appointmentTime: e.target.value})}
                        placeholder="e.g., next Tuesday at 3pm"
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">📅 Default appointment time to confirm</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="sttProvider" className="text-sm font-semibold text-gray-700">Speech-to-Text Provider</Label>
                      <Select value={agentForm.sttProvider || "deepgram"} onValueChange={(value) => setAgentForm({...agentForm, sttProvider: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deepgram">🎤 Deepgram (Recommended)</SelectItem>
                          <SelectItem value="openai">🤖 OpenAI Whisper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="ttsProvider" className="text-sm font-semibold text-gray-700">Text-to-Speech Provider</Label>
                      <Select value={agentForm.ttsProvider || "openai"} onValueChange={(value) => setAgentForm({...agentForm, ttsProvider: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">🤖 OpenAI TTS (Recommended)</SelectItem>
                          <SelectItem value="cartesia">🎵 Cartesia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAgent} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
            <p className="text-xs text-muted-foreground">
              All created agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeAgents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              All time calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deploying</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">0</div>
            <p className="text-xs text-muted-foreground">
              Currently deploying
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DEPLOYING">Deploying</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>AI Agents</CardTitle>
          <CardDescription>
            Manage your AI agents and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAgents?.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No agents found</p>
              <p className="text-sm text-gray-400">Create your first agent to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgents?.map((agent) => {
                const realTime = getRealTimeStatus(agent.id);
                return (
                <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(agent.status, realTime?.isRunning)}
                      <Badge 
                        className={`${getStatusColor(agent.status, realTime?.isRunning)} ${
                          (agent.status === "DEPLOYING" || agent.status === "ACTIVE") ? "cursor-pointer hover:opacity-80" : ""
                        }`}
                        onClick={() => {
                          if (agent.status === "DEPLOYING" || agent.status === "ACTIVE") {
                            setDeploymentStatusAgent(agent);
                            setShowDeploymentModal(true);
                          }
                        }}
                        title={
                          agent.status === "DEPLOYING" 
                            ? "Click to view deployment progress and cancel if needed" 
                            : agent.status === "ACTIVE"
                            ? "Click to view deployment status and health"
                            : ""
                        }
                      >
                        {realTime?.isRunning ? "RUNNING" : agent.status}
                      </Badge>
                      {realTime?.isRunning && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600">Live</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500 flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {agent.model}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Zap className="h-3 w-3 mr-1" />
                          {agent.voice}
                        </span>
                        {agent.phoneNumber && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {agent.phoneNumber.number}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {agent.totalConversations || 0} calls
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">{agent.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">Conversion</p>
                    </div>
                    <div className="flex space-x-2">
                      {!realTime?.isRunning && (agent.status === "INACTIVE" || agent.status === "ERROR") && (
                        <Button 
                          size="sm" 
                          onClick={() => handleDeployAgent(agent.id)}
                          disabled={isDeploying === agent.id}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          title="🚀 One-Click Launch - Start AI Agent instantly"
                        >
                          {isDeploying === agent.id ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Launching...
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              🚀 Launch
                            </>
                          )}
                        </Button>
                      )}
                      {realTime?.isRunning && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTestAgent(agent)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                            title="Test Agent - Voice/Chat Communication"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStopAgent(agent.id)}
                            disabled={isStopping === agent.id}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          >
                            {isStopping === agent.id ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <Square className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      )}
                      {agent.status === "ACTIVE" && !realTime?.isRunning && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStopAgent(agent.id)}
                          disabled={isStopping === agent.id}
                        >
                          {isStopping === agent.id ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditAgent(agent)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteAgent(agent.id, agent.name)}
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[80vw] max-w-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update your agent configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Agent Name</Label>
                <Input
                  id="edit-name"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-model">AI Model</Label>
                <Select value={agentForm.model} onValueChange={(value) => setAgentForm({...agentForm, model: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={agentForm.description}
                onChange={(e) => setAgentForm({...agentForm, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-prompt">System Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={agentForm.prompt}
                onChange={(e) => setAgentForm({...agentForm, prompt: e.target.value})}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-voice">Voice</Label>
                <Select value={agentForm.voice} onValueChange={(value) => setAgentForm({...agentForm, voice: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="fable">Fable</SelectItem>
                    <SelectItem value="onyx">Onyx</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-temperature">Temperature</Label>
                <Input
                  id="edit-temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={agentForm.temperature}
                  onChange={(e) => setAgentForm({...agentForm, temperature: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="edit-maxTokens">Max Tokens</Label>
                <Input
                  id="edit-maxTokens"
                  type="number"
                  min="1"
                  max="4000"
                  value={1500}
                  onChange={(e) => {}}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAgent} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Agent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Test Agent Modal */}
      {showTestModal && testAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold">🤖 Test Agent: {testAgent.name}</h3>
                <p className="text-sm text-gray-600">Real-time communication with your AI agent</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTestModal(false)}
                className="hover:bg-red-50 hover:text-red-600"
              >
                ✕ Close
              </Button>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6">
              {/* Agent Status Bar */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Agent Online</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Model:</span> {testAgent.model} • 
                      <span className="font-medium"> Voice:</span> {testAgent.voice} • 
                      <span className="font-medium"> Temp:</span> {testAgent.temperature}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => window.open(`/agents?tab=control&room=agent-${testAgent.id}`, '_blank')}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Voice Call
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="flex-1 flex flex-col border rounded-lg">
                {/* Chat Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Live Chat with {testAgent.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/agents?tab=control&room=agent-${testAgent.id}&mode=chat`, '_blank')}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Full Chat
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
                  {/* Welcome Message */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800">
                          👋 Hello! I&apos;m {testAgent.name}, your AI agent. I&apos;m ready to help you with any questions or tasks. 
                          How can I assist you today?
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Just now</p>
                    </div>
                  </div>

                  {/* Sample Conversation */}
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="flex-1 max-w-[80%]">
                      <div className="bg-gray-100 rounded-lg p-3 ml-auto">
                        <p className="text-sm text-gray-800">
                          Can you tell me about your capabilities?
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">Just now</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">You</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800">
                          I&apos;m a {testAgent.model} powered AI agent with the following capabilities:
                          <br />• Natural conversation and question answering
                          <br />• Voice communication with {testAgent.voice} voice
                          <br />• Contextual understanding and memory
                          <br />• Task execution and problem solving
                          <br /><br />I&apos;m configured with a temperature of {testAgent.temperature} for {testAgent.temperature <= 0.3 ? "focused and deterministic" : testAgent.temperature <= 0.7 ? "balanced and creative" : "creative and varied"} responses.
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Just now</p>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Type your message to test the agent..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          // Handle message sending
                          console.log('Sending message to agent');
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        // Handle message sending
                        console.log('Sending message to agent');
                      }}
                    >
                      Send
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 This is a preview. Click "Full Chat" for complete functionality with LiveKit integration.
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h5 className="font-medium text-blue-800 mb-2">Testing Instructions</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Click "Voice Call" to test voice communication</li>
                  <li>• Click "Full Chat" to test text-based communication</li>
                  <li>• The agent will use your custom prompt: &quot;{testAgent.prompt}&quot;</li>
                  <li>• Make sure your microphone is enabled for voice tests</li>
                  <li>• The agent should respond according to its configuration</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowTestModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Status Modal */}
      {showDeploymentModal && deploymentStatusAgent && (
        <DeploymentStatusModal
          agent={deploymentStatusAgent}
          onClose={() => {
            setShowDeploymentModal(false);
            setDeploymentStatusAgent(null);
            void refetchAgents();
          }}
        />
      )}
    </div>
  );
}
