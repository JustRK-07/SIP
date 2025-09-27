import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Server, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Eye
} from "lucide-react";
import { toast } from "react-hot-toast";

interface SystemMetrics {
  memory: { total: number; used: number; percentage: number };
  cpu: { percentage: number };
  disk: { percentage: number };
  timestamp: string;
}

interface AgentHealthData {
  agentId: string;
  agentName: string;
  status: string;
  isRunning: boolean;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  pid: number | null;
  port: number | null;
  uptime: number;
}

export default function AgentMonitoringDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data with auto-refresh
  const { data: allAgentHealth, refetch: refetchHealth } = api.agentHealth.getAllAgentHealth.useQuery(
    undefined,
    { 
      refetchInterval: autoRefresh ? 3000 : false,
      refetchOnWindowFocus: true
    }
  );

  const { data: systemResources, refetch: refetchResources } = api.agentHealth.getSystemResources.useQuery(
    undefined,
    { 
      refetchInterval: autoRefresh ? 5000 : false,
      refetchOnWindowFocus: true
    }
  );

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string, healthStatus?: string) => {
    if (status === "running" && healthStatus === "healthy") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (status === "running" && healthStatus === "unhealthy") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (status === "stopped") {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusIcon = (status: string, healthStatus?: string) => {
    if (status === "running" && healthStatus === "healthy") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === "running" && healthStatus === "unhealthy") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    if (status === "stopped") {
      return <XCircle className="h-4 w-4 text-gray-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getResourceColor = (percentage: number) => {
    if (percentage < 50) return "text-green-600";
    if (percentage < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const refreshAll = () => {
    refetchHealth();
    refetchResources();
    toast.success("Dashboard refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Monitoring Dashboard</h2>
          <p className="text-gray-600">Real-time monitoring of your AI agents and system resources</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin text-green-600" : ""}`} />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Health</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allAgentHealth?.agents?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Configured agents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Running</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{allAgentHealth?.totalRunning || 0}</div>
                <p className="text-xs text-muted-foreground">Active agents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{allAgentHealth?.totalHealthy || 0}</div>
                <p className="text-xs text-muted-foreground">Passing health checks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemResources && 
                   systemResources.cpu.percentage < 80 && 
                   systemResources.memory.percentage < 80 && 
                   systemResources.disk.percentage < 80 ? (
                    <span className="text-green-600">Good</span>
                  ) : (
                    <span className="text-yellow-600">Warning</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Overall system status</p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Status Overview</CardTitle>
              <CardDescription>Current status of all configured agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAgentHealth?.agents?.map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(agent.status, agent.healthStatus)}
                      <div>
                        <p className="font-medium">{agent.agentName}</p>
                        <p className="text-sm text-gray-600">
                          {agent.isRunning ? (
                            <>PID: {agent.pid || 'N/A'} • Port: {agent.port || 'N/A'} • Uptime: {formatUptime(agent.uptime || 0)}</>
                          ) : (
                            "Not running"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(agent.status, agent.healthStatus)}>
                        {agent.isRunning ? `Running (${agent.healthStatus})` : "Stopped"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!allAgentHealth?.agents || allAgentHealth.agents.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No agents configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Health Tab */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Agent Health</CardTitle>
              <CardDescription>
                Comprehensive health monitoring for each agent process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAgentHealth?.agents?.map((agent) => (
                  <Card key={agent.agentId} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(agent.status, agent.healthStatus)}
                          <div>
                            <h4 className="font-semibold">{agent.agentName}</h4>
                            <p className="text-sm text-gray-600">ID: {agent.agentId}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(agent.status, agent.healthStatus)}>
                          {agent.status.toUpperCase()}
                        </Badge>
                      </div>

                      {agent.isRunning ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-semibold">{agent.pid}</div>
                            <div className="text-xs text-gray-600">Process ID</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-semibold">{agent.port}</div>
                            <div className="text-xs text-gray-600">Port</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-semibold">{formatUptime(agent.uptime || 0)}</div>
                            <div className="text-xs text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className={`text-lg font-semibold capitalize ${
                              agent.healthStatus === "healthy" ? "text-green-600" : 
                              agent.healthStatus === "unhealthy" ? "text-red-600" : "text-gray-600"
                            }`}>
                              {agent.healthStatus}
                            </div>
                            <div className="text-xs text-gray-600">Health Status</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <XCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p>Agent is not running</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Resources Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getResourceColor(systemResources?.cpu.percentage || 0)}`}>
                  {systemResources?.cpu.percentage || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemResources?.cpu.percentage || 0) < 50 ? "bg-green-500" :
                      (systemResources?.cpu.percentage || 0) < 80 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${systemResources?.cpu.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">System CPU utilization</p>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getResourceColor(systemResources?.memory.percentage || 0)}`}>
                  {systemResources?.memory.percentage || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemResources?.memory.percentage || 0) < 50 ? "bg-green-500" :
                      (systemResources?.memory.percentage || 0) < 80 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${systemResources?.memory.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {systemResources?.memory.used || 0}MB / {systemResources?.memory.total || 0}MB
                </p>
              </CardContent>
            </Card>

            {/* Disk Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getResourceColor(systemResources?.disk.percentage || 0)}`}>
                  {systemResources?.disk.percentage || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemResources?.disk.percentage || 0) < 50 ? "bg-green-500" :
                      (systemResources?.disk.percentage || 0) < 80 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${systemResources?.disk.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Root filesystem usage</p>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Current system status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">{allAgentHealth?.totalRunning || 0}</div>
                    <div className="text-xs text-gray-600">Active Processes</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {systemResources ? new Date(systemResources.timestamp).toLocaleTimeString() : "--:--"}
                    </div>
                    <div className="text-xs text-gray-600">Last Update</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">Operational</div>
                    <div className="text-xs text-gray-600">System Status</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {autoRefresh ? "3s" : "Manual"}
                    </div>
                    <div className="text-xs text-gray-600">Refresh Rate</div>
                  </div>
                </div>

                {/* Resource Alerts */}
                {systemResources && (
                  <div className="space-y-2">
                    {systemResources.cpu.percentage > 80 && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">High CPU usage detected ({systemResources.cpu.percentage}%)</span>
                      </div>
                    )}
                    {systemResources.memory.percentage > 80 && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">High memory usage detected ({systemResources.memory.percentage}%)</span>
                      </div>
                    )}
                    {systemResources.disk.percentage > 80 && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">High disk usage detected ({systemResources.disk.percentage}%)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}