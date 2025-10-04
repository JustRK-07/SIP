"use client";

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
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import campaignService from '@/services/campaignService';
import {
  Building2,
  Users,
  Globe,
  Mail,
  Phone,
  Plus,
  MoreVertical,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Activity,
  Shield,
  Search,
  UserPlus,
  Calendar,
  DollarSign,
  Database,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: string;
  contactEmail?: string;
  contactPhone?: string;
  maxUsers?: number;
  currentUsers?: number;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  campaigns?: any[];
  phoneNumbers?: any[];
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    maxUsers: 10,
    settings: {},
  });

  // Fetch all tenants
  const fetchTenants = async () => {
    try {
      const response = await campaignService.getTenants();
      setTenants(response.data || []);
    } catch (error: any) {
      // Check if it's an access denied error (non-admin user)
      if (error.message?.includes('Access denied') || error.message?.includes('ACCOUNT_ACCESS_DENIED')) {
        // This is expected for non-admin users, try to fetch current tenant only
        console.log('Non-admin user detected, fetching current tenant only');
        fetchCurrentTenant();
      } else {
        console.error('Error fetching tenants:', error);
        toast.error('Failed to fetch tenants');
      }
    }
  };

  // Fetch current tenant info
  const fetchCurrentTenant = async () => {
    try {
      const tenant = await campaignService.getCurrentTenant();
      setCurrentTenant(tenant);
      setTenants([tenant]); // Show only current tenant if not admin
    } catch (error: any) {
      // If even current tenant fails, it's likely the endpoint requires special account
      if (error.message?.includes('Access denied') || error.message?.includes('ACCOUNT_ACCESS_DENIED')) {
        console.log('Tenant API requires admin account - showing limited view');
        // Show a message that admin access is required
        setTenants([]);
        setCurrentTenant(null);
      } else {
        console.error('Error fetching current tenant:', error);
        toast.error('Failed to fetch tenant information');
      }
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await fetchTenants();
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Create new tenant
  const handleCreateTenant = async () => {
    try {
      const newTenant = await campaignService.createTenant(formData);
      toast.success(`Tenant "${newTenant.name}" created successfully`);
      setCreateDialogOpen(false);
      resetForm();
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tenant');
    }
  };

  // Update tenant
  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;

    try {
      const updatedTenant = await campaignService.updateTenant(selectedTenant.id, formData);
      toast.success(`Tenant "${updatedTenant.name}" updated successfully`);
      setEditDialogOpen(false);
      resetForm();
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tenant');
    }
  };

  // Delete tenant
  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete tenant "${tenantName}"? This action cannot be undone.`)) return;

    try {
      await campaignService.deleteTenant(tenantId);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tenant');
    }
  };

  // Toggle tenant status
  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === 'ACTIVE';
    try {
      await campaignService.toggleTenantStatus(tenant.id, !newStatus);
      toast.success(`Tenant ${newStatus ? 'deactivated' : 'activated'} successfully`);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tenant status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      contactEmail: '',
      contactPhone: '',
      maxUsers: 10,
      settings: {},
    });
    setSelectedTenant(null);
  };

  // Open edit dialog
  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      domain: tenant.domain,
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      maxUsers: tenant.maxUsers || 10,
      settings: tenant.settings || {},
    });
    setEditDialogOpen(true);
  };

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Calculate stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t.currentUsers || 0), 0);
  const totalCampaigns = tenants.reduce((sum, t) => sum + (t.campaigns?.length || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage multi-tenant organizations and their settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTenants}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Set up a new tenant organization with isolated data and settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Organization Name*</Label>
                    <Input
                      placeholder="Enter organization name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Domain*</Label>
                    <Input
                      placeholder="example.com"
                      value={formData.domain}
                      onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Maximum Users</Label>
                  <Input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({...formData, maxUsers: parseInt(e.target.value) || 10})}
                    min="1"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTenant}
                  disabled={!formData.name || !formData.domain}
                >
                  Create Tenant
                </Button>
              </DialogFooter>
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
                <p className="text-xs text-gray-600">Total Tenants</p>
                <p className="text-xl font-semibold">{totalTenants}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Tenants</p>
                <p className="text-xl font-semibold text-green-600">{activeTenants}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Users</p>
                <p className="text-xl font-semibold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Campaigns</p>
                <p className="text-xl font-semibold">{totalCampaigns}</p>
              </div>
              <Database className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Access Required Message */}
      {!currentTenant && tenants.length === 0 && !isLoading && (
        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Tenant management requires administrator privileges. Please contact your system administrator
              if you need access to tenant management features.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Tenant Info (if not admin) */}
      {currentTenant && tenants.length === 1 && (
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Tenant Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">Organization</p>
                <p className="font-semibold">{currentTenant.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Domain</p>
                <p className="font-mono text-sm">{currentTenant.domain}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Status</p>
                {getStatusBadge(currentTenant.status)}
              </div>
              <div>
                <p className="text-xs text-gray-600">Created</p>
                <p className="text-sm">{new Date(currentTenant.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenants Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Tenants</CardTitle>
              <CardDescription className="text-xs">
                Manage tenant organizations and their configurations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tenants..."
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
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
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
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tenants found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first tenant to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Organization</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {tenant.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-gray-400" />
                        <span className="font-mono text-xs">{tenant.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                    <TableCell>
                      {tenant.contactEmail ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-xs">{tenant.contactEmail}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">
                          {tenant.currentUsers || 0}/{tenant.maxUsers || '∞'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tenant.campaigns?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                            {tenant.status === 'ACTIVE' ? (
                              <>
                                <XCircle className="h-3 w-3 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-3 w-3 mr-2" />
                            Manage Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete Tenant
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant organization details and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Organization Name*</Label>
                <Input
                  placeholder="Enter organization name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Domain*</Label>
                <Input
                  placeholder="example.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({...formData, domain: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  placeholder="+1 (555) 123-4567"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Maximum Users</Label>
              <Input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({...formData, maxUsers: parseInt(e.target.value) || 10})}
                min="1"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTenant}
              disabled={!formData.name || !formData.domain}
            >
              Update Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}