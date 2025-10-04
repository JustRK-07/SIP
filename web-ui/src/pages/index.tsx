"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { gobiService } from "@/services/gobiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AiOutlineWarning,
  AiOutlinePlus,
  AiOutlinePlayCircle,
  AiOutlinePauseCircle,
  AiOutlineEdit,
  AiOutlineShoppingCart,
  AiOutlineEye,
  AiOutlineUser,
  AiOutlineRobot,
} from "react-icons/ai";
import { 
  Phone, 
  BarChart3,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { RealTimeDashboard } from "@/components/RealTimeDashboard";
import { AgentStatus } from "@/components/AgentStatus";
import Link from "next/link";


export default function Dashboard() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseCountry, setPurchaseCountry] = useState("US");
  const [purchaseAreaCode, setPurchaseAreaCode] = useState("");

  // State for dashboard data
  const [overallStats, setOverallStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [numbersStats, setNumbersStats] = useState<any>(null);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [agentsStats, setAgentsStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel
      const [
        campaignsResponse,
        numbersResponse,
        numbersStatsResponse,
        agentsResponse,
        agentsStatsResponse
      ] = await Promise.all([
        gobiService.campaigns.getAll(),
        gobiService.numbers.getAll(),
        gobiService.numbers.getStats(),
        gobiService.agents.getAll(),
        gobiService.agents.getStats()
      ]);

      setCampaigns(campaignsResponse?.data || []);
      setNumbers(numbersResponse?.data || []);
      setNumbersStats(numbersStatsResponse || {});
      setAgents(agentsResponse?.agents || []);
      setAgentsStats(agentsStatsResponse || {});

      // Calculate overall stats
      const campaignsData = campaignsResponse?.data || [];
      const totalCalls = campaignsData.reduce((sum: number, campaign: any) => sum + (campaign.totalCalls || 0), 0);
      const successfulCalls = campaignsData.reduce((sum: number, campaign: any) => sum + (campaign.successfulCalls || 0), 0);
      const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      setOverallStats({
        totalCalls,
        successfulCalls,
        conversionRate,
        totalCampaigns: campaignsData.length,
        activeCampaigns: campaignsData.filter((c: any) => c.isActive).length
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchDashboardData();

      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchDashboardData, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  // Quick actions
  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await gobiService.campaigns.update(campaignId, { isActive: status === 'ACTIVE' });
      toast.success("Campaign status updated!");
      await fetchDashboardData();
    } catch (error: any) {
      toast.error(`Failed to update campaign: ${error.message}`);
    }
  };

  const handlePurchaseNumber = async () => {
    if (!purchaseAreaCode) {
      toast.error("Please enter an area code");
      return;
    }

    try {
      setIsPurchasing(true);
      const purchaseData = {
        country: purchaseCountry,
        areaCode: purchaseAreaCode,
        capabilities: ['voice']
      };

      await gobiService.numbers.create(purchaseData);
      toast.success("Phone number purchased successfully!");
      setShowPurchaseModal(false);
      setPurchaseAreaCode("");
      await fetchDashboardData();
    } catch (error: any) {
      toast.error(`Failed to purchase number: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleQuickStatusUpdate = (campaignId: string, status: "ACTIVE" | "PAUSED") => {
    handleUpdateCampaignStatus(campaignId, status);
  };

  // Calculate summary statistics
  const todayStats = {
    totalCalls: overallStats?.totalCalls || 0,
    completedCalls: overallStats?.successfulCalls || 0,
    successRate: overallStats?.conversionRate ? overallStats.conversionRate.toFixed(1) : "0",
    activeCampaigns: campaigns?.filter(c => c.isActive).length || 0
  };

  return (
    <>
      <Head>
        <title>Campaign Management</title>
        <meta name="description" content="Professional Campaign Management Dashboard" />
      </Head>
      <main className="container mx-auto p-6">
        {/* Professional Dashboard Header */}
        <div className="mb-8">
          <div className="rounded-2xl ">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <AgentStatus />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Stats Overview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Calls Today */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Total Calls Today</CardTitle>
                <Phone className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {isLoading ? "..." : todayStats.totalCalls.toLocaleString()}
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                  <p className="text-xs text-blue-700">Live tracking</p>
                </div>
              </CardContent>
            </Card>

            {/* Successful Calls */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Successful Calls</CardTitle>
                <Zap className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {isLoading ? "..." : todayStats.completedCalls.toLocaleString()}
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <p className="text-xs text-green-700">{todayStats.successRate}% success rate</p>
                </div>
              </CardContent>
            </Card>

            {/* Active Campaigns */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Active Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {isLoading ? "..." : todayStats.activeCampaigns}
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                  <p className="text-xs text-purple-700">Running now</p>
                </div>
              </CardContent>
            </Card>

            {/* Live Agents */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Live Agents</CardTitle>
                <AiOutlineRobot className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">
                  {isLoading ? "..." : (agentsStats?.activeAgents || 0)}
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                  <p className="text-xs text-orange-700">AI agents online</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Real-time Dashboard Component */}
        <div className="mb-8">
          <RealTimeDashboard />
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Start Guide */}
     
            {/* Active Agents */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Agents</h3>
                  <p className="text-sm text-gray-500 mt-1">Your AI agents with their current status and call statistics</p>
                </div>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Live</span>
                </div>
              </div>
              
              {agents && agents.length > 0 ? (
                <div className="space-y-3">
                  {agents.slice(0, 3).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          agent.status === "ACTIVE" ? "bg-green-500 animate-pulse" : 
                          agent.status === "INACTIVE" ? "bg-gray-400" :
                          "bg-yellow-500"
                        }`}></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{agent.name}</h4>
                          <p className="text-sm text-gray-500">{agent.model} • {agent.voice} • {agent.totalConversations || 0} calls</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          agent.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                          agent.status === "INACTIVE" ? "bg-gray-100 text-gray-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {agent.status}
                        </span>
                        <Link href="/agents">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                            Manage →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
                    <AiOutlineRobot className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No agents yet. Create your first AI agent to get started!</p>
                </div>
              )}
            </div>
          </div>


            {/* Professional Phone Number Management */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Phone Numbers</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage your calling infrastructure</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <AiOutlineShoppingCart className="h-4 w-4 mr-2" />
                  Purchase
                </Button>
              </div>
              
              {/* Professional Phone Numbers List */}
              <div className="space-y-3 mb-6">
                {numbers?.slice(0, 3).map((number) => (
                  <div key={number.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all duration-300">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{number.number}</p>
                      <p className="text-xs text-gray-600">{number.country} • ${number.monthlyCost}/mo</p>
                    </div>
                    <Badge className={number.status === "AVAILABLE" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                      {number.status}
                    </Badge>
                  </div>
                ))}
                {(!numbers || numbers.length === 0) && (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No phone numbers purchased yet</p>
                  </div>
                )}
              </div>
              
              <Link href="/number-management">
                <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                  <AiOutlineEye className="h-4 w-4 mr-2" />
                  View All Numbers
                </Button>
              </Link>
            </div>

          </div>

        {/* Purchase Number Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Purchase Phone Number</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={purchaseCountry}
                    onChange={(e) => setPurchaseCountry(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area Code (optional)
                  </label>
                  <input
                    type="text"
                    value={purchaseAreaCode}
                    onChange={(e) => setPurchaseAreaCode(e.target.value)}
                    placeholder="e.g., 555"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchaseNumber}
                  disabled={isPurchasing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPurchasing ? "Purchasing..." : "Purchase Number"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
