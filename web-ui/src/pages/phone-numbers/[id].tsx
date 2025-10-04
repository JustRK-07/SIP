"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import type { PhoneNumber } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit,
  Calendar,
  Hash,
  Building2,
  Tag,
  Activity,
  Link as LinkIcon,
  Trash2,
  Settings,
  AlertCircle,
  Zap,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PhoneNumberDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchPhoneNumberDetails(id);
    }
  }, [id]);

  const fetchPhoneNumberDetails = async (phoneNumberId: string) => {
    try {
      setIsLoading(true);
      const response = await gobiService.numbers.getById(phoneNumberId);
      setPhoneNumber(response.data);
    } catch (error: any) {
      console.error('Error fetching phone number details:', error);
      toast.error('Failed to load phone number details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;

    setIsRefreshing(true);
    try {
      await fetchPhoneNumberDetails(id);
      toast.success('Phone number details refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEdit = () => {
    router.push(`/phone-numbers?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!phoneNumber) return;

    setIsDeleting(true);
    try {
      await gobiService.numbers.delete(phoneNumber.id, false);
      toast.success('Phone number deactivated successfully');
      router.push('/phone-numbers');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete phone number');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleBack = () => {
    router.push('/phone-numbers');
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

  if (!phoneNumber) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Phone number not found</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Phone Numbers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tenant = phoneNumber.tenant;

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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{phoneNumber.number}</h1>
                <Badge variant={phoneNumber.isActive ? "default" : "secondary"}>
                  {phoneNumber.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Phone Number Details</p>
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
            <Button size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <div className="flex items-center gap-2 mt-2">
                    {phoneNumber.type === 'LOCAL' ? (
                      <PhoneCall className="h-5 w-5 text-blue-500" />
                    ) : phoneNumber.type === 'TOLL_FREE' ? (
                      <PhoneIncoming className="h-5 w-5 text-green-500" />
                    ) : (
                      <PhoneOutgoing className="h-5 w-5 text-purple-500" />
                    )}
                    <span className="text-lg font-semibold">{phoneNumber.type}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-semibold">{phoneNumber.provider}</span>
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
                    {phoneNumber.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-lg font-semibold">
                      {phoneNumber.isActive ? 'Active' : 'Inactive'}
                    </span>
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
                      {new Date(phoneNumber.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Phone Number Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Phone Number Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                    <p className="text-base mt-1 font-medium">{phoneNumber.number}</p>
                  </div>
                  {phoneNumber.label && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Label</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <p className="text-base">{phoneNumber.label}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Type</Label>
                    <Badge variant="outline" className="mt-1">{phoneNumber.type}</Badge>
                  </div>
                  {phoneNumber.extension && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Extension</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <p className="text-base">{phoneNumber.extension}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium text-gray-600">Provider</Label>
                  <p className="text-base mt-1">{phoneNumber.provider}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium text-gray-600">Phone Number ID</Label>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">{phoneNumber.id}</p>
                </div>

                {tenant && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tenant</Label>
                      <div className="mt-1">
                        <p className="text-base font-medium">{tenant.name}</p>
                        <p className="text-sm text-gray-500">{tenant.domain}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Campaign Association */}
            {phoneNumber.campaignId && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Campaign Association
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Assigned to Campaign</p>
                      <p className="text-base font-medium mt-1">Campaign ID: {phoneNumber.campaignId}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${phoneNumber.campaignId}`)}
                    >
                      View Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Platform Trunk Association */}
            {phoneNumber.platformTrunkId && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Platform Trunk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Connected to Platform Trunk</p>
                    <p className="text-xs font-mono bg-white p-2 rounded mt-2 break-all">
                      {phoneNumber.platformTrunkId}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="space-y-6">
            {/* Usage Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Total Calls</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <PhoneIncoming className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Inbound</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <PhoneOutgoing className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">Outbound</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">0</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Status</span>
                  <Badge variant={phoneNumber.isActive ? "default" : "secondary"}>
                    {phoneNumber.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Campaign Assigned</span>
                  <Badge variant={phoneNumber.campaignId ? "default" : "outline"}>
                    {phoneNumber.campaignId ? "Yes" : "No"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Platform Trunk</span>
                  <Badge variant={phoneNumber.platformTrunkId ? "default" : "outline"}>
                    {phoneNumber.platformTrunkId ? "Connected" : "Not Connected"}
                  </Badge>
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
                  <p className="text-sm mt-1">{new Date(phoneNumber.createdAt).toLocaleString()}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <p className="text-sm mt-1">{new Date(phoneNumber.updatedAt).toLocaleString()}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tenant ID</Label>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">{phoneNumber.tenantId}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the phone number "{phoneNumber.number}".
                The number will be marked as inactive but can be reactivated later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>;
}
