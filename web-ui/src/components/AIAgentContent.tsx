import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AiOutlineRobot,
  AiOutlinePlayCircle,
  AiOutlinePauseCircle,
  AiOutlineStop,
  AiOutlineReload,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineLoading3Quarters,
  AiOutlineCode,
  AiOutlineApi,
  AiOutlineSetting,
  AiOutlineInfoCircle,
  AiOutlineClockCircle,
  AiOutlinePhone,
  AiOutlineMessage,
  AiOutlineBarChart,
} from "react-icons/ai";
import { toast } from "sonner";
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track } from "livekit-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AgentStatus } from "@/components/AgentStatus";

type AgentLog = {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
  source: "agent" | "livekit" | "openai" | "twilio";
};

type AgentMetrics = {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  averageCallDuration: number;
  successRate: number;
  uptime: string;
  lastActivity: Date;
};

export default function AIAgentContent() {
  const router = useRouter();
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testScript, setTestScript] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string>("");
  const [testMode, setTestMode] = useState<"voice" | "chat">("voice");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'agent', timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const roomRef = useRef<Room | null>(null);

  // Handle router query parameters
  useEffect(() => {
    if (router.isReady) {
      const room = router.query.room as string;
      const mode = router.query.mode as string;
      
      if (room) {
        setCurrentRoom(room);
      }
      
      if (mode === "chat") {
        setTestMode("chat");
      } else {
        setTestMode("voice");
      }
    }
  }, [router.isReady, router.query]);

  // Generate LiveKit token
  const generateLiveKitToken = async (roomName: string) => {
    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          participantName: 'user',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate token');
      }
      
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error generating token:', error);
      // Fallback to a simple token for testing
      return 'test-token';
    }
  };

  // LiveKit connection functions
  const connectToRoom = async () => {
    if (!currentRoom || isConnecting || isConnected) return;
    
    setIsConnecting(true);
    try {
      const room = new Room();
      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log("Connected to room:", currentRoom);
        setIsConnected(true);
        setIsConnecting(false);
        toast.success("Connected to agent!");
        
        // Add welcome message
        setChatMessages([{
          id: Date.now().toString(),
          text: "Connected to agent. You can now start chatting!",
          sender: 'agent',
          timestamp: new Date()
        }]);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from room");
        setIsConnected(false);
        setIsConnecting(false);
        toast.error("Disconnected from agent");
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          if (message.type === 'chat' && message.text) {
            setChatMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: message.text,
              sender: 'agent',
              timestamp: new Date()
            }]);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

          // Generate a simple token for testing (in production, use proper JWT)
          const token = await generateLiveKitToken(currentRoom);
          console.log("Generated token:", token);
          console.log("Connecting to room:", currentRoom);
          console.log("LiveKit URL:", process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://firstproject-ly6tfhj5.livekit.cloud");
          
          // Connect to the room
          await room.connect(
            process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://firstproject-ly6tfhj5.livekit.cloud",
            token
          );
    } catch (error) {
      console.error("Failed to connect to room:", error);
      setIsConnecting(false);
      toast.error("Failed to connect to agent");
    }
  };

  const disconnectFromRoom = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      setChatMessages([]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !isConnected || !roomRef.current) return;

    const message = {
      type: 'chat',
      text: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: chatInput.trim(),
      sender: 'user',
      timestamp: new Date()
    }]);

    // Send message to agent
    try {
      console.log("Sending message to agent:", message);
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      console.log("Encoded data:", data);
      await roomRef.current.localParticipant.publishData(data);
      console.log("Message sent successfully");
      setChatInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  // Auto-connect when room is available
  useEffect(() => {
    if (currentRoom && testMode === "chat") {
      connectToRoom();
    }
    
    return () => {
      if (roomRef.current) {
        disconnectFromRoom();
      }
    };
  }, [currentRoom, testMode]);

  // Fetch agent status and metrics
  const { data: agentStatus, refetch: refetchStatus } = api.campaign.getAgentStatus.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Check every 5 seconds
      refetchOnWindowFocus: true,
    }
  );

  // Mock agent metrics (in a real app, this would come from an API)
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics>({
    totalCalls: 0,
    activeCalls: 0,
    completedCalls: 0,
    failedCalls: 0,
    averageCallDuration: 0,
    successRate: 0,
    uptime: "0h 0m",
    lastActivity: new Date(),
  });

  // Mock agent logs (in a real app, this would come from a WebSocket or API)
  useEffect(() => {
    const mockLogs: AgentLog[] = [
      {
        id: "1",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        level: "info",
        message: "AI Agent started successfully",
        source: "agent",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        level: "success",
        message: "Connected to LiveKit cloud",
        source: "livekit",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        level: "info",
        message: "OpenAI API connection established",
        source: "openai",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        level: "warning",
        message: "Twilio connection timeout, retrying...",
        source: "twilio",
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        level: "success",
        message: "Twilio connection restored",
        source: "twilio",
      },
    ];
    setAgentLogs(mockLogs);
  }, []);

  // Mutations for agent control
  const { mutate: startAgent, isPending: isStarting } = api.campaign.startAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent started successfully!");
      void refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to start agent: ${error.message}`);
    },
  });

  const { mutate: stopAgent, isPending: isStopping } = api.campaign.stopAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent stopped successfully!");
      void refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to stop agent: ${error.message}`);
    },
  });

  const { mutate: restartAgent, isPending: isRestarting } = api.campaign.restartAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent restarted successfully!");
      void refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to restart agent: ${error.message}`);
    },
  });

  const { mutate: makeTestCall, isPending: isTestCalling } = api.livekit.makeCall.useMutation({
    onSuccess: () => {
      toast.success("Test call initiated successfully!");
      setTestPhoneNumber("");
    },
    onError: (error) => {
      toast.error(`Failed to make test call: ${error.message}`);
    },
  });

  // Event handlers
  const handleStartAgent = () => {
    startAgent();
  };

  const handleStopAgent = () => {
    stopAgent();
  };

  const handleRestartAgent = () => {
    restartAgent();
  };

  const handleTestCall = () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    makeTestCall({ phoneNumber: testPhoneNumber });
  };

  const getLogIcon = (level: string, source: string) => {
    const iconClass = "h-4 w-4";
    switch (level) {
      case "success":
        return <AiOutlineCheckCircle className={`${iconClass} text-green-500`} />;
      case "warning":
        return <AiOutlineWarning className={`${iconClass} text-yellow-500`} />;
      case "error":
        return <AiOutlineWarning className={`${iconClass} text-red-500`} />;
      default:
        switch (source) {
          case "livekit":
            return <AiOutlineApi className={`${iconClass} text-blue-500`} />;
          case "openai":
            return <AiOutlineRobot className={`${iconClass} text-purple-500`} />;
          case "twilio":
            return <AiOutlinePhone className={`${iconClass} text-green-500`} />;
          default:
            return <AiOutlineCode className={`${iconClass} text-gray-500`} />;
        }
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case "success":
        return "border-l-green-500 bg-green-50";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50";
      case "error":
        return "border-l-red-500 bg-red-50";
      default:
        return "border-l-blue-500 bg-blue-50";
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div>
      {/* Header Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Agent Control</h2>
          <p className="text-gray-600">Monitor and control your AI agent performance and status</p>
        </div>
        <div className="flex items-center space-x-4">
          <AgentStatus />
          <Button
            variant="outline"
            onClick={() => setConfigDialogOpen(true)}
          >
            <AiOutlineSetting className="h-4 w-4 mr-2" />
            Configuration
          </Button>
        </div>
      </div>

      {/* Agent Test Interface */}
      {currentRoom && (
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Agent Test Interface</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Room:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">{currentRoom}</code>
              <span className="text-sm text-gray-600">Mode:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
                {testMode}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex space-x-4">
              <Button
                variant={testMode === "voice" ? "default" : "outline"}
                onClick={() => setTestMode("voice")}
                className="flex items-center"
              >
                <AiOutlinePhone className="h-4 w-4 mr-2" />
                Voice Test
              </Button>
              <Button
                variant={testMode === "chat" ? "default" : "outline"}
                onClick={() => setTestMode("chat")}
                className="flex items-center"
              >
                <AiOutlineMessage className="h-4 w-4 mr-2" />
                Chat Test
              </Button>
            </div>

            {/* Test Interface */}
            {testMode === "voice" ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Voice Communication Test</h4>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This will connect you to the agent via LiveKit for real-time voice communication.
                  </p>
                  <div className="flex items-center space-x-4">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        // In a real implementation, this would connect to LiveKit
                        toast.success("Connecting to agent via voice...");
                      }}
                    >
                      <AiOutlinePhone className="h-4 w-4 mr-2" />
                      Start Voice Call
                    </Button>
                    <div className="text-sm text-gray-600">
                      Make sure your microphone is enabled
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Chat Communication Test</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Test the agent's responses through text-based chat.
                    </p>
                    <div className="flex items-center space-x-2">
                      {isConnecting && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Connecting...</span>
                        </div>
                      )}
                      {isConnected && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs">Connected</span>
                        </div>
                      )}
                      {!isConnected && !isConnecting && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={connectToRoom}
                          className="text-xs"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type your message to the agent..."
                        className="flex-1"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            sendChatMessage();
                          }
                        }}
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={!isConnected || !chatInput.trim()}
                      >
                        Send
                      </Button>
                    </div>
                    
                    <div className="bg-white border rounded p-3 min-h-[200px] max-h-[300px] overflow-y-auto">
                      {chatMessages.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          {isConnected ? "Start chatting with the agent..." : "Connect to start chatting"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-2 rounded-lg text-sm ${
                                  message.sender === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <div className="font-medium text-xs mb-1">
                                  {message.sender === 'user' ? 'You' : 'Agent'}
                                </div>
                                <div>{message.text}</div>
                                <div className="text-xs opacity-70 mt-1">
                                  {message.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600">Connected to agent</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">Room: {currentRoom}</span>
            </div>
          </div>
        </div>
      )}

      {/* Agent Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Agent Status & Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Agent Control</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <AiOutlineMessage className="h-4 w-4 mr-2" />
                  {showLogs ? "Hide" : "Show"} Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStatus()}
                >
                  <AiOutlineReload className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Agent Status Card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AiOutlineRobot className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">AI Agent Status</h4>
                    <p className="text-sm text-gray-600">
                      {agentStatus?.status === 'active' ? 'Active and Processing Calls' : 
                       agentStatus?.connected ? 'Connected but Idle' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {agentStatus?.status === 'active' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Active</span>
                    </div>
                  ) : agentStatus?.connected ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-yellow-600 font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-600 font-medium">Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-4">
              {agentStatus?.status !== 'active' ? (
                <Button
                  onClick={handleStartAgent}
                  disabled={isStarting}
                  className="flex items-center space-x-2"
                >
                  {isStarting ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <AiOutlinePlayCircle className="h-4 w-4" />
                  )}
                  <span>{isStarting ? "Starting..." : "Start Agent"}</span>
                </Button>
              ) : (
                <Button
                  onClick={handleStopAgent}
                  disabled={isStopping}
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  {isStopping ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <AiOutlineStop className="h-4 w-4" />
                  )}
                  <span>{isStopping ? "Stopping..." : "Stop Agent"}</span>
                </Button>
              )}
              
              <Button
                onClick={handleRestartAgent}
                disabled={isRestarting}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isRestarting ? (
                  <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                ) : (
                  <AiOutlineReload className="h-4 w-4" />
                )}
                <span>{isRestarting ? "Restarting..." : "Restart Agent"}</span>
              </Button>
            </div>

            {/* Test Call Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium mb-4">Test Call</h4>
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Enter phone number (e.g., +1234567890)"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestCall}
                  disabled={isTestCalling}
                  className="flex items-center space-x-2"
                >
                  {isTestCalling ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <AiOutlinePhone className="h-4 w-4" />
                  )}
                  <span>{isTestCalling ? "Calling..." : "Test Call"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Agent Logs */}
          {showLogs && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-lg font-semibold mb-4">Agent Logs</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agentLogs.map((log) => (
                  <div key={log.id} className={`p-3 border-l-4 rounded-r-lg ${getLogColor(log.level)}`}>
                    <div className="flex items-start space-x-3">
                      {getLogIcon(log.level, log.source)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{log.message}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500 capitalize">{log.source}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <AiOutlineClockCircle className="h-3 w-3 mr-1" />
                            {formatTimeAgo(log.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Agent Metrics */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-semibold mb-4">Performance Metrics</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AiOutlinePhone className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Total Calls</span>
                </div>
                <span className="text-lg font-bold text-blue-800">{agentMetrics.totalCalls}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AiOutlineCheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <span className="text-lg font-bold text-green-800">{agentMetrics.completedCalls}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AiOutlineWarning className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <span className="text-lg font-bold text-red-800">{agentMetrics.failedCalls}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AiOutlineBarChart className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <span className="text-lg font-bold text-purple-800">{agentMetrics.successRate}%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AiOutlineClockCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <span className="text-lg font-bold text-yellow-800">{agentMetrics.uptime}</span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-semibold mb-4">Connection Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AiOutlineApi className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">LiveKit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AiOutlineRobot className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">OpenAI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AiOutlinePhone className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Twilio</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>AI Agent Configuration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="testScript" className="text-sm font-medium">
                Test Script
              </label>
              <Textarea
                id="testScript"
                value={testScript}
                onChange={(e) => setTestScript(e.target.value)}
                placeholder="Enter a test script for the AI agent..."
                className="min-h-[200px]"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <AiOutlineInfoCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                This script will be used for test calls to verify agent behavior.
              </span>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfigDialogOpen(false)}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
