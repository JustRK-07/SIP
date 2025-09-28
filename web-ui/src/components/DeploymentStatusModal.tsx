import { useState, useEffect, useCallback } from "react";
import { gobiService, type Agent } from "@/services/gobiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Cloud, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity,
  Server,
  RotateCcw,
  StopCircle,
  Play,
  FileText,
  Download,
  Eye
} from "lucide-react";

interface DeploymentStatusModalProps {
  agent: {
    id: string;
    name: string;
    status: string;
    model?: string;
    voice?: string;
  };
  onClose: () => void;
}

export default function DeploymentStatusModal({ agent, onClose }: DeploymentStatusModalProps) {
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [deploymentStartTime, setDeploymentStartTime] = useState<Date | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [logType, setLogType] = useState<"deployment" | "agent" | "health">("deployment");
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(false);

  // Track deployment start time and adjust refresh intervals
  useEffect(() => {
    if (agent.status === "DEPLOYING" && !deploymentStartTime) {
      setDeploymentStartTime(new Date());
      setRefreshInterval(1000);
    } else if (agent.status !== "DEPLOYING") {
      setRefreshInterval(2000);
    }
  }, [agent.status, deploymentStartTime]);

  // State for data from APIs
  const [livekitStatus, setLivekitStatus] = useState<any>(null);
  const [agentDetails, setAgentDetails] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusResponse, detailsResponse] = await Promise.all([
        gobiService.agents.getLiveKitStatus(agent.id).catch(() => null),
        gobiService.agents.getById(agent.id).catch(() => null)
      ]);
      setLivekitStatus(statusResponse);
      setAgentDetails(detailsResponse);
    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agent.id]);

  // Auto-refresh effect
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // Manual refetch function
  const refetchStatus = () => {
    fetchData();
  };

  // Async functions for mutations
  const deployAgent = async () => {
    try {
      await gobiService.agents.deploy(agent.id, {});
      setIsRetrying(false);
      console.log("Agent deployment restarted");
      fetchData(); // Refresh data
    } catch (error: any) {
      setIsRetrying(false);
      console.error("Retry failed:", error.message);
    }
  };

  const stopAgent = async () => {
    try {
      await gobiService.agents.stop(agent.id);
      setIsCancelling(false);
      setDeploymentStartTime(null);
      console.log("Agent stopped successfully");
      onClose();
    } catch (error: any) {
      setIsCancelling(false);
      console.error("Stop failed:", error.message);
    }
  };

  // Fetch deployment logs from API
  const fetchLogs = useCallback(async () => {
    if (!agent?.id) return;
    
    try {
      const response = await fetch(`/api/deployment-logs/${agent.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.logs && Array.isArray(data.logs)) {
          setDeploymentLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deployment logs:', error);
    }
  }, [agent?.id]);

  // Poll logs every 500ms when deployment is active
  useEffect(() => {
    if (agent?.status === 'DEPLOYING') {
      setIsPollingLogs(true);
      const interval = setInterval(fetchLogs, 500);
      
      // Initial fetch
      fetchLogs();
      
      return () => {
        clearInterval(interval);
        setIsPollingLogs(false);
      };
    } else {
      setIsPollingLogs(false);
    }
  }, [agent?.status, fetchLogs]);

  // Clear old logs when modal opens
  useEffect(() => {
    if (agent?.id) {
      // Clear old logs when modal is opened
      fetch(`/api/deployment-logs/${agent.id}`, { method: 'DELETE' }).catch(() => {});
      setDeploymentLogs([]);
    }
  }, [agent?.id]);

  const getStatusDetails = () => {
    if (livekitStatus?.actuallyRunning) {
      return {
        status: "RUNNING",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        description: "Agent is successfully running on LiveKit Cloud"
      };
    }

    switch (agent.status) {
      case "DEPLOYING":
        return {
          status: "DEPLOYING",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50 border-yellow-200",
          icon: <Clock className="h-5 w-5 text-yellow-600 animate-spin" />,
          description: "Agent deployment in progress to LiveKit Cloud..."
        };
      case "RUNNING":
        if (!livekitStatus?.isDeployed) {
          return {
            status: "INCONSISTENT",
            color: "text-orange-600",
            bgColor: "bg-orange-50 border-orange-200",
            icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
            description: "Database shows running but not deployed on LiveKit"
          };
        }
        return {
          status: "ACTIVE",
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          description: "Agent is deployed and ready on LiveKit Cloud"
        };
      case "ERROR":
        return {
          status: "ERROR",
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          description: "Agent deployment failed"
        };
      default:
        return {
          status: "INACTIVE",
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200",
          icon: <XCircle className="h-5 w-5 text-gray-600" />,
          description: "Agent is not deployed"
        };
    }
  };

  const statusDetails = getStatusDetails();

  // Calculate deployment duration
  const deploymentDuration = deploymentStartTime 
    ? Math.floor((Date.now() - deploymentStartTime.getTime()) / 1000)
    : 0;

  // Check if deployment is stuck (taking longer than 2 minutes)
  const isDeploymentStuck = agent.status === "DEPLOYING" && deploymentDuration > 120;
  
  // Retry deployment
  const handleRetryDeployment = () => {
    setIsRetrying(true);
    setDeploymentStartTime(new Date());
    setDeploymentLogs([]); // Clear logs for new deployment
    deployAgent();
  };

  // Cancel deployment
  const handleCancelDeployment = () => {
    setIsCancelling(true);
    stopAgent();
  };

  const getDeploymentSteps = () => {
    const deploymentTimeSinceStart = deploymentStartTime 
      ? Math.floor((Date.now() - deploymentStartTime.getTime()) / 1000)
      : 0;

    const isActive = agent.status === "RUNNING" || livekitStatus?.actuallyRunning;
    const isDeploying = agent.status === "DEPLOYING";

    const cloudSteps = [
      {
        id: 1,
        name: "Initialization",
        description: "Preparing agent configuration and dependencies",
        completed: deploymentTimeSinceStart > 3 || isActive,
        current: isDeploying && deploymentTimeSinceStart <= 3,
        error: false
      },
      {
        id: 2,
        name: "Deploy to LiveKit Cloud",
        description: "Deploying to LiveKit cloud infrastructure",
        completed: deploymentTimeSinceStart > 10 || livekitStatus?.isDeployed || isActive,
        current: isDeploying && deploymentTimeSinceStart > 3 && deploymentTimeSinceStart <= 15,
        error: agent.status === "ERROR" || isDeploymentStuck
      },
      {
        id: 3,
        name: "Health Check",
        description: "Verifying agent responsiveness and capabilities",
        completed: livekitStatus?.actuallyRunning || isActive,
        current: isDeploying && deploymentTimeSinceStart > 10,
        error: agent.status === "ERROR"
      }
    ];

    // Add deployment duration info to current step
    const steps = cloudSteps.map(step => {
      if (step.current && step.id === 2 && deploymentDuration > 0) {
        return {
          ...step,
          description: `${step.description} (${Math.floor(deploymentDuration / 60)}m ${deploymentDuration % 60}s)`
        };
      }
      return step;
    });

    return steps;
  };

  const deploymentSteps = getDeploymentSteps();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <Cloud className="h-5 w-5 mr-2 text-purple-600" />
              Deployment Status: {agent.name}
            </h3>
            <div className="flex items-center mt-2 space-x-4">
              <p className="text-sm text-gray-600">
                ☁️ LiveKit Cloud Deployment - Managed cloud infrastructure
              </p>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                Cloud Mode
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClose}
              className="hover:bg-red-50 hover:text-red-600"
            >
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Side - Deployment Info */}
          <div className="w-1/2 border-r overflow-y-auto">
            
            {/* Status Overview */}
            <div className="p-6 border-b">
              <Card className={`${statusDetails.bgColor} border-2`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {statusDetails.icon}
                      <div>
                        <h4 className={`text-lg font-semibold ${statusDetails.color}`}>
                          {statusDetails.status}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {statusDetails.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                        ☁️ Cloud Service
                      </Badge>
                      <div className="text-xs text-gray-500">
                        LiveKit managed infrastructure
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deployment Steps */}
            <div className="p-6 border-b">
              <h4 className="text-lg font-semibold mb-4">Deployment Progress</h4>
              <div className="space-y-4">
                {deploymentSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${step.completed 
                          ? 'bg-green-100 text-green-600 border-2 border-green-600' 
                          : step.error
                          ? 'bg-red-100 text-red-600 border-2 border-red-600'
                          : step.current 
                          ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-600 animate-pulse' 
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                        }
                      `}>
                        {step.completed ? '✓' : step.error ? '✗' : step.id}
                      </div>
                      {index < deploymentSteps.length - 1 && (
                        <div className={`w-0.5 h-8 mt-2 ${
                          step.completed ? 'bg-green-300' : 
                          step.error ? 'bg-red-300' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-medium ${
                        step.completed ? 'text-green-600' : 
                        step.error ? 'text-red-600' :
                        step.current ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </h5>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LiveKit Status Details */}
            {livekitStatus && (
              <div className="p-6 border-b">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      LiveKit Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`text-lg font-semibold ${livekitStatus.isDeployed ? 'text-green-600' : 'text-red-600'}`}>
                          {livekitStatus.isDeployed ? 'Yes' : 'No'}
                        </div>
                        <div className="text-xs text-gray-600">Deployed</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold">{livekitStatus.participants || 0}</div>
                        <div className="text-xs text-gray-600">Participants</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-xs">
                          {livekitStatus.roomName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Room Name</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`text-lg font-semibold ${
                          livekitStatus.actuallyRunning ? "text-green-600" : "text-gray-600"
                        }`}>
                          {livekitStatus.actuallyRunning ? 'Running' : 'Stopped'}
                        </div>
                        <div className="text-xs text-gray-600">Status</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Deployment Actions */}
            {(agent.status === "DEPLOYING" || agent.status === "ERROR" || isDeploymentStuck) && (
              <div className="p-6 border-b">
                <Card className={agent.status === "ERROR" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {agent.status === "ERROR" ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                        <div>
                          <h4 className={`font-medium ${agent.status === "ERROR" ? "text-red-800" : "text-yellow-800"}`}>
                            {agent.status === "ERROR" 
                              ? "Deployment Failed - Redeploy Available" 
                              : isDeploymentStuck 
                              ? "Deployment Stuck - Cancel Available" 
                              : "Deployment In Progress"}
                          </h4>
                          <p className={`text-sm ${agent.status === "ERROR" ? "text-red-700" : "text-yellow-700"}`}>
                            {agent.status === "ERROR"
                              ? "The deployment failed. Click 'Redeploy' to try again or check the logs for details."
                              : isDeploymentStuck 
                              ? `Running for ${Math.floor(deploymentDuration / 60)}m. Click Cancel to reset agent.`
                              : `Running for ${deploymentDuration}s... Monitor progress below.`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetryDeployment}
                          disabled={isRetrying || isCancelling}
                          className={agent.status === "ERROR" 
                            ? "border-red-300 text-red-700 hover:bg-red-100" 
                            : "border-yellow-300 text-yellow-700 hover:bg-yellow-100"}
                        >
                          {isRetrying ? (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                              {agent.status === "ERROR" ? "Redeploying..." : "Retrying..."}
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              {agent.status === "ERROR" ? "Redeploy" : "Retry"}
                            </>
                          )}
                        </Button>
                        {agent.status !== "ERROR" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelDeployment}
                            disabled={isRetrying || isCancelling}
                            className="border-red-300 text-red-700 hover:bg-red-100"
                          >
                            {isCancelling ? (
                              <>
                                <StopCircle className="h-4 w-4 mr-1 animate-spin" />
                                Cancel
                              </>
                            ) : (
                              <>
                                <StopCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Auto-refresh every {refreshInterval / 1000}s
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/agents', '_blank')}
                    className="flex items-center"
                  >
                    <Terminal className="h-4 w-4 mr-1" />
                    Agent Console
                  </Button>
                </div>
              </div>
            </div>
          
          </div>

          {/* Right Side - Real-time Logs */}
          <div className="w-1/2 flex flex-col">
            
            {/* Logs Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-700" />
                  <h4 className="text-lg font-semibold text-gray-900">Real-time Deployment Logs</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <select 
                    value={logType} 
                    onChange={(e) => setLogType(e.target.value as "deployment" | "agent" | "health")}
                    className="text-sm border rounded px-3 py-1 bg-white"
                  >
                    <option value="deployment">Deployment</option>
                    <option value="agent">Agent Process</option>
                    <option value="health">Health Check</option>
                  </select>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    Live
                  </div>
                </div>
              </div>
            </div>

            {/* Log Content */}
            <div className="flex-1 bg-gray-900 text-green-400 p-4 font-mono text-sm overflow-y-auto">
              {deploymentLogs.length > 0 ? (
                deploymentLogs.map((log, index) => {
                  // Parse timestamp and message if log has timestamps
                  const timestampMatch = log.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)/);
                  const timestamp = timestampMatch ? timestampMatch[1] : new Date().toLocaleTimeString().slice(0, 8);
                  const message = timestampMatch ? timestampMatch[2] : log;
                  
                  return (
                    <div key={index} className="mb-1 flex hover:bg-gray-800 px-1 rounded">
                      <span className="text-gray-500 mr-3 select-none w-8 text-right">{String(index + 1).padStart(3, '0')}</span>
                      <span className="text-gray-400 mr-3 select-none w-20 text-right">[{timestamp}]</span>
                      <span className="flex-1 whitespace-pre-wrap">{message}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500">
                  <div>
                    {agent?.status === 'DEPLOYING' 
                      ? '📋 Waiting for deployment logs...' 
                      : '📋 No deployment logs available'
                    }
                  </div>
                  <div className="mt-2">Agent ID: {agent.id} | Type: {logType}</div>
                  <div className="mt-1">
                    ☁️ Monitoring cloud deployment progress...
                  </div>
                </div>
              )}
              
              {/* Live indicator for active deployments */}
              {isPollingLogs && (
                <div className="mt-4 flex items-center text-yellow-400 bg-gray-800 p-2 rounded">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
                  <span>● Streaming real-time deployment logs...</span>
                </div>
              )}
            </div>

            {/* Logs Footer */}
            <div className="p-3 bg-gray-100 border-t text-xs text-gray-600 flex justify-between items-center">
              <span>{deploymentLogs.length} lines | Mode: Cloud</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>

          </div>
        
        </div>
      </div>
    </div>
  );
}