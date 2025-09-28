import { useState } from "react";
import { api } from "@/utils/api";
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

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  capabilities: any;
  locality: string;
  region: string;
  countryCode: string;
  monthlyCost: number;
}

export default function NumberManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search form state
  const [searchForm, setSearchForm] = useState({
    country: "US",
    areaCode: "",
    contains: "",
    limit: 10,
  });

  // Purchase form state
  const [purchaseForm, setPurchaseForm] = useState({
    phoneNumber: "",
    friendlyName: "",
    capabilities: ["voice"],
  });

  // Fetch data
  const { data: numbers, refetch: refetchNumbers, isLoading } = api.numbers.getAll.useQuery();
  const { data: stats } = api.numbers.getStats.useQuery();

  // Search available numbers query
  const { data: searchResults, refetch: searchNumbers, isFetching: isSearchingNumbers } = api.numbers.searchAvailable.useQuery(
    { country: searchForm.country, areaCode: searchForm.areaCode, contains: searchForm.contains, limit: searchForm.limit },
    { enabled: false } // Only run when manually triggered
  );

  const syncFromTwilioMutation = api.numbers.syncFromTwilio.useMutation({
    onSuccess: (data) => {
      void refetchNumbers();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const purchaseNumberMutation = api.numbers.purchase.useMutation({
    onSuccess: (data) => {
      setIsPurchasing(false);
      setPurchaseDialogOpen(false);
      setPurchaseForm({ phoneNumber: "", friendlyName: "", capabilities: ["voice"] });
      void refetchNumbers();
      toast.success(data.message);
    },
    onError: (error) => {
      setIsPurchasing(false);
      toast.error(error.message);
    },
  });

  const assignNumberMutation = api.numbers.assignToAgent.useMutation({
    onSuccess: (data) => {
      void refetchNumbers();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const releaseNumberMutation = api.numbers.releaseFromAgent.useMutation({
    onSuccess: (data) => {
      void refetchNumbers();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSearchNumbers = async () => {
    try {
      const result = await searchNumbers();
      if (result.data) {
        setAvailableNumbers(result.data.numbers);
        toast.success(`Found ${result.data.numbers.length} available numbers`);
      }
    } catch (error) {
      toast.error('Failed to search numbers');
    }
  };

  const handlePurchaseNumber = (number: AvailableNumber) => {
    setPurchaseForm({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: number.capabilities.voice ? ["voice"] : [],
    });
    setPurchaseDialogOpen(true);
  };

  const handleConfirmPurchase = () => {
    setIsPurchasing(true);
    purchaseNumberMutation.mutate(purchaseForm);
  };

  const handleAssignNumber = (phoneNumberId: string) => {
    // TODO: Open agent selection dialog
    toast.success("Agent selection dialog coming soon");
  };

  const handleReleaseNumber = (phoneNumberId: string) => {
    if (confirm("Are you sure you want to release this number?")) {
      releaseNumberMutation.mutate({ phoneNumberId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "default";
      case "ASSIGNED": return "secondary";
      case "SUSPENDED": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "AVAILABLE": return <CheckCircle className="h-3 w-3" />;
      case "ASSIGNED": return <AlertCircle className="h-3 w-3" />;
      case "SUSPENDED": return <XCircle className="h-3 w-3" />;
      default: return <XCircle className="h-3 w-3" />;
    }
  };

  const filteredNumbers = numbers?.filter((number) => {
    const matchesSearch = number.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         number.friendlyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || number.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil((filteredNumbers?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNumbers = filteredNumbers?.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Number Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your Twilio phone numbers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => syncFromTwilioMutation.mutate()}
              disabled={syncFromTwilioMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncFromTwilioMutation.isPending ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Search Available Numbers</DialogTitle>
                  <DialogDescription>
                    Search for available phone numbers to purchase from Twilio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={searchForm.country} onValueChange={(value) => setSearchForm({...searchForm, country: value})}>
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
                    <Label htmlFor="areaCode">Area Code (Optional)</Label>
                    <Input
                      id="areaCode"
                      placeholder="e.g., 555"
                      value={searchForm.areaCode}
                      onChange={(e) => setSearchForm({...searchForm, areaCode: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contains">Contains (Optional)</Label>
                    <Input
                      id="contains"
                      placeholder="e.g., 123"
                      value={searchForm.contains}
                      onChange={(e) => setSearchForm({...searchForm, contains: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="limit">Number of Results</Label>
                    <Select value={searchForm.limit.toString()} onValueChange={(value) => setSearchForm({...searchForm, limit: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSearchNumbers} disabled={isSearching} className="w-full">
                    {isSearching ? "Searching..." : "Search Numbers"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => setPurchaseDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Purchase
            </Button>
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-xl font-semibold">{stats?.totalNumbers || 0}</p>
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
                  <p className="text-xl font-semibold text-green-600">{stats?.availableNumbers || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Assigned</p>
                  <p className="text-xl font-semibold text-blue-600">{stats?.assignedNumbers || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Monthly</p>
                  <p className="text-xl font-semibold">${stats?.totalMonthlyCost?.toFixed(2) || "0"}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-400" />
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
                  Manage your purchased numbers and assignments
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
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
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
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedNumbers?.map((number) => (
                      <TableRow key={number.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {number.number}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {number.friendlyName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(number.status)} className="gap-1">
                            {getStatusIcon(number.status)}
                            {number.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {number.assignedAgent ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                  {number.assignedAgent.name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm">{number.assignedAgent.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {number.country}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium">${number.monthlyCost}/mo</span>
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
                              {number.status === "AVAILABLE" && (
                                <DropdownMenuItem onClick={() => handleAssignNumber(number.id)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Assign to Agent
                                </DropdownMenuItem>
                              )}
                              {number.status === "ASSIGNED" && (
                                <DropdownMenuItem onClick={() => handleReleaseNumber(number.id)}>
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Release Number
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredNumbers?.length || 0)} of {filteredNumbers?.length || 0} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Purchase Dialog */}
        <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Phone Number</DialogTitle>
              <DialogDescription>
                Confirm the purchase of this phone number from Twilio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input value={purchaseForm.phoneNumber} disabled />
              </div>
              <div>
                <Label>Friendly Name</Label>
                <Input
                  value={purchaseForm.friendlyName}
                  onChange={(e) => setPurchaseForm({...purchaseForm, friendlyName: e.target.value})}
                  placeholder="Enter a friendly name for this number"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmPurchase} disabled={isPurchasing}>
                  {isPurchasing ? "Purchasing..." : "Purchase Number"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}