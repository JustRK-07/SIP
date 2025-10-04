// Campaign Service for Gobi-Main API Integration
const GOBI_API_URL = process.env.NEXT_PUBLIC_GOBI_API_URL || 'http://localhost:3000';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  campaignType: 'INBOUND' | 'OUTBOUND';
  script?: string;
  totalLeads: number;
  callsMade: number;
  callsAnswered: number;
  conversionRate: number;
  averageDuration: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  phoneNumbers?: any[];
  livekitTrunk?: any;
  dispatchRule?: any;
}

export interface PhoneNumber {
  id: string;
  number: string;
  friendlyName?: string;
  status: string;
  capabilities: string;
  twilioSid: string;
  country: string;
  region?: string;
  monthlyCost: number;
  assignedAgentId?: string;
  callDirection: string;
  campaignId?: string;
  platformTrunk?: {
    id: string;
    name: string;
    status: string;
  };
  livekitTrunk?: {
    id: string;
    status: string;
    trunkType: string;
  };
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  campaignType: 'INBOUND' | 'OUTBOUND';
  agentName?: string;
  numberIds?: string[];
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  campaignType?: 'INBOUND' | 'OUTBOUND';
  agentName?: string;
  isActive?: boolean;
  numberIds?: string[];
}

class CampaignService {
  private static instance: CampaignService;

  private constructor() {}

  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  // Get auth headers from localStorage
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') {
      return {
        'Content-Type': 'application/json',
      };
    }
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  }

  // Get tenant ID from JWT token
  private getTenantId(): string {
    if (typeof window === 'undefined') {
      throw new Error('Cannot access localStorage during SSR');
    }
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('No access token found');

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const tokenData = JSON.parse(jsonPayload);
      return tokenData.acct;
    } catch (error) {
      console.error('Error parsing token:', error);
      throw new Error('Invalid token');
    }
  }

  // List all campaigns
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ data: Campaign[]; pagination: any }> {
    const tenantId = this.getTenantId();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const url = `${GOBI_API_URL}/api/tenants/${tenantId}/campaigns${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch campaigns');
    }

    return response.json();
  }

  // Get single campaign
  async getCampaign(campaignId: string): Promise<Campaign> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/campaigns/${campaignId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch campaign');
    }

    const result = await response.json();
    return result.data;
  }

  // Create campaign
  async createCampaign(data: CreateCampaignData): Promise<Campaign> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/campaigns`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create campaign');
    }

    const result = await response.json();
    return result.data;
  }

  // Update campaign
  async updateCampaign(campaignId: string, data: UpdateCampaignData): Promise<Campaign> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/campaigns/${campaignId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update campaign');
    }

    const result = await response.json();
    return result.data;
  }

  // Delete campaign
  async deleteCampaign(campaignId: string): Promise<void> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/campaigns/${campaignId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete campaign');
    }
  }

  // Get available phone numbers
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/phone-numbers`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch phone numbers');
    }

    const result = await response.json();
    return result.data || [];
  }

  // Get available phone numbers for purchase
  async getAvailablePhoneNumbers(params?: {
    areaCode?: string;
    contains?: string;
    type?: string;
    country?: string;
    limit?: number;
  }): Promise<any[]> {
    const tenantId = this.getTenantId();
    const queryParams = new URLSearchParams();

    if (params?.areaCode) queryParams.append('areaCode', params.areaCode);
    if (params?.contains) queryParams.append('contains', params.contains);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.country) queryParams.append('country', params.country || 'US');
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${GOBI_API_URL}/api/tenants/${tenantId}/phone-numbers/available${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch available numbers');
    }

    const result = await response.json();
    return result.data || [];
  }

  // Purchase phone number
  async purchasePhoneNumber(phoneNumber: string): Promise<PhoneNumber> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/phone-numbers`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ number: phoneNumber }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to purchase phone number');
    }

    const result = await response.json();
    return result.data;
  }

  // Delete phone number
  async deletePhoneNumber(numberId: string, permanent: boolean = false): Promise<void> {
    const tenantId = this.getTenantId();
    const url = `${GOBI_API_URL}/api/tenants/${tenantId}/phone-numbers/${numberId}${permanent ? '?permanent=true' : ''}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete phone number');
    }
  }

  // Get LiveKit trunks
  async getLiveKitTrunks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const url = `${GOBI_API_URL}/api/livekit-trunks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch LiveKit trunks');
    }

    return response.json();
  }

  // Get single LiveKit trunk
  async getLiveKitTrunk(trunkId: string): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/livekit-trunks/${trunkId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch LiveKit trunk');
    }

    return response.json();
  }

  // Create LiveKit trunk
  async createLiveKitTrunk(data: {
    name: string;
    tenantId: string;
    campaignId?: string;
    phoneNumbers?: string[];
  }): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/livekit-trunks`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create LiveKit trunk');
    }

    return response.json();
  }

  // Update LiveKit trunk
  async updateLiveKitTrunk(trunkId: string, data: {
    name?: string;
    phoneNumbers?: string[];
    isActive?: boolean;
  }): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/livekit-trunks/${trunkId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update LiveKit trunk');
    }

    return response.json();
  }

  // Delete LiveKit trunk
  async deleteLiveKitTrunk(trunkId: string): Promise<void> {
    const response = await fetch(
      `${GOBI_API_URL}/api/livekit-trunks/${trunkId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete LiveKit trunk');
    }
  }

  // Get platform trunks
  async getPlatformTrunks(): Promise<any[]> {
    const response = await fetch(
      `${GOBI_API_URL}/api/platform-trunks`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch platform trunks');
    }

    const result = await response.json();
    return result.data || [];
  }

  // Update phone number with trunk association
  async updatePhoneNumberTrunk(phoneNumberId: string, data: {
    platformTrunkId?: string;
    campaignId?: string;
  }): Promise<PhoneNumber> {
    const tenantId = this.getTenantId();
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/phone-numbers/${phoneNumberId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update phone number');
    }

    const result = await response.json();
    return result.data;
  }

  // ============= Tenant Management Methods =============

  // Get all tenants (requires admin privileges)
  async getTenants(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const url = `${GOBI_API_URL}/api/tenants${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch tenants');
    }

    return response.json();
  }

  // Get single tenant
  async getTenant(tenantId: string): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch tenant');
    }

    const result = await response.json();
    return result.data;
  }

  // Create new tenant
  async createTenant(data: {
    name: string;
    domain: string;
    contactEmail?: string;
    contactPhone?: string;
    maxUsers?: number;
    settings?: any;
  }): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create tenant');
    }

    const result = await response.json();
    return result.data;
  }

  // Update tenant
  async updateTenant(tenantId: string, data: {
    name?: string;
    domain?: string;
    contactEmail?: string;
    contactPhone?: string;
    maxUsers?: number;
    settings?: any;
    status?: string;
  }): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update tenant');
    }

    const result = await response.json();
    return result.data;
  }

  // Delete tenant (requires admin)
  async deleteTenant(tenantId: string): Promise<void> {
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete tenant');
    }
  }

  // Activate/Deactivate tenant
  async toggleTenantStatus(tenantId: string, activate: boolean): Promise<any> {
    const response = await fetch(
      `${GOBI_API_URL}/api/tenants/${tenantId}/activate`,
      {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ isActive: activate }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update tenant status');
    }

    const result = await response.json();
    return result.data;
  }

  // Get current tenant info
  async getCurrentTenant(): Promise<any> {
    const tenantId = this.getTenantId();
    return this.getTenant(tenantId);
  }
}

export default CampaignService.getInstance();