import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import campaignService from '@/services/campaignService';
import {
  Phone,
  Server,
  Activity,
  Plus,
  MoreVertical,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Loader2,
  Network,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface LiveKitTrunk {
  id: string;
  name: string;
  status: string;
  trunkType: string;
  livekitTrunkId: string;
  phoneNumbers?: any[];
  campaign?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PlatformTrunk {
  id: string;
  name: string;
  status: string;
  twilioTrunkSid?: string;
  isActive: boolean;
  phoneNumbers?: any[];
}

export default function TrunksPage() {
  const router = useRouter();
  const [livekitTrunks, setLivekitTrunks] = useState<LiveKitTrunk[]>([]);
  const [platformTrunks, setPlatformTrunks] = useState<PlatformTrunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTrunkName, setNewTrunkName] = useState('');
  const [newTrunkDescription, setNewTrunkDescription] = useState('');
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([]);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<any[]>([]);

  // Fetch LiveKit trunks
  const fetchLiveKitTrunks = async () => {
    try {
      const response = await campaignService.getLiveKitTrunks();
      setLivekitTrunks(response.data || []);
    } catch (error) {
      console.error('Error fetching LiveKit trunks:', error);
      toast.error('Failed to fetch LiveKit trunks');
    }
  };

  // Fetch platform trunks
  const fetchPlatformTrunks = async () => {
    try {
      const trunks = await campaignService.getPlatformTrunks();
      setPlatformTrunks(trunks);
    } catch (error) {
      console.error('Error fetching platform trunks:', error);
      toast.error('Failed to fetch platform trunks');
    }
  };

  // Fetch available phone numbers for trunk assignment
  const fetchAvailablePhoneNumbers = async () => {
    try {
      const numbers = await campaignService.getPhoneNumbers();
      setAvailablePhoneNumbers(numbers.filter((n: any) => !n.campaignId));
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchLiveKitTrunks(),
        fetchPlatformTrunks(),
        fetchAvailablePhoneNumbers(),
      ]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Create new LiveKit trunk
  const handleCreateTrunk = async () => {
    try {
      const tenantId = localStorage.getItem('tenant_id') || '';
      await campaignService.createLiveKitTrunk({
        name: newTrunkName,
        tenantId,
        phoneNumbers: selectedPhoneNumbers,
      });
      toast.success('LiveKit trunk created successfully');
      setCreateDialogOpen(false);
      setNewTrunkName('');
      setNewTrunkDescription('');
      setSelectedPhoneNumbers([]);
      fetchLiveKitTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create trunk');
    }
  };

  // Delete trunk
  const handleDeleteTrunk = async (trunkId: string, trunkName: string) => {
    if (!confirm(`Are you sure you want to delete trunk "${trunkName}"?`)) return;

    try {
      await campaignService.deleteLiveKitTrunk(trunkId);
      toast.success('Trunk deleted successfully');
      fetchLiveKitTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete trunk');
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PROVISIONING':
        return <Badge className="bg-blue-100 text-blue-800">Provisioning</Badge>;
      case 'ERROR':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'PROVISIONING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ERROR':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trunk Management</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage LiveKit SIP trunks and platform connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchLiveKitTrunks();
              fetchPlatformTrunks();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Trunk
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create LiveKit Trunk</DialogTitle>
                <DialogDescription>
                  Set up a new LiveKit SIP trunk for voice communications
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Trunk Name</Label>
                  <Input
                    placeholder="Enter trunk name"
                    value={newTrunkName}
                    onChange={(e) => setNewTrunkName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Enter trunk description"
                    value={newTrunkDescription}
                    onChange={(e) => setNewTrunkDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Assign Phone Numbers</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-3 mt-2">
                    {availablePhoneNumbers.length > 0 ? (
                      availablePhoneNumbers.map((phone) => (
                        <div key={phone.id} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={phone.id}
                            checked={selectedPhoneNumbers.includes(phone.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPhoneNumbers([...selectedPhoneNumbers, phone.id]);
                              } else {
                                setSelectedPhoneNumbers(selectedPhoneNumbers.filter(id => id !== phone.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor={phone.id} className="flex-1 cursor-pointer">
                            <span className="font-mono text-sm">{phone.number}</span>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No available phone numbers</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTrunk}
                    disabled={!newTrunkName}
                  >
                    Create Trunk
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Trunks</p>
                <p className="text-xl font-semibold">{livekitTrunks.length + platformTrunks.length}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">LiveKit Trunks</p>
                <p className="text-xl font-semibold text-blue-600">{livekitTrunks.length}</p>
              </div>
              <Network className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Trunks</p>
                <p className="text-xl font-semibold text-green-600">
                  {livekitTrunks.filter(t => t.status === 'ACTIVE').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Platform Trunks</p>
                <p className="text-xl font-semibold">{platformTrunks.filter(t => t.isActive).length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LiveKit Trunks Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">LiveKit Trunks</CardTitle>
              <CardDescription className="text-xs">
                Manage your LiveKit SIP trunk connections
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : livekitTrunks.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No LiveKit trunks found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first trunk to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Trunk Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Phone Numbers</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {livekitTrunks.map((trunk) => (
                  <TableRow key={trunk.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(trunk.status)}
                        {trunk.name}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(trunk.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {trunk.trunkType || 'SIP'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trunk.campaign ? (
                        <span className="text-sm">{trunk.campaign.name}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {trunk.phoneNumbers?.length || 0} numbers
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {new Date(trunk.createdAt).toLocaleDateString()}
                      </span>
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
                          <DropdownMenuItem>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit Trunk
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-3 w-3 mr-2" />
                            Manage Numbers
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTrunk(trunk.id, trunk.name)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete Trunk
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

      {/* Platform Trunks Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Platform Trunks</CardTitle>
              <CardDescription className="text-xs">
                System-level trunk connections with Twilio
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {platformTrunks.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No platform trunks configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Trunk Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Twilio SID</TableHead>
                  <TableHead>Phone Numbers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformTrunks.map((trunk) => (
                  <TableRow key={trunk.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {trunk.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        {trunk.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trunk.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {trunk.twilioTrunkSid || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {trunk.phoneNumbers?.length || 0} numbers
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}