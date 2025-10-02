import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import type { Agent } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bot,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  MessageSquare,
  Star,
  Calendar,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function AgentAnalytics() {
  const router = useRouter();
  const { id } = router.query;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchAgentData(id);
    }
  }, [id, selectedPeriod, currentPage]);

  const fetchAgentData = async (agentId: string) => {
    try {
      setIsLoading(true);
      const [agentData, analyticsData, performanceData, conversationsData] = await Promise.all([
        gobiService.agents.getById(agentId),
        gobiService.agents.getAnalytics(agentId),
        gobiService.agents.getPerformance(agentId, selectedPeriod),
        gobiService.agents.getConversations(agentId, { page: currentPage, limit: 10 }),
      ]);

      setAgent(agentData);
      setAnalytics(analyticsData);
      setPerformance(performanceData);
      setConversations(conversationsData.conversations || []);
      setPagination(conversationsData.pagination || null);
    } catch (error: any) {
      console.error('Error fetching agent analytics:', error);
      toast.error('Failed to load agent analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;

    setIsRefreshing(true);
    try {
      await fetchAgentData(id);
      toast.success('Analytics refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBack = () => {
    router.push('/agents');
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Agent not found</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
                <Badge variant={agent.status === 'ACTIVE' ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Agent Analytics & Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Calls</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{analytics?.totalCalls || 0}</span>
                  </div>
                </div>
                <Activity className="h-8 w-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{analytics?.successRate || 0}%</span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{analytics?.avgCallDuration || 0}s</span>
                  </div>
                </div>
                <Clock className="h-8 w-8 text-purple-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Satisfaction</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{analytics?.customerSatisfaction || 0}/5</span>
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Performance & Conversations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Metrics */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics - {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Calls Made</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{performance.callsMade || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Successful Calls</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{performance.successfulCalls || 0}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Failed Calls</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{performance.failedCalls || 0}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">{performance.avgDuration || 0}s</p>
                      </div>
                    </div>
                    {performance.details && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 mb-2">Additional Metrics</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Resolution Rate:</span>
                            <span className="font-medium">{performance.details.resolutionRate || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Customer Satisfaction:</span>
                            <span className="font-medium">{performance.details.satisfaction || 0}/5</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Conversations */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Conversations
                  </CardTitle>
                  <Badge variant="secondary">{conversations.length} of {pagination?.totalItems || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {conversations.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conversations.map((conversation) => (
                          <TableRow key={conversation.id}>
                            <TableCell className="text-sm">
                              {new Date(conversation.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{conversation.lead?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{conversation.lead?.phone || 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {conversation.campaign?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {conversation.duration ? `${conversation.duration}s` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {conversation.status === 'COMPLETED' ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </Badge>
                              ) : conversation.status === 'FAILED' ? (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">{conversation.status}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                          disabled={currentPage === pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No conversations yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Agent Info & Peak Hours */}
          <div className="space-y-6">
            {/* Agent Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agent Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Name</Label>
                  <p className="text-base mt-1">{agent.name}</p>
                </div>
                {agent.description && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <p className="text-sm mt-1">{agent.description}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <Badge variant={agent.status === 'ACTIVE' ? "default" : "secondary"}>
                      {agent.status}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Type</Label>
                  <p className="text-sm mt-1">{agent.type || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Peak Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.peakHours && analytics.peakHours.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.peakHours.map((peak: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{peak.hour}:00 - {peak.hour + 1}:00</span>
                        </div>
                        <Badge variant="outline">{peak.calls} calls</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No peak hours data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Agent ID</Label>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">{agent.id}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created At</Label>
                  <p className="text-sm mt-1">{new Date(agent.createdAt).toLocaleString()}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <p className="text-sm mt-1">{new Date(agent.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>;
}
