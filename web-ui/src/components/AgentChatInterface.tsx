import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Copy,
  Download,
  Trash2,
  MessageSquare,
  Zap
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  type: "text" | "audio" | "system";
}

interface AgentChatInterfaceProps {
  agent: {
    id: string;
    name: string;
    voice: string;
    model: string;
    temperature: number;
    prompt: string;
  };
  onClose: () => void;
}

export default function AgentChatInterface({ agent, onClose }: AgentChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionMode, setConnectionMode] = useState<"chat" | "voice">("chat");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      content: `👋 Hello! I'm ${agent?.name || "your AI assistant"}, your AI assistant. I'm ready to help you with any questions or tasks. How can I assist you today?`,
      sender: "agent",
      timestamp: new Date(),
      type: "system",
    };
    setMessages([welcomeMessage]);
  }, [agent?.name]);

  const addMessage = (content: string, sender: "user" | "agent", type: "text" | "audio" | "system" = "text") => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      type,
    };
    setMessages(prev => [...prev, message]);
  };

  const connectToAgent = async () => {
    setIsConnecting(true);
    try {
      // Simulate connection to LiveKit room for the agent
      const roomName = `agent-${agent.id}`;
      
      if (connectionMode === "voice") {
        // Initialize WebRTC for voice connection
        await initializeVoiceConnection(roomName);
      } else {
        // Initialize WebSocket for chat connection
        await initializeChatConnection(roomName);
      }
      
      setIsConnected(true);
      addMessage(`Connected to ${agent.name} in ${connectionMode} mode`, "agent", "system");
      toast.success(`Connected to ${agent.name} via ${connectionMode}`);
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Failed to connect to agent");
      addMessage("Connection failed. Please check if the agent is running.", "agent", "system");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromAgent = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    setIsConnected(false);
    setIsRecording(false);
    addMessage("Disconnected from agent", "agent", "system");
    toast("Disconnected from agent");
  };

  const initializeChatConnection = async (roomName: string) => {
    // Simulate WebSocket connection for real-time chat
    // In a real implementation, this would connect to LiveKit or your backend
    return new Promise<void>((resolve, reject) => {
      try {
        // Mock WebSocket connection
        setTimeout(() => {
          resolve();
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  };

  const initializeVoiceConnection = async (roomName: string) => {
    // Initialize voice connection with WebRTC
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up MediaRecorder for audio input
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // In a real implementation, send audio data to the agent
          addMessage("🎙️ Audio message sent", "user", "audio");
          
          // Simulate agent response
          setTimeout(() => {
            addMessage("I received your audio message. Let me respond...", "agent", "text");
          }, 1000);
        }
      };
      
      return Promise.resolve();
    } catch (error) {
      throw new Error("Microphone access denied");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    const userMessage = inputMessage.trim();
    addMessage(userMessage, "user");
    setInputMessage("");

    // Simulate agent processing and response
    addMessage("🤔 Thinking...", "agent", "system");
    
    // Simulate API call to agent
    setTimeout(async () => {
      try {
        // Remove thinking message
        setMessages(prev => prev.filter(m => m.content !== "🤔 Thinking..."));
        
        // Simulate agent response based on the prompt and model
        const response = await simulateAgentResponse(userMessage, agent);
        addMessage(response, "agent");
        
        // If voice mode, also play audio response
        if (connectionMode === "voice" && !isMuted) {
          playAudioResponse(response);
        }
      } catch (error) {
        addMessage("Sorry, I encountered an error processing your message.", "agent");
      }
    }, 1500);
  };

  const simulateAgentResponse = async (userMessage: string, agentConfig: typeof agent): Promise<string> => {
    // This would normally call your AI model API
    // For demo purposes, return a contextual response
    
    const responses = [
      `I understand you're asking about "${userMessage}". Based on my configuration as ${agentConfig.name}, I'm here to help you with that.`,
      `That's an interesting question about "${userMessage}". Let me provide you with some helpful information.`,
      `Thanks for reaching out about "${userMessage}". As your ${agentConfig.name}, I'll do my best to assist you.`,
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)] || responses[0];
    
    // Add some personality based on temperature
    if (agentConfig.temperature > 0.7) {
      return `${randomResponse} I'm feeling quite creative today! 🎨`;
    } else if (agentConfig.temperature < 0.3) {
      return `${randomResponse} I'll give you a precise and focused answer.`;
    }
    
    return randomResponse;
  };

  const playAudioResponse = (text: string) => {
    // Simulate audio playback
    // In a real implementation, this would use text-to-speech with the agent's voice
    addMessage(`🔊 Playing audio response with ${agent.voice} voice`, "agent", "system");
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecording) {
      mediaRecorderRef.current.start();
      setIsRecording(true);
      addMessage("🎙️ Recording started...", "user", "system");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast(isMuted ? "Audio enabled" : "Audio muted");
  };

  const exportConversation = () => {
    const conversation = messages
      .filter(m => m.type !== "system")
      .map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.sender.toUpperCase()}: ${m.content}`)
      .join('\n');
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${agent.name}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Conversation exported");
  };

  const clearConversation = () => {
    setMessages([]);
    const welcomeMessage: Message = {
      id: "welcome-new",
      content: `Conversation cleared. I'm ${agent?.name || "your AI assistant"}, ready to start fresh! How can I help?`,
      sender: "agent",
      timestamp: new Date(),
      type: "system",
    };
    setMessages([welcomeMessage]);
    toast("Conversation cleared");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">💬 Chat with {agent.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {agent.model}
                </span>
                <span className="flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  {agent.voice}
                </span>
                <span>Temp: {agent.temperature}</span>
                {isConnected && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    🟢 Connected
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportConversation}
              disabled={messages.length <= 1}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              disabled={messages.length <= 1}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Connection Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Mode:</label>
                <Button
                  variant={connectionMode === "chat" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConnectionMode("chat")}
                  disabled={isConnected}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Button>
                <Button
                  variant={connectionMode === "voice" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConnectionMode("voice")}
                  disabled={isConnected}
                >
                  <Mic className="h-4 w-4 mr-1" />
                  Voice
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {connectionMode === "voice" && isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className={isMuted ? "text-red-600" : ""}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              {!isConnected ? (
                <Button
                  onClick={connectToAgent}
                  disabled={isConnecting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isConnecting ? (
                    "Connecting..."
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Connect to Agent
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={disconnectFromAgent}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[400px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.sender === "user" ? "justify-end" : ""
              }`}
            >
              {message.sender === "agent" && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.sender === "user" ? "order-first" : ""
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : message.type === "system"
                      ? "bg-gray-100 text-gray-600 text-sm"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.sender === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium">You</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-gray-50">
          {connectionMode === "chat" ? (
            <div className="flex items-center space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  isConnected
                    ? `Type your message to ${agent.name}...`
                    : "Connect to start chatting..."
                }
                disabled={!isConnected}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!isConnected || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                className={`${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Hold to Talk
                  </>
                )}
              </Button>
              {isRecording && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Recording...</span>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 This is a demo interface. In production, this would connect to your deployed agent via LiveKit.
          </p>
        </div>
      </div>
    </div>
  );
}