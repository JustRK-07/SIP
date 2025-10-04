"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { gobiService } from "@/services/gobiService";
import type { PhoneNumber } from "@/services/gobiService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Plus,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
  Trash2,
  PhoneIncoming,
  PhoneOutgoing,
  Globe,
  DollarSign,
  MapPin,
  ShoppingCart,
  Check,
  X,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
  price?: string;
  priceUnit?: string;
}

export default function PhoneNumbers() {
  const router = useRouter();
  const { tenantId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Phone numbers data
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);

  // Search criteria for available numbers
  const [searchCriteria, setSearchCriteria] = useState({
    areaCode: "",
    contains: "",
    type: "LOCAL",
    country: "US",
    limit: 20
  });

  // Selected number for purchase
  const [selectedNumber, setSelectedNumber] = useState<AvailablePhoneNumber | null>(null);

  // Fetch owned phone numbers
  const fetchPhoneNumbers = async () => {
    setIsLoading(true);
    try {
      const response = await gobiService.numbers.getAll();
      setPhoneNumbers(response.data || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast.error('Failed to fetch phone numbers');
    } finally {
      setIsLoading(false);
    }
  };

  // Search for available phone numbers
  const searchAvailableNumbers = async () => {
    setIsSearching(true);
    try {
      const response = await gobiService.numbers.getAvailable(searchCriteria);
      const numbers = response.data || [];
      setAvailableNumbers(numbers);
      if (numbers.length === 0) {
        toast.error('No available numbers found with these criteria');
      } else {
        toast.success(`Found ${numbers.length} available numbers`);
      }
    } catch (error) {
      console.error('Error searching available numbers:', error);
      toast.error('Failed to search available numbers');
    } finally {
      setIsSearching(false);
    }
  };

  // Purchase a phone number
  const handlePurchaseNumber = async (number: AvailablePhoneNumber) => {
    if (!confirm(`Purchase ${number.phoneNumber} for ${number.price} ${number.priceUnit}?`)) {
      return;
    }

    setIsPurchasing(true);
    try {
      await gobiService.numbers.create({ number: number.phoneNumber });
      toast.success(`Successfully purchased ${number.phoneNumber}!`);
      setPurchaseDialogOpen(false);
      setAvailableNumbers([]);
      await fetchPhoneNumbers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase phone number');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Delete a phone number
  const handleDeleteNumber = async (numberId: string, phoneNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${phoneNumber}?\n\nThis will release the number from Twilio.`)) {
      return;
    }

    try {
      await gobiService.numbers.delete(numberId, true);
      toast.success(`Successfully deleted ${phoneNumber}`);
      await fetchPhoneNumbers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete phone number');
    }
  };

  useEffect(() => {
    // Only fetch on client side
    if (typeof window !== 'undefined') {
      fetchPhoneNumbers();
    }
  }, []);

  // Filter phone numbers
  const filteredNumbers = phoneNumbers?.filter((number) => {
    const matchesSearch = number.number.includes(searchTerm) ||
                          number.friendlyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ||
                          (statusFilter === "AVAILABLE" && number.status === "AVAILABLE") ||
                          (statusFilter === "ASSIGNED" && number.assignedAgentId);
    return matchesSearch && matchesStatus;
  });

  // Stats calculations
  const totalNumbers = phoneNumbers?.length || 0;
  const availableNumbersCount = phoneNumbers?.filter(n => n.status === "AVAILABLE").length || 0;
  const assignedNumbers = phoneNumbers?.filter(n => n.assignedAgentId).length || 0;
  const totalMonthlyCost = phoneNumbers?.reduce((sum, n) => sum + (n.monthlyCost || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phone Number Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your phone numbers for campaigns</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPhoneNumbers()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Purchase Number
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Purchase Phone Number</DialogTitle>
                  <DialogDescription>
                    Search and purchase new phone numbers from Twilio
                  </DialogDescription>
                </DialogHeader>

                {/* Search Criteria */}
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Area Code</Label>
                      <Input
                        placeholder="e.g., 555"
                        value={searchCriteria.areaCode}
                        onChange={(e) => setSearchCriteria({...searchCriteria, areaCode: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Contains</Label>
                      <Input
                        placeholder="e.g., 1234"
                        value={searchCriteria.contains}
                        onChange={(e) => setSearchCriteria({...searchCriteria, contains: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={searchCriteria.type} onValueChange={(value) => setSearchCriteria({...searchCriteria, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOCAL">Local</SelectItem>
                          <SelectItem value="MOBILE">Mobile</SelectItem>
                          <SelectItem value="TOLL_FREE">Toll Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Select value={searchCriteria.country} onValueChange={(value) => setSearchCriteria({...searchCriteria, country: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max Results</Label>
                      <Input
                        type="number"
                        value={searchCriteria.limit}
                        onChange={(e) => setSearchCriteria({...searchCriteria, limit: parseInt(e.target.value) || 20})}
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={searchAvailableNumbers}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Available Numbers
                      </>
                    )}
                  </Button>
                </div>

                {/* Available Numbers List */}
                {availableNumbers.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold">Available Numbers ({availableNumbers.length})</h3>
                    <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                      {availableNumbers.map((number, idx) => (
                        <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium">{number.phoneNumber}</span>
                              <Badge variant="outline" className="text-xs">
                                {number.locality}, {number.region}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              {number.capabilities.voice && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />Voice</span>}
                              {number.capabilities.SMS && <span>SMS</span>}
                              {number.capabilities.MMS && <span>MMS</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">{number.price}</p>
                              <p className="text-xs text-gray-500">{number.priceUnit}/mo</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseNumber(number)}
                              disabled={isPurchasing}
                            >
                              {isPurchasing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Numbers</p>
                  <p className="text-xl font-semibold">{totalNumbers}</p>
                </div>
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Available</p>
                  <p className="text-xl font-semibold text-green-600">{availableNumbersCount}</p>
                </div>
                <Check className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Assigned</p>
                  <p className="text-xl font-semibold text-blue-600">{assignedNumbers}</p>
                </div>
                <PhoneOutgoing className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Monthly Cost</p>
                  <p className="text-xl font-semibold">${totalMonthlyCost.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Phone Numbers</CardTitle>
                <CardDescription className="text-xs">
                  Your purchased phone numbers from Twilio
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search numbers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredNumbers?.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No phone numbers found</p>
                <p className="text-sm text-gray-400 mt-1">Purchase your first number to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Monthly Cost</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Trunk Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNumbers?.map((number) => (
                    <TableRow key={number.id}>
                      <TableCell className="font-medium font-mono">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{number.number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={number.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                          {number.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          {number.capabilities?.includes('voice') && (
                            <Badge variant="outline" className="text-xs">Voice</Badge>
                          )}
                          {number.capabilities?.includes('sms') && (
                            <Badge variant="outline" className="text-xs">SMS</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {number.region || number.country || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {number.callDirection === 'BOTH' ? (
                            <>
                              <PhoneIncoming className="h-3 w-3 text-green-500" />
                              <PhoneOutgoing className="h-3 w-3 text-blue-500" />
                            </>
                          ) : number.callDirection === 'INBOUND' ? (
                            <PhoneIncoming className="h-3 w-3 text-green-500" />
                          ) : (
                            <PhoneOutgoing className="h-3 w-3 text-blue-500" />
                          )}
                          <span className="text-xs">{number.callDirection}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${number.monthlyCost?.toFixed(2) || '0.00'}</span>
                      </TableCell>
                      <TableCell>
                        {number.campaignId ? (
                          <Badge variant="outline">Assigned</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {number.platformTrunk ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-gray-600">{number.platformTrunk.name || 'Connected'}</span>
                          </div>
                        ) : number.livekitTrunk ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            <span className="text-xs text-gray-600">LiveKit {number.livekitTrunk.status}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No trunk</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/phone-numbers/${number.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Assign to Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Configure Webhooks
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteNumber(number.id, number.number)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Number
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}