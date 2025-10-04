"use client";

import { useState, useEffect } from "react";
import { gobiService } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Users,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Square
} from "lucide-react";

interface DashboardStats {
  totalCalls: number;
  activeCalls: number;
  totalAgents: number;
  activeAgents: number;
  totalNumbers: number;
  availableNumbers: number;
  conversionRate: number;
  averageDuration: number;
}

interface LiveCall {
  id: string;
  phoneNumber: string;
  agentName: string;
  status: string;
  duration: number;
  startTime: Date;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    activeCalls: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalNumbers: 0,
    availableNumbers: 0,
    conversionRate: 0,
    averageDuration: 0,
  });

  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const [campaignStats, agentStats, numberStats] = await Promise.all([
        gobiService.campaigns.getStats(),
        gobiService.agents.getStats(),
        gobiService.numbers.getStats(),
      ]);

      setStats({
        totalCalls: campaignStats.totalCampaigns || 0,
        activeCalls: campaignStats.activeCampaigns || 0,
        totalAgents: agentStats.totalAgents || 0,
        activeAgents: agentStats.activeAgents || 0,
        totalNumbers: numberStats.totalNumbers || 0,
        availableNumbers: numberStats.availableNumbers || 0,
        conversionRate: 0, // Not available in current API
        averageDuration: 0, // Not available in current API
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch and refresh every 5 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500";
      case "INACTIVE": return "bg-gray-500";
      case "DEPLOYING": return "bg-yellow-500";
      case "ERROR": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return <CheckCircle className="h-4 w-4" />;
      case "INACTIVE": return <XCircle className="h-4 w-4" />;
      case "DEPLOYING": return <Clock className="h-4 w-4" />;
      case "ERROR": return <AlertCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time monitoring and control center</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRefreshing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {isRefreshing ? 'Live' : 'Connected'}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Calls */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last hour
              </p>
            </CardContent>
          </Card>

          {/* Active Calls */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeCalls}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAgents}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalAgents} total agents
              </p>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+2.1%</span> from yesterday
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Calls */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Live Calls</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {liveCalls.length} Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time call monitoring and control
                </CardDescription>
              </CardHeader>
              <CardContent>
                {liveCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No active calls</p>
                    <p className="text-sm text-gray-400">Calls will appear here when campaigns are running</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveCalls.map((call) => (
                      <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <div>
                            <p className="font-medium">{call.phoneNumber}</p>
                            <p className="text-sm text-gray-600">Agent: {call.agentName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDuration(call.duration)}</p>
                            <p className="text-xs text-gray-500">Duration</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Pause className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Square className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current system health and performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Status */}
                <div>
                  <h4 className="font-medium mb-2">Agent Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Agents</span>
                      <Badge className="bg-green-100 text-green-800">
                        {stats.activeAgents}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Inactive Agents</span>
                      <Badge variant="secondary">
                        {stats.totalAgents - stats.activeAgents}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Phone Numbers */}
                <div>
                  <h4 className="font-medium mb-2">Phone Numbers</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Available</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {stats.availableNumbers}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assigned</span>
                      <Badge variant="secondary">
                        {stats.totalNumbers - stats.availableNumbers}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="font-medium mb-2">Performance</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg. Duration</span>
                      <span className="text-sm font-medium">
                        {formatDuration(stats.averageDuration)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conversion Rate</span>
                      <span className="text-sm font-medium text-green-600">
                        {stats.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button className="w-full" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Start Campaign
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause All
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <Square className="h-4 w-4 mr-2" />
                      Emergency Stop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
