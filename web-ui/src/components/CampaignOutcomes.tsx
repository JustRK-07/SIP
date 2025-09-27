import { useMemo } from "react";
import { 
  AiOutlineCheck, 
  AiOutlineClose, 
  AiOutlinePhone, 
  AiOutlineLoading3Quarters,
  AiOutlineUser,
  AiOutlineWarning
} from "react-icons/ai";

type Outcome = {
  type: string;
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
  description: string;
};

type CampaignOutcomesProps = {
  outcomes: Record<string, number>;
  totalCalls: number;
  callStatuses?: Record<string, number>;
  realtimeData?: {
    activeCallsCount: number;
    completedToday: number;
    callbacksScheduled: number;
  };
};

export function CampaignOutcomes({ 
  outcomes, 
  totalCalls, 
  callStatuses = {},
  realtimeData 
}: CampaignOutcomesProps) {
  
  const getOutcomeConfig = (outcomeType: string): Pick<Outcome, 'color' | 'icon' | 'description'> => {
    switch (outcomeType.toLowerCase()) {
      case 'interested':
      case 'transferred_to_agent':
        return {
          color: 'bg-green-500',
          icon: <AiOutlineCheck className="h-4 w-4" />,
          description: 'Lead showed interest and was transferred to human agent'
        };
      case 'not_interested':
        return {
          color: 'bg-red-500',
          icon: <AiOutlineClose className="h-4 w-4" />,
          description: 'Lead explicitly declined loan offer'
        };
      case 'callback_requested':
      case 'callback_scheduled':
        return {
          color: 'bg-yellow-500',
          icon: <AiOutlinePhone className="h-4 w-4" />,
          description: 'Lead requested a callback at preferred time'
        };
      case 'voicemail':
        return {
          color: 'bg-orange-500',
          icon: <AiOutlineWarning className="h-4 w-4" />,
          description: 'Call went to voicemail - message left'
        };
      case 'no_answer':
        return {
          color: 'bg-gray-500',
          icon: <AiOutlineClose className="h-4 w-4" />,
          description: 'Call was not answered'
        };
      case 'hung_up':
        return {
          color: 'bg-red-400',
          icon: <AiOutlineClose className="h-4 w-4" />,
          description: 'Recipient hung up during conversation'
        };
      case 'in_progress':
      case 'active':
        return {
          color: 'bg-blue-500',
          icon: <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />,
          description: 'Call currently in progress'
        };
      default:
        return {
          color: 'bg-gray-400',
          icon: <AiOutlineWarning className="h-4 w-4" />,
          description: 'Unknown outcome'
        };
    }
  };

  const processedOutcomes = useMemo(() => {
    return Object.entries(outcomes)
      .map(([outcomeType, count]) => {
        const config = getOutcomeConfig(outcomeType);
        return {
          type: outcomeType,
          count,
          percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
          ...config
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [outcomes, totalCalls]);

  const callStatusSummary = useMemo(() => {
    if (!Object.keys(callStatuses).length) return [];
    
    return Object.entries(callStatuses)
      .map(([status, count]) => {
        const config = getOutcomeConfig(status);
        return {
          type: status,
          count,
          percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
          ...config
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [callStatuses, totalCalls]);

  const interestRate = useMemo(() => {
    const interestedCount = outcomes.interested || outcomes.transferred_to_agent || 0;
    return totalCalls > 0 ? Math.round((interestedCount / totalCalls) * 100) : 0;
  }, [outcomes, totalCalls]);

  const callbackRate = useMemo(() => {
    const callbackCount = outcomes.callback_requested || outcomes.callback_scheduled || 0;
    return totalCalls > 0 ? Math.round((callbackCount / totalCalls) * 100) : 0;
  }, [outcomes, totalCalls]);

  return (
    <div className="space-y-6">
      {/* Real-time Status Summary */}
      {realtimeData && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Live Campaign Status</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AiOutlineLoading3Quarters className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                <span className="text-2xl font-bold text-blue-600">{realtimeData.activeCallsCount}</span>
              </div>
              <p className="text-sm text-blue-700">Active Calls</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AiOutlineCheck className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-2xl font-bold text-green-600">{realtimeData.completedToday}</span>
              </div>
              <p className="text-sm text-green-700">Completed Today</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AiOutlinePhone className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-2xl font-bold text-yellow-600">{realtimeData.callbacksScheduled}</span>
              </div>
              <p className="text-sm text-yellow-700">Callbacks Scheduled</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Interest Rate</p>
              <p className="text-2xl font-bold text-green-800">{interestRate}%</p>
            </div>
            <AiOutlineUser className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Callback Rate</p>
              <p className="text-2xl font-bold text-yellow-800">{callbackRate}%</p>
            </div>
            <AiOutlinePhone className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Detailed Outcomes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Campaign Results Breakdown</h3>
        
        {processedOutcomes.length > 0 ? (
          <div className="space-y-3">
            {processedOutcomes.map((outcome) => (
              <div key={outcome.type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {outcome.icon}
                    <span className="font-medium capitalize">
                      {outcome.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-semibold">
                    {outcome.count} ({outcome.percentage}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${outcome.color} transition-all duration-300`}
                    style={{ width: `${outcome.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">{outcome.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AiOutlineWarning className="h-12 w-12 mx-auto mb-2" />
            <p>No call outcomes recorded yet</p>
            <p className="text-sm">Results will appear here after calls are completed</p>
          </div>
        )}
      </div>

      {/* Call Status Summary */}
      {callStatusSummary.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Call Status Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {callStatusSummary.map((status) => (
              <div key={status.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {status.icon}
                  <span className="capitalize text-sm">
                    {status.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="font-semibold text-sm">
                  {status.count} ({status.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Campaign Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Total Calls:</span>
            <span className="font-semibold ml-2">{totalCalls}</span>
          </div>
          <div>
            <span className="text-gray-600">Success Rate:</span>
            <span className="font-semibold ml-2">
              {totalCalls > 0 ? Math.round(((outcomes.interested || 0) + (outcomes.callback_requested || 0)) / totalCalls * 100) : 0}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Contact Rate:</span>
            <span className="font-semibold ml-2">
              {totalCalls > 0 ? Math.round((totalCalls - (outcomes.no_answer || 0)) / totalCalls * 100) : 0}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Conversion:</span>
            <span className="font-semibold ml-2">{interestRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
} 