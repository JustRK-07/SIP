"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import type { Campaign, PhoneNumber } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Phone,
  Users,
  BarChart3,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit,
  PhoneIncoming,
  PhoneOutgoing,
  Wifi,
  Bot,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  PhoneCall,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Test call states
  const [isTestCallDialogOpen, setIsTestCallDialogOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<{
    callSid?: string;
    status?: string;
    from?: string;
    to?: string;
  } | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchCampaignDetails(id);
    }
  }, [id]);

  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const response = await gobiService.campaigns.getById(campaignId);
      setCampaign(response.data);
    } catch (error: any) {
      console.error('Error fetching campaign details:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;

    setIsRefreshing(true);
    try {
      await fetchCampaignDetails(id);
      toast.success('Campaign details refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEdit = () => {
    router.push(`/campaigns?edit=${id}`);
  };

  const handleBack = () => {
    router.push('/campaigns');
  };

  const handleTestCall = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsInitiatingCall(true);
    try {
      const response = await gobiService.campaigns.initiateTestCall(
        campaign!.id,
        testPhoneNumber
      );

      setCurrentCall({
        callSid: response.data.callSid,
        status: response.data.status,
        from: response.data.from,
        to: response.data.to,
      });

      toast.success('Test call initiated successfully!');
    } catch (error: any) {
      console.error('Error initiating test call:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to initiate test call');
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleEndCall = async () => {
    if (!currentCall?.callSid) return;

    try {
      await gobiService.campaigns.endTestCall(campaign!.id, currentCall.callSid);
      toast.success('Call ended successfully');
      setCurrentCall(null);
      setTestPhoneNumber('');
      setIsTestCallDialogOpen(false);
    } catch (error: any) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleCloseTestCallDialog = () => {
    if (currentCall && currentCall.status !== 'completed') {
      if (confirm('There is an active call. Do you want to end it?')) {
        handleEndCall();
      }
    } else {
      setIsTestCallDialogOpen(false);
      setCurrentCall(null);
      setTestPhoneNumber('');
    }
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

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Campaign not found</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const phoneNumbers = campaign.phoneNumbers || [];
  const agents = campaign.agents || [];
  const tenant = campaign.tenant;

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
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Campaign Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTestCallDialogOpen(true)}
              disabled={!campaign?.phoneNumbers?.length || !campaign?.agents?.length}
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Test Call
            </Button>
            <Button size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <div className="flex items-center gap-2 mt-2">
                    {campaign.campaignType === 'INBOUND' ? (
                      <PhoneIncoming className="h-5 w-5 text-blue-500" />
                    ) : (
                      <PhoneOutgoing className="h-5 w-5 text-purple-500" />
                    )}
                    <span className="text-lg font-semibold">{campaign.campaignType}</span>
                  </div>
                </div>
                <Badge variant={campaign.isActive ? "default" : "secondary"}>
                  {campaign.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Phone Numbers</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    <span className="text-lg font-semibold">{phoneNumbers.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Agents</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-semibold">{agents.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    {campaign.status === 'ACTIVE' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="text-lg font-semibold">{campaign.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-semibold">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Campaign Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Name</Label>
                  <p className="text-base mt-1">{campaign.name}</p>
                </div>
                {campaign.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="text-base mt-1">{campaign.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Campaign ID</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1">{campaign.id}</p>
                </div>
                {tenant && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tenant</Label>
                    <div className="mt-1">
                      <p className="text-base font-medium">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.domain}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phone Numbers */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Assigned Phone Numbers
                  </CardTitle>
                  <Badge variant="secondary">{phoneNumbers.length} Total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {phoneNumbers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Friendly Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phoneNumbers.map((number) => (
                        <TableRow key={number.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {number.number}
                            </div>
                          </TableCell>
                          <TableCell>
                            {number.friendlyName || 'N/A'}
                          </TableCell>
                          <TableCell>{number.country || 'N/A'}</TableCell>
                          <TableCell>
                            {number.status === 'ACTIVE' ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                {number.status || 'Inactive'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No phone numbers assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned Agents */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Assigned Agents
                  </CardTitle>
                  <Badge variant="secondary">{agents.length} Total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {agents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Voice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((campaignAgent) => (
                        <TableRow key={campaignAgent.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              {campaignAgent.agent.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{campaignAgent.agent.model || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{campaignAgent.agent.voice || 'N/A'}</TableCell>
                          <TableCell>
                            {campaignAgent.agent.status === 'ACTIVE' ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                {campaignAgent.agent.status || 'Inactive'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{campaignAgent.priority}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No agents assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="space-y-6">
            {/* Campaign Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campaign Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Total Calls</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Successful</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">0</span>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created At</Label>
                  <p className="text-sm mt-1">{new Date(campaign.createdAt).toLocaleString()}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <p className="text-sm mt-1">{new Date(campaign.updatedAt).toLocaleString()}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tenant ID</Label>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">{campaign.tenantId}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Test Call Dialog */}
        <Dialog open={isTestCallDialogOpen} onOpenChange={handleCloseTestCallDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Test Call
              </DialogTitle>
              <DialogDescription>
                Make a test call to verify your campaign configuration. The AI agent will automatically join the call.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!currentCall ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Destination Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+1234567890"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      disabled={isInitiatingCall}
                    />
                    <p className="text-xs text-gray-500">
                      Enter the phone number in E.164 format (e.g., +1234567890)
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-blue-900">Campaign Information</p>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Caller ID:</span>
                        <span className="font-mono font-medium">
                          {phoneNumbers[0]?.number || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI Agent:</span>
                        <span className="font-medium">
                          {agents[0]?.agent?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600 animate-pulse" />
                      <p className="text-sm font-medium text-green-900">Call In Progress</p>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>From:</span>
                        <span className="font-mono font-medium">{currentCall.from}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>To:</span>
                        <span className="font-mono font-medium">{currentCall.to}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge variant="default">{currentCall.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Call SID:</span>
                        <span className="font-mono text-xs">{currentCall.callSid}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      The AI agent has joined the call and is ready to converse. Answer the phone to start the conversation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {!currentCall ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCloseTestCallDialog}
                    disabled={isInitiatingCall}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTestCall}
                    disabled={isInitiatingCall || !testPhoneNumber.trim()}
                  >
                    {isInitiatingCall ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      <>
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Start Call
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="destructive" onClick={handleEndCall}>
                  <XCircle className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
