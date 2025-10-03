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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import gobiService, { type PlatformTrunk, type LiveKitTrunk } from '@/services/gobiService';
import { getTenantId } from '@/utils/tenant';
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

export default function TrunksPage() {
  const router = useRouter();
  const [livekitTrunks, setLivekitTrunks] = useState<LiveKitTrunk[]>([]);
  const [platformTrunks, setPlatformTrunks] = useState<PlatformTrunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Platform Trunk Dialog States
  const [createPlatformDialogOpen, setCreatePlatformDialogOpen] = useState(false);
  const [platformTrunkName, setPlatformTrunkName] = useState('Platform Twilio Trunk');
  const [platformTrunkDescription, setPlatformTrunkDescription] = useState('');
  const [platformTrunkRegion, setPlatformTrunkRegion] = useState('us1');
  const [platformTrunkMaxChannels, setPlatformTrunkMaxChannels] = useState(100);

  // LiveKit Trunk Dialog States
  const [createLivekitDialogOpen, setCreateLivekitDialogOpen] = useState(false);
  const [livekitTrunkName, setLivekitTrunkName] = useState('');
  const [livekitTrunkDescription, setLivekitTrunkDescription] = useState('');
  const [livekitTrunkRegion, setLivekitTrunkRegion] = useState('us-east-1');
  const [livekitTrunkType, setLivekitTrunkType] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [livekitMaxConcurrentCalls, setLivekitMaxConcurrentCalls] = useState(10);

  // Fetch LiveKit trunks
  const fetchLiveKitTrunks = async () => {
    try {
      const tenantId = getTenantId();
      const response = await gobiService.trunks.getLiveKitTrunks({ tenantId });
      setLivekitTrunks(response.data || []);
    } catch (error) {
      console.error('Error fetching LiveKit trunks:', error);
      toast.error('Failed to fetch LiveKit trunks');
    }
  };

  // Fetch platform trunks
  const fetchPlatformTrunks = async () => {
    try {
      const response = await gobiService.trunks.getPlatformTrunks();
      setPlatformTrunks(response.data || []);
    } catch (error) {
      console.error('Error fetching platform trunks:', error);
      toast.error('Failed to fetch platform trunks');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchLiveKitTrunks(),
        fetchPlatformTrunks(),
      ]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Create new Platform Trunk
  const handleCreatePlatformTrunk = async () => {
    try {
      await gobiService.trunks.createPlatformTrunk({
        name: platformTrunkName,
        description: platformTrunkDescription,
        twilioRegion: platformTrunkRegion,
        maxChannels: platformTrunkMaxChannels,
      });
      toast.success('Platform trunk created successfully');
      setCreatePlatformDialogOpen(false);
      setPlatformTrunkName('Platform Twilio Trunk');
      setPlatformTrunkDescription('');
      setPlatformTrunkRegion('us1');
      setPlatformTrunkMaxChannels(100);
      fetchPlatformTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create platform trunk');
    }
  };

  // Create new LiveKit trunk
  const handleCreateLivekitTrunk = async () => {
    try {
      const tenantId = getTenantId();
      await gobiService.trunks.createLiveKitTrunk({
        name: livekitTrunkName,
        description: livekitTrunkDescription,
        tenantId,
        livekitRegion: livekitTrunkRegion,
        trunkType: livekitTrunkType,
        maxConcurrentCalls: livekitMaxConcurrentCalls,
        codecPreferences: ['PCMU', 'PCMA', 'G722'],
      });
      toast.success('LiveKit trunk created successfully');
      setCreateLivekitDialogOpen(false);
      setLivekitTrunkName('');
      setLivekitTrunkDescription('');
      setLivekitTrunkRegion('us-east-1');
      setLivekitTrunkType('INBOUND');
      setLivekitMaxConcurrentCalls(10);
      fetchLiveKitTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create LiveKit trunk');
    }
  };

  // Delete LiveKit trunk
  const handleDeleteLivekitTrunk = async (trunkId: string, trunkName: string) => {
    if (!confirm(`Are you sure you want to delete LiveKit trunk "${trunkName}"?`)) return;

    try {
      await gobiService.trunks.deleteLiveKitTrunk(trunkId);
      toast.success('LiveKit trunk deleted successfully');
      fetchLiveKitTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete LiveKit trunk');
    }
  };

  // Delete Platform trunk
  const handleDeletePlatformTrunk = async (trunkId: string, trunkName: string) => {
    if (!confirm(`Are you sure you want to delete platform trunk "${trunkName}"?`)) return;

    try {
      await gobiService.trunks.deletePlatformTrunk(trunkId);
      toast.success('Platform trunk deleted successfully');
      fetchPlatformTrunks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete platform trunk');
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
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
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
            Manage Platform Trunks and LiveKit SIP trunks
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
            <Dialog open={createPlatformDialogOpen} onOpenChange={setCreatePlatformDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Platform Trunk
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Platform Trunk</DialogTitle>
                  <DialogDescription>
                    Create a new Twilio Elastic SIP trunk for the platform
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="platformName">Trunk Name</Label>
                    <Input
                      id="platformName"
                      placeholder="Platform Twilio Trunk"
                      value={platformTrunkName}
                      onChange={(e) => setPlatformTrunkName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="platformDescription">Description (Optional)</Label>
                    <Textarea
                      id="platformDescription"
                      placeholder="Enter trunk description"
                      value={platformTrunkDescription}
                      onChange={(e) => setPlatformTrunkDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="platformRegion">Twilio Region</Label>
                    <Select value={platformTrunkRegion} onValueChange={setPlatformTrunkRegion}>
                      <SelectTrigger id="platformRegion">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us1">US1 (Virginia)</SelectItem>
                        <SelectItem value="us2">US2 (Oregon)</SelectItem>
                        <SelectItem value="au1">AU1 (Australia)</SelectItem>
                        <SelectItem value="dublin">Dublin (Ireland)</SelectItem>
                        <SelectItem value="tokyo">Tokyo (Japan)</SelectItem>
                        <SelectItem value="singapore">Singapore</SelectItem>
                        <SelectItem value="sydney">Sydney (Australia)</SelectItem>
                        <SelectItem value="ireland">Ireland</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="platformMaxChannels">Max Channels</Label>
                    <Input
                      id="platformMaxChannels"
                      type="number"
                      min="1"
                      max="1000"
                      value={platformTrunkMaxChannels}
                      onChange={(e) => setPlatformTrunkMaxChannels(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCreatePlatformDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePlatformTrunk}>
                      Create Platform Trunk
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : platformTrunks.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No platform trunks configured</p>
              <p className="text-sm text-gray-400 mt-1">Create your first platform trunk to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Trunk Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Twilio SID</TableHead>
                  <TableHead>LiveKit Trunks</TableHead>
                  <TableHead>Created</TableHead>
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
                        {(trunk as any)._count?.livekitTrunks || 0} trunks
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeletePlatformTrunk(trunk.id, trunk.name)}
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
            <Dialog open={createLivekitDialogOpen} onOpenChange={setCreateLivekitDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create LiveKit Trunk
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create LiveKit Trunk</DialogTitle>
                  <DialogDescription>
                    Set up a new LiveKit SIP trunk for voice communications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="livekitName">Trunk Name</Label>
                    <Input
                      id="livekitName"
                      placeholder="Enter trunk name"
                      value={livekitTrunkName}
                      onChange={(e) => setLivekitTrunkName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="livekitDescription">Description (Optional)</Label>
                    <Textarea
                      id="livekitDescription"
                      placeholder="Enter trunk description"
                      value={livekitTrunkDescription}
                      onChange={(e) => setLivekitTrunkDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="livekitType">Trunk Type</Label>
                    <Select value={livekitTrunkType} onValueChange={(value) => setLivekitTrunkType(value as 'INBOUND' | 'OUTBOUND')}>
                      <SelectTrigger id="livekitType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INBOUND">Inbound</SelectItem>
                        <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="livekitRegion">LiveKit Region</Label>
                    <Select value={livekitTrunkRegion} onValueChange={setLivekitTrunkRegion}>
                      <SelectTrigger id="livekitRegion">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="livekitMaxCalls">Max Concurrent Calls</Label>
                    <Input
                      id="livekitMaxCalls"
                      type="number"
                      min="1"
                      max="100"
                      value={livekitMaxConcurrentCalls}
                      onChange={(e) => setLivekitMaxConcurrentCalls(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCreateLivekitDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateLivekitTrunk}
                      disabled={!livekitTrunkName}
                    >
                      Create LiveKit Trunk
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                  <TableHead>Region</TableHead>
                  <TableHead>Max Calls</TableHead>
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
                      <span className="text-sm text-gray-600">
                        {(trunk as any).livekitRegion || 'us-east-1'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{trunk.maxConcurrentCalls || 10}</span>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteLivekitTrunk(trunk.id, trunk.name)}
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
    </div>
  );
}
