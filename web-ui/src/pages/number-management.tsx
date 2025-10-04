"use client";

import { useState, useEffect } from "react";
import { gobiService } from "@/services/gobiService";
import type { PhoneNumber, AvailablePhoneNumber, CreatePhoneNumberData } from "@/services/gobiService";
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
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  MapPin,
  Calendar,
  RefreshCw,
  Trash2,
  UserPlus,
  UserMinus,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function NumberManagement() {
  // State management
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingNumbers, setIsSearchingNumbers] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Search and purchase forms
  const [searchForm, setSearchForm] = useState({
    country: "US",
    areaCode: "",
    contains: "",
    limit: 20,
  });

  const [purchaseForm, setPurchaseForm] = useState({
    phoneNumber: "",
    friendlyName: "",
    capabilities: ["voice"],
  });

  // Data fetching functions
  const fetchNumbers = async () => {
    try {
      const response = await gobiService.numbers.getAll();
      setNumbers(response.data || []);
    } catch (error) {
      console.error('Error fetching numbers:', error);
      toast.error('Failed to fetch phone numbers');
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await gobiService.numbers.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const searchAvailableNumbers = async () => {
    setIsSearchingNumbers(true);
    try {
      const response = await gobiService.numbers.getAvailable({
        country: searchForm.country,
        areaCode: searchForm.areaCode || undefined,
        contains: searchForm.contains || undefined,
        limit: searchForm.limit,
      });
      setAvailableNumbers(response.data || []);
      setSearchDialogOpen(true);
    } catch (error) {
      console.error('Error searching numbers:', error);
      toast.error('Failed to search available numbers');
    } finally {
      setIsSearchingNumbers(false);
    }
  };

  const purchaseNumber = async () => {
    if (!purchaseForm.phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsPurchasing(true);
    try {
      const data: CreatePhoneNumberData = {
        number: purchaseForm.phoneNumber,
        label: purchaseForm.friendlyName || undefined,
        type: 'LOCAL', // Default type
        provider: 'TWILIO',
      };

      await gobiService.numbers.create(data);
      toast.success('Phone number purchased successfully!');
      setPurchaseDialogOpen(false);
      setPurchaseForm({
        phoneNumber: "",
        friendlyName: "",
        capabilities: ["voice"],
      });
      await fetchNumbers();
      await fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase phone number');
    } finally {
      setIsPurchasing(false);
    }
  };

  const assignNumber = async (numberId: string, agentId: string) => {
    try {
      // This would need to be implemented in governments service based on gobi-main API
      // For now, using update to change assignment
      await gobiService.numbers.update(numberId, { campaignId: agentId });
      toast.success('Phone number assigned successfully!');
      await fetchNumbers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign phone number');
    }
  };

  const releaseNumber = async (numberId: string) => {
    try {
      await gobiService.numbers.update(numberId, { campaignId: undefined });
      toast.success('Phone number released successfully!');
      await fetchNumbers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to release phone number');
    }
  };

  const deleteNumber = async (numberId: string, permanent = false) => {
    try {
      await gobiService.numbers.delete(numberId, permanent);
      toast.success(`Phone number ${permanent ? 'deleted' : 'deactivated'} successfully!`);
      await fetchNumbers();
      await fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete phone number');
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchNumbers(), fetchStats()]);
      setIsLoading(false);
    };

    // Only load on client side
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);

  // Format phone number display
  const formatPhoneNumber = (number: string) => {
    if (number.startsWith('+1')) {
      const digits = number.slice(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return number;
  };

  // Get status badge color
  const getStatusBadge = (number: PhoneNumber) => {
    if (!number.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (number.campaignId) {
      return <Badge variant="default">Assigned</Badge>;
    }
    return <Badge variant="secondary">Available</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading phone numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Phone Number Management</h1>
          <p className="text-gray-600 mt-2">Manage your phone numbers and assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={searchAvailableNumbers}
            disabled={isSearchingNumbers}
            variant="outline"
          >
            {isSearchingNumbers ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Available
          </Button>
          <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Purchase Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purchase Phone Number</DialogTitle>
                <DialogDescription>
                  Enter a phone number to purchase from Twilio
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+15551234567"
                    value={purchaseForm.phoneNumber}
                    onChange={(e) =>
                      setPurchaseForm(prev => ({ ...prev, phoneNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="friendlyName">Friendly Name (Optional)</Label>
                  <Input
                    id="friendlyName"
                    placeholder="e.g., Main Office Line"
                    value={purchaseForm.friendlyName}
                    onChange={(e) =>
                      setPurchaseForm(prev => ({ ...prev, friendlyName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={purchaseNumber} disabled={isPurchasing}>
                  {isPurchasing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Purchase
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Numbers</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNumbers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableNumbers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedNumbers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactiveNumbers || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Numbers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Numbers</CardTitle>
          <CardDescription>
            Manage your purchased phone numbers and their assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numbers.map((number) => (
                <TableRow key={number.id}>
                  <TableCell className="font-medium">
                    {formatPhoneNumber(number.number)}
                  </TableCell>
                  <TableCell>{number.label || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{number.type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(number)}</TableCell>
                  <TableCell>
                    {number.campaign?.name || '-'}
                  </TableCell>
                  <TableCell>{number.provider}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {number.campaignId ? (
                          <DropdownMenuItem onClick={() => releaseNumber(number.id)}>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Release
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign (Not implemented)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteNumber(number.id, false)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteNumber(number.id, true)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Search Available Numbers Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Available Phone Numbers</DialogTitle>
            <DialogDescription>
              Search and purchase available phone numbers from Twilio
            </DialogDescription>
          </DialogHeader>

          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={searchForm.country}
                onValueChange={(value) => setSearchForm(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="areaCode">Area Code</Label>
              <Input
                id="areaCode"
                placeholder="555"
                value={searchForm.areaCode}
                onChange={(e) => setSearchForm(prev => ({ ...prev, areaCode: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contains">Contains</Label>
              <Input
                id="contains"
                placeholder="1234"
                value={searchForm.contains}
                onChange={(e) => setSearchForm(prev => ({ ...prev, contains: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="limit">Limit</Label>
              <Input
                id="limit"
                type="number"
                value={searchForm.limit}
                onChange={(e) => setSearchForm(prev => ({ ...prev, limit: parseInt(e.target.value) || 20 }))}
              />
            </div>
          </div>

          <Button onClick={searchAvailableNumbers} disabled={isSearchingNumbers} className="mb-4">
            {isSearchingNumbers ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Numbers
          </Button>

          {/* Available Numbers Table */}
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableNumbers.map((number, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {formatPhoneNumber(number.phoneNumber)}
                    </TableCell>
                    <TableCell>
                      {number.locality}, {number.region}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {number.capabilities.voice && <Badge variant="outline">Voice</Badge>}
                        {number.capabilities.sms && <Badge variant="outline">SMS</Badge>}
                        {number.capabilities.mms && <Badge variant="outline">MMS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPurchaseForm(prev => ({
                            ...prev,
                            phoneNumber: number.phoneNumber,
                            friendlyName: number.friendlyName || ''
                          }));
                          setSearchDialogOpen(false);
                          setPurchaseDialogOpen(true);
                        }}
                      >
                        Purchase
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}