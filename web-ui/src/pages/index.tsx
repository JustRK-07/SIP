import { useState } from "react";
import Head from "next/head";
import { api } from "@/utils/api";
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

  // Fetch overall stats for dashboard
  const { data: overallStats } = api.campaign.getOverallStats.useQuery(
    undefined,
    { 
      refetchInterval: 10000, // Refresh every 10 seconds
      refetchOnWindowFocus: true
    }
  );

  // Fetch campaigns for quick management
  const { data: campaigns } = api.campaign.getAll.useQuery();

  // Fetch numbers stats and data
  const { data: numbersStats } = api.numbers.getStats.useQuery();
  const { data: numbers } = api.numbers.getAll.useQuery();

  // Fetch agents stats and data
  const { data: agentsStats } = api.agents.getStats.useQuery();
  const { data: agents } = api.agents.getAll.useQuery();

  // Mutations for quick actions
  const { mutate: updateStatus } = api.campaign.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Campaign status updated!");
    },
  });

  // Twilio number purchase mutation
  const { mutate: purchaseNumber, isPending: isPurchasing } = api.numbers.purchase.useMutation({
    onSuccess: () => {
      toast.success("Phone number purchased successfully!");
      setShowPurchaseModal(false);
      setPurchaseAreaCode("");
    },
    onError: (error) => {
      toast.error(`Failed to purchase number: ${error.message}`);
    },
  });

  const handlePurchaseNumber = () => {
    if (!purchaseAreaCode) {
      toast.error("Please enter an area code");
      return;
    }
    
    // For now, we'll use a placeholder number and let the backend handle the real purchase
    // The backend will search for available numbers and purchase one
    purchaseNumber({
      phoneNumber: `+1${purchaseAreaCode}0000000`, // Placeholder - backend will replace with real number
      friendlyName: `Purchased Number ${purchaseAreaCode}`,
      capabilities: ["voice", "sms"],
    });
  };


  const handleQuickStatusUpdate = (campaignId: string, status: "ACTIVE" | "PAUSED") => {
    updateStatus({ id: campaignId, status });
  };

  // Calculate summary statistics
  const todayStats = {
    totalCalls: overallStats?.totalCalls || 0,
    completedCalls: overallStats?.completedCalls || 0,
    successRate: overallStats?.successRate ? (overallStats.successRate * 100).toFixed(1) : "0",
    activeCampaigns: campaigns?.filter(c => c.status === "ACTIVE").length || 0
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
                          <p className="text-sm text-gray-500">{agent.model} • {agent.voice} • {agent._count.conversations} calls</p>
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
