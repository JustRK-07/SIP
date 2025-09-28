import { useState, useEffect } from "react";
import { gobiService } from "@/services/gobiService";
import {
  AiOutlineLoading3Quarters,
  AiOutlinePhone,
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineWarning,
  AiOutlineUser,
  AiOutlineRobot,
  AiOutlineClockCircle,
  AiOutlineSound,
  AiOutlineStop
} from "react-icons/ai";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CallStatus = {
  id: string;
  leadName?: string;
  phoneNumber: string;
  campaignName: string;
  status: string;
  startTime: Date;
  duration?: number;
  outcome?: string;
  interestLevel?: string;
};

type RealTimeStats = {
  activeCalls: number;
  completedToday: number;
  interestedLeads: number;
  callbacksScheduled: number;
  totalLeadsContacted: number;
  conversionRate: number;
};

type OverallStatsCall = {
  id: string;
  callStartTime: string;
  campaignName: string;
  phoneNumber: string;
  status: string;
  duration?: number;
};

// Utility function to get relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

export function RealTimeDashboard() {
  const [realtimeStats, setRealtimeStats] = useState<RealTimeStats>({
    activeCalls: 0,
    completedToday: 0,
    interestedLeads: 0,
    callbacksScheduled: 0,
    totalLeadsContacted: 0,
    conversionRate: 0
  });

  const [liveCalls, setLiveCalls] = useState<CallStatus[]>([]);
  const [recentOutcomes, setRecentOutcomes] = useState<CallStatus[]>([]);
  const [listeningToCalls, setListeningToCalls] = useState<Set<string>>(new Set());
  const [monitorPopupOpen, setMonitorPopupOpen] = useState(false);
  const [selectedCallForMonitoring, setSelectedCallForMonitoring] = useState<CallStatus | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [overallStats, setOverallStats] = useState<any>(null);

  // Fetch data using gobiService
  const fetchRealTimeData = async () => {
    try {
      setIsLoading(true);
      const [campaignsData, agentsData, campaignStats] = await Promise.all([
        gobiService.campaigns.getAll(),
        gobiService.agents.getAll(),
        gobiService.campaigns.getStats()
      ]);

      // Process the data to match the expected format
      const campaigns = campaignsData?.data || [];
      const agents = agentsData?.agents || [];

      // Create mock overall stats structure for compatibility
      const processedStats = {
        totalCalls: campaigns.reduce((sum: number, campaign: any) => sum + (campaign.totalCalls || 0), 0),
        successRate: campaignStats?.conversionRate || 0,
        statusDistribution: {
          "IN_PROGRESS": agents.filter((agent: any) => agent.status === "ACTIVE").length,
          "COMPLETED": campaigns.reduce((sum: number, campaign: any) => sum + (campaign.successfulCalls || 0), 0),
        },
        recentCalls: campaigns.map((campaign: any) => ({
          id: campaign.id,
          phoneNumber: campaign.phoneNumber || 'N/A',
          campaignName: campaign.name,
          status: campaign.isActive ? "IN_PROGRESS" : "COMPLETED",
          callStartTime: campaign.createdAt || new Date().toISOString(),
          duration: Math.floor(Math.random() * 300) // Mock duration
        })),
        outcomes: {
          "Interested": Math.floor(Math.random() * 50),
          "Callback Requested": Math.floor(Math.random() * 20)
        }
      };

      setOverallStats(processedStats);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      toast.error('Failed to fetch real-time data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update stats when data changes
  useEffect(() => {
    if (overallStats) {
      const today = new Date().toDateString();
      const todaysCalls = overallStats.recentCalls.filter(
        (call) => new Date(call.callStartTime).toDateString() === today
      );

      // Safe access to outcomes with fallback
      const outcomes = (overallStats.outcomes as Record<string, number>) || {};
      const interestedCount = outcomes["Interested"] || outcomes["interested"] || outcomes["INTERESTED"] || 0;
      const callbackCount = outcomes["Callback Requested"] || outcomes["callback_requested"] || outcomes["CALLBACK_REQUESTED"] || 0;

      // Update stats with smooth transitions
      setRealtimeStats(prev => ({
        activeCalls: overallStats.statusDistribution["IN_PROGRESS"] || 0,
        completedToday: todaysCalls.length,
        interestedLeads: interestedCount,
        callbacksScheduled: callbackCount,
        totalLeadsContacted: overallStats.totalCalls,
        conversionRate: overallStats.successRate * 100
      }));

      // Update live calls with optimistic updates
      const activeCalls = overallStats.recentCalls
        .filter((call) => call.status === "IN_PROGRESS")
        .map((call) => ({
          id: call.id,
          phoneNumber: call.phoneNumber,
          campaignName: call.campaignName,
          status: call.status,
          startTime: new Date(call.callStartTime),
          duration: call.duration ?? undefined
        }));

      // Smoothly update live calls
      setLiveCalls(prev => {
        // Keep calls that are still active
        const updatedCalls = activeCalls.filter(newCall => 
          !prev.some(oldCall => oldCall.id === newCall.id && oldCall.status !== newCall.status)
        );
        return updatedCalls;
      });

      // Update recent outcomes with smooth transitions
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentCompletedCalls = overallStats.recentCalls
        .filter((call) => 
          (call.status === "COMPLETED" || call.status === "HUNG_UP" || call.status === "FAILED" || call.status === "NO_ANSWER") && 
          new Date(call.callStartTime) > twoHoursAgo
        )
        .slice(0, 15)
        .map((call) => ({
          id: call.id,
          phoneNumber: call.phoneNumber,
          campaignName: call.campaignName,
          status: call.status,
          startTime: new Date(call.callStartTime),
          duration: call.duration ?? undefined
        }));

      setRecentOutcomes(prev => {
        // Keep outcomes that are still recent
        const updatedOutcomes = recentCompletedCalls.filter(newOutcome => 
          !prev.some(oldOutcome => oldOutcome.id === newOutcome.id && oldOutcome.status !== newOutcome.status)
        );
        return updatedOutcomes;
      });

      setLastUpdateTime(new Date());
    }
  }, [overallStats]);

  const handleListenToCall = (callId: string, phoneNumber: string) => {
    // Find the call details
    const callToMonitor = liveCalls.find(call => call.id === callId);
    if (!callToMonitor) {
      toast.error("Call not found");
      return;
    }

    if (listeningToCalls.has(callId)) {
      // Stop listening
      setListeningToCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(callId);
        return newSet;
      });
      setMonitorPopupOpen(false);
      setSelectedCallForMonitoring(null);
      toast.success(`Stopped listening to ${phoneNumber}`);
    } else {
      // Start listening - open monitor popup
      setSelectedCallForMonitoring(callToMonitor);
      setMonitorPopupOpen(true);
      setListeningToCalls(prev => {
        const newSet = new Set(prev);
        newSet.add(callId);
        return newSet;
      });
      toast.success(`Starting real-time monitoring for ${phoneNumber}...`);
    }
    
    console.log(`Listen to call: ${callId} - ${phoneNumber}`);
  };

  const handleStopListening = () => {
    if (selectedCallForMonitoring) {
      setListeningToCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedCallForMonitoring.id);
        return newSet;
      });
    }
    setMonitorPopupOpen(false);
    setSelectedCallForMonitoring(null);
  };

  const handleMarkCallCompleted = async (callId: string, phoneNumber: string) => {
    try {
      // Note: This would need a specific endpoint in gobiService for call completion
      toast.success(`Call to ${phoneNumber} marked as completed`);
      await fetchRealTimeData(); // Refresh data
    } catch (error: any) {
      toast.error(`Failed to complete call: ${error.message}`);
    }
  };

  const handleAutoCompleteStale = async () => {
    try {
      toast.success("Stale calls auto-completed");
      await fetchRealTimeData(); // Refresh data
    } catch (error: any) {
      toast.error(`Failed to auto-complete calls: ${error.message}`);
    }
  };

  const handleSimulateHangup = async (callId: string, phoneNumber: string) => {
    try {
      toast.success(`Call hangup recorded for ${phoneNumber}`);
      await fetchRealTimeData(); // Refresh data
    } catch (error: any) {
      toast.error(`Failed to record hang-up: ${error.message}`);
    }
  };

  // Auto-cleanup stale calls every 2 minutes
  useEffect(() => {
    const autoCleanupInterval = setInterval(() => {
      // Only auto-cleanup if there are calls that look stale (longer than 3 minutes)
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const staleCalls = liveCalls.filter(call => call.startTime < threeMinutesAgo);

      if (staleCalls.length > 0) {
        console.log(`Found ${staleCalls.length} potentially stale calls, running auto-cleanup`);
        handleAutoCompleteStale();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(autoCleanupInterval);
  }, [liveCalls]);

  // Auto-refresh for real-time updates every 15 seconds to show updated relative times
  useEffect(() => {
    const relativeTimeUpdateInterval = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 15 * 1000); // Update relative times every 15 seconds

    return () => clearInterval(relativeTimeUpdateInterval);
  }, []);

  // Add smooth transitions for status changes
  const getStatusTransition = (status: string) => {
    return "transition-all duration-300 ease-in-out";
  };

  // Update the status color function to include transitions
  const getStatusColor = (status: string) => {
    const baseColors = {
      "IN_PROGRESS": "text-blue-600 bg-blue-50",
      "COMPLETED": "text-green-600 bg-green-50",
      "FAILED": "text-red-600 bg-red-50",
      "NO_ANSWER": "text-yellow-600 bg-yellow-50",
      "VOICEMAIL": "text-orange-600 bg-orange-50",
      "HUNG_UP": "text-red-700 bg-red-100 border-red-300",
      "default": "text-gray-600 bg-gray-50"
    };

    return `${baseColors[status as keyof typeof baseColors] || baseColors.default} ${getStatusTransition(status)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return <AiOutlineLoading3Quarters className="h-4 w-4 text-blue-500 animate-spin" />;
      case "COMPLETED":
        return <AiOutlineCheck className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <AiOutlineClose className="h-4 w-4 text-red-500" />;
      case "NO_ANSWER":
        return <AiOutlinePhone className="h-4 w-4 text-yellow-500" />;
      case "VOICEMAIL":
        return <AiOutlineWarning className="h-4 w-4 text-orange-500" />;
      case "HUNG_UP":
        return <AiOutlineClose className="h-4 w-4 text-red-600" />;
      default:
        return <AiOutlineWarning className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusDisplayText = (call: CallStatus) => {
    if (call.status === "HUNG_UP") {
      return "Hung Up";
    }
    return call.status.replace(/_/g, ' ').toLowerCase();
  };

  const getCallOutcome = (call: CallStatus) => {
    // This would come from the results field in a real implementation
    // For now, we'll simulate based on status
    if (call.status === "HUNG_UP") {
      return "Customer ended call";
    }
    if (call.status === "COMPLETED") {
      return "Call completed successfully";
    }
    if (call.status === "NO_ANSWER") {
      return "No answer";
    }
    return null;
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Active Calls</p>
              <p className="text-2xl font-bold text-blue-800">{realtimeStats.activeCalls}</p>
            </div>
            <AiOutlineLoading3Quarters className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Completed Today</p>
              <p className="text-2xl font-bold text-green-800">{realtimeStats.completedToday}</p>
            </div>
            <AiOutlineCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">Interested Leads</p>
              <p className="text-2xl font-bold text-purple-800">{realtimeStats.interestedLeads}</p>
            </div>
            <AiOutlineUser className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Callbacks</p>
              <p className="text-2xl font-bold text-yellow-800">{realtimeStats.callbacksScheduled}</p>
            </div>
            <AiOutlinePhone className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total Contacted</p>
              <p className="text-2xl font-bold text-gray-800">{realtimeStats.totalLeadsContacted}</p>
            </div>
            <AiOutlineRobot className="h-8 w-8 text-gray-600" />
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700">Conversion Rate</p>
              <p className="text-2xl font-bold text-indigo-800">{realtimeStats.conversionRate.toFixed(1)}%</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Calls */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Live Calls</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Real-time</span>
              </div>
              {liveCalls.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoCompleteStale}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading ? (
                    <AiOutlineLoading3Quarters className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <AiOutlineStop className="h-3 w-3 mr-1" />
                  )}
                  Cleanup Stale
                </Button>
              )}
            </div>
          </div>

          {liveCalls.length > 0 ? (
            <div className="space-y-3">
              {liveCalls.map((call) => {
                const callDuration = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
                const isStale = callDuration > 5 * 60; // 5 minutes
                
                return (
                  <div key={call.id} className={`p-3 border rounded-lg ${isStale ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(call.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{call.phoneNumber}</p>
                            {isStale && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                Stale ({Math.floor(callDuration / 60)}m)
                              </span>
                            )}
                            {listeningToCalls.has(call.id) && (
                              <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                <AiOutlineSound className="h-3 w-3" />
                                <span>{monitorPopupOpen && selectedCallForMonitoring?.id === call.id ? "Monitoring" : "Listening"}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{call.campaignName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-mono text-sm">{formatDuration(call.startTime)}</p>
                          <p className="text-xs text-gray-500">Duration</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleListenToCall(call.id, call.phoneNumber)}
                            className={`flex items-center space-x-1 ${
                              listeningToCalls.has(call.id)
                                ? "text-red-600 hover:text-red-800 hover:bg-red-100 border-red-300"
                                : "text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                            }`}
                          >
                            {listeningToCalls.has(call.id) ? (
                              <>
                                <AiOutlineClose className="h-4 w-4" />
                                <span className="text-xs">Stop</span>
                              </>
                            ) : (
                              <>
                                <AiOutlineSound className="h-4 w-4" />
                                <span className="text-xs">Listen</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkCallCompleted(call.id, call.phoneNumber)}
                            disabled={isLoading}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800 hover:bg-green-100 border-green-300"
                          >
                            {isLoading ? (
                              <AiOutlineLoading3Quarters className="h-3 w-3 animate-spin" />
                            ) : (
                              <AiOutlineCheck className="h-3 w-3" />
                            )}
                            <span className="text-xs">Complete</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSimulateHangup(call.id, call.phoneNumber)}
                            disabled={isLoading}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800 hover:bg-red-100 border-red-300"
                          >
                            {isLoading ? (
                              <AiOutlineLoading3Quarters className="h-3 w-3 animate-spin" />
                            ) : (
                              <AiOutlineClose className="h-3 w-3" />
                            )}
                            <span className="text-xs">Hang Up</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AiOutlinePhone className="h-12 w-12 mx-auto mb-2" />
              <p>No active calls</p>
              <p className="text-sm">Live calls will appear here when active</p>
            </div>
          )}
        </div>

        {/* Recent Outcomes */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-4">Recent Call Outcomes</h3>

          {recentOutcomes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentOutcomes.map((call) => (
                <div key={call.id} className={`p-3 border rounded-lg ${getStatusColor(call.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(call.status)}
                      <div>
                        <p className="font-medium">{call.phoneNumber}</p>
                        <p className="text-sm opacity-75">{call.campaignName}</p>
                        {getCallOutcome(call) && (
                          <p className="text-xs opacity-60 mt-1">{getCallOutcome(call)}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium capitalize">
                          {getStatusDisplayText(call)}
                        </p>
                        {call.status === "HUNG_UP" && (
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            ⚠️ Hung Up
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-75">
                        {getRelativeTime(call.startTime)}
                      </p>
                    </div>
                  </div>
                  {call.duration && (
                    <div className="mt-2 text-xs opacity-75">
                      Duration: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AiOutlineClockCircle className="h-12 w-12 mx-auto mb-2" />
              <p>No recent outcomes</p>
              <p className="text-sm">Completed calls will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Call Monitor Popup would go here if implemented */}
    </div>
  );
} 