import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { AiOutlineRobot, AiOutlineCheckCircle, AiOutlineWarning, AiOutlineLoading3Quarters, AiOutlineApi, AiOutlineCode } from "react-icons/ai";

export function AgentStatus() {
  const { data: agentStatus, isLoading, refetch } = api.campaign.getAgentStatus.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Check every 30 seconds
      refetchOnWindowFocus: true,
    }
  );

  const getStatusIcon = () => {
    if (isLoading) {
      return <AiOutlineLoading3Quarters className="animate-spin text-gray-500" size={20} />;
    }
    
    if (agentStatus?.status === 'active') {
      return <AiOutlineCheckCircle className="text-green-500 animate-pulse" size={20} />;
    } else if (agentStatus?.connected) {
      return <AiOutlineCheckCircle className="text-green-500" size={20} />;
    }
    
    return <AiOutlineWarning className="text-red-500" size={20} />;
  };

  const getStatusColor = () => {
    if (isLoading) return "bg-gray-100 border-gray-300";
    if (agentStatus?.status === 'active') return "bg-green-50 border-green-400";
    if (agentStatus?.connected) return "bg-green-50 border-green-300";
    return "bg-red-50 border-red-300";
  };

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (agentStatus?.status === 'active') return "AI Agent Active";
    if (agentStatus?.connected) return "AI Agent Online";
    return "AI Agent Offline";
  };

  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`px-4 py-2 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        <AiOutlineRobot className="text-gray-700" size={24} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {getStatusText()}
            </span>
            {getStatusIcon()}
            {agentStatus?.agentId && (
              <span className="text-xs text-gray-500 font-mono">
                ID: {agentStatus.agentId}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-600">
            {agentStatus?.message || "Connecting to agent..."}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          {agentStatus?.details && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-600 hover:text-gray-700"
            >
              {showDetails ? "Hide" : "Details"}
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {showDetails && agentStatus?.details && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
          <div className="flex items-center gap-2">
            <AiOutlineApi className="text-gray-500" size={16} />
            <span className="text-xs text-gray-600">
              LiveKit: {agentStatus.details.livekit?.message}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AiOutlineCode className="text-gray-500" size={16} />
            <span className="text-xs text-gray-600">
              Python Agent: {agentStatus.details.pythonAgent?.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}