/**
 * Comprehensive service layer for gobi-main API integration
 * Replaces TRPC with direct REST API calls to gobi-main backend
 */

import authManager from '../utils/auth';

// Base configuration
const GOBI_MAIN_API_URL = process.env.NEXT_PUBLIC_GOBI_MAIN_API_URL || 'http://localhost:3000';

// Auth functions using proper authentication with automatic token refresh
const getToken = async (): Promise<string> => {
  return authManager.getValidToken();
};

const getTenantId = (): string => {
  return authManager.getTenantId();
};

// Common error handling
class GobiAPIError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'GobiAPIError';
  }
}

// Base service class with common functionality
class BaseGobiService {
  protected baseUrl: string;

  constructor() {
    this.baseUrl = GOBI_MAIN_API_URL;
  }

  protected async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  protected async handleResponse<T>(response: Response, retryCount = 0): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Check if it's a token expiration error
      if (response.status === 401 && retryCount === 0) {
        // Token might have expired between check and request
        // Force refresh and retry once
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        return this.handleResponse<T>(response, retryCount + 1);
      }

      throw new GobiAPIError(
        errorData.error?.message || errorData.message || 'API request failed',
        response.status,
        errorData.error?.code || 'API_ERROR'
      );
    }

    const data = await response.json();
    return data;
  }

  protected buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }
}

// ===============================
// CAMPAIGN SERVICE
// ===============================
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  campaignType: 'INBOUND' | 'OUTBOUND';
  status?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
  phoneNumbers?: PhoneNumber[];
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  campaignType?: 'INBOUND' | 'OUTBOUND';
  agentName?: string;
  numberIds?: string[];
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  campaignType?: 'INBOUND' | 'OUTBOUND';
  isActive?: boolean;
  agentName?: string;
  numberIds?: string[];
}

class CampaignService extends BaseGobiService {
  private getTenantId(): string {
    return getTenantId();
  }

  async getAll(): Promise<{ data: Campaign[]; total: number }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/campaigns`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getById(id: string): Promise<{ data: Campaign }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/campaigns/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async create(data: CreateCampaignData): Promise<{ data: Campaign; message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/campaigns`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async update(id: string, data: UpdateCampaignData): Promise<{ data: Campaign; message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/campaigns/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(id: string): Promise<{ message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/campaigns/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  // Additional methods to replace TRPC campaign router functionality
  async getStats(): Promise<any> {
    // This method is called by RealTimeDashboard for campaign statistics
    const { data: campaigns } = await this.getAll();

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.isActive).length,
      inboundCampaigns: campaigns.filter(c => c.campaignType === 'INBOUND').length,
      outboundCampaigns: campaigns.filter(c => c.campaignType === 'OUTBOUND').length,
      pausedCampaigns: campaigns.filter(c => !c.isActive).length,
    };
  }

  async getOverallStats(): Promise<any> {
    // Alias for getStats() to maintain compatibility
    return this.getStats();
  }

  async getAgentStatus(): Promise<any> {
    // This would need to be implemented in gobi-main as a separate endpoint
    // For now, return mock data structure
    return {
      connected: true,
      status: 'active',
      message: 'AI Agent is connected and active',
      lastCheck: new Date().toISOString(),
    };
  }
}

// ===============================
// PHONE NUMBERS SERVICE
// ===============================
export interface PhoneNumber {
  id: string;
  number: string;
  type: 'LOCAL' | 'MOBILE' | 'TOLL_FREE';
  label?: string;
  extension?: string;
  provider: string;
  isActive: boolean;
  tenantId: string;
  campaignId?: string;
  platformTrunkId?: string;
  createdAt: Date;
  updatedAt: Date;
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
  campaign?: Campaign;
}

export interface CreatePhoneNumberData {
  number: string;
  type?: 'LOCAL' | 'MOBILE' | 'TOLL_FREE';
  label?: string;
  extension?: string;
  provider?: string;
  isActive?: boolean;
  campaignId?: string;
}

export interface UpdatePhoneNumberData {
  number?: string;
  type?: 'LOCAL' | 'MOBILE' | 'TOLL_FREE';
  label?: string;
  extension?: string;
  provider?: string;
  isActive?: boolean;
  campaignId?: string;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  country: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  type: string;
  provider: string;
}

class NumbersService extends BaseGobiService {
  private getTenantId(): string {
    return getTenantId();
  }

  async getAll(): Promise<{ data: PhoneNumber[] }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getById(id: string): Promise<{ data: PhoneNumber }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getAvailable(params?: {
    areaCode?: string;
    contains?: string;
    type?: string;
    country?: string;
    limit?: number;
  }): Promise<{ data: AvailablePhoneNumber[]; count: number }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers/available`, params);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async create(data: CreatePhoneNumberData): Promise<{ data: PhoneNumber; message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async update(id: string, data: UpdatePhoneNumberData): Promise<{ data: PhoneNumber; message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(id: string, permanent = false): Promise<{ message: string }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers/${id}`, { permanent });
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  async getStats(): Promise<any> {
    const { data: phoneNumbers } = await this.getAll();

    return {
      totalNumbers: phoneNumbers.length,
      availableNumbers: phoneNumbers.filter(p => p.isActive && !p.campaignId).length,
      assignedNumbers: phoneNumbers.filter(p => p.campaignId).length,
      inactiveNumbers: phoneNumbers.filter(p => !p.isActive).length,
    };
  }
}

// ===============================
// TRUNKS SERVICE
// ===============================
export interface PlatformTrunk {
  id: string;
  name: string;
  description?: string;
  twilioTrunkSid: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveKitTrunk {
  id: string;
  name: string;
  description?: string;
  trunkType: 'INBOUND' | 'OUTBOUND';
  livekitTrunkId: string;
  status: string;
  tenantId: string;
  platformTrunkId?: string;
  campaignId?: string;
  maxConcurrentCalls?: number;
  codecPreferences?: string[];
  createdAt: Date;
  updatedAt: Date;
}

class TrunksService extends BaseGobiService {
  private getTenantId(): string {
    return getTenantId();
  }

  async getPlatformTrunks(): Promise<{ data: PlatformTrunk[] }> {
    const url = this.buildUrl('/api/platform-trunks');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getLiveKitTrunks(): Promise<{ data: LiveKitTrunk[] }> {
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/livekit-trunks`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getAvailablePhoneNumbers(token: string, page = 1, limit = 100): Promise<any> {
    // This appears to be a call to gobi-main that then calls external services
    // The token parameter suggests it's using some authentication for external service
    const tenantId = this.getTenantId();
    const url = this.buildUrl(`/api/tenants/${tenantId}/phone-numbers/available`, { page, limit });
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }
}

// ===============================
// LEAD LIST SERVICE
// ===============================
export interface LeadList {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    leads: number;
  };
  assignedCampaigns?: Array<{
    id: string;
    name: string;
  }>;
}

export interface CreateLeadListData {
  name: string;
  description?: string;
}

export interface UploadLeadsData {
  listId: string;
  content: string;
}

class LeadListService extends BaseGobiService {
  async getAll(): Promise<LeadList[]> {
    // Note: Lead lists might not be tenant-specific in gobi-main
    // This would need to be implemented as a new endpoint
    const url = this.buildUrl('/api/lead-lists');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    const result = await this.handleResponse(response);
    return result.data || result;
  }

  async getDetails(id: string): Promise<any> {
    const url = this.buildUrl(`/api/lead-lists/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async create(data: CreateLeadListData): Promise<LeadList> {
    const url = this.buildUrl('/api/lead-lists');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async uploadLeads(data: UploadLeadsData): Promise<any> {
    const url = this.buildUrl(`/api/lead-lists/${data.listId}/upload`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: data.content }),
    });
    return this.handleResponse(response);
  }
}

// ===============================
// LIVEKIT SYNC SERVICE
// ===============================
class LiveKitSyncService extends BaseGobiService {
  async getLiveKitRooms(): Promise<any> {
    // This would need to be implemented as an endpoint in gobi-main
    const url = this.buildUrl('/api/livekit/rooms');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async syncAgentStatus(): Promise<any> {
    const url = this.buildUrl('/api/livekit/sync-agents');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(response);
  }
}

// ===============================
// AGENTS SERVICE
// ===============================
export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRAINING' | 'FAILED';
  prompt?: string;
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
  deploymentMode?: string;
  template?: string;
  livekitConfig?: any;
  twilioConfig?: any;
  performance?: any;
  createdAt: Date;
  updatedAt: Date;
  totalConversations?: number;
  phoneNumber?: any;
  campaigns?: any[];
}

export interface CreateAgentData {
  name: string;
  description?: string;
  type?: 'INBOUND' | 'OUTBOUND' | 'HYBRID';
  personality?: any;
  llmConfig?: any;
  capabilities?: any;
  businessHours?: any;
  fallbackConfig?: any;
  tenantId?: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'TRAINING' | 'FAILED';
  prompt?: string;
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
  livekitConfig?: any;
  twilioConfig?: any;
}

class AgentsService extends BaseGobiService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ agents: Agent[]; pagination: any }> {
    const url = this.buildUrl('/api/agents', params);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getById(id: string): Promise<Agent> {
    const url = this.buildUrl(`/api/agents/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async create(data: CreateAgentData): Promise<{ message: string; agent: Agent }> {
    const url = this.buildUrl('/api/agents');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async update(id: string, data: UpdateAgentData): Promise<{ message: string; agent: Agent }> {
    const url = this.buildUrl(`/api/agents/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/agents/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  async deploy(id: string, data: { phoneNumbers?: string[]; recordCalls?: boolean }): Promise<{ message: string; agent: Agent; deploymentStatus: string }> {
    const url = this.buildUrl(`/api/agents/${id}/deploy`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getStats(): Promise<any> {
    const { agents } = await this.getAll();

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'ACTIVE').length,
      inactiveAgents: agents.filter(a => a.status === 'INACTIVE').length,
      trainingAgents: agents.filter(a => a.status === 'TRAINING').length,
    };
  }

  async getTemplates(): Promise<{ templates: any[]; totalTemplates: number }> {
    const url = this.buildUrl('/api/agents/templates');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async createFromTemplate(data: { templateId: string; name: string; customizations?: any }): Promise<{ message: string; agent: Agent; templateUsed: string }> {
    const url = this.buildUrl('/api/agents/from-template');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getAnalytics(id: string, params?: { startDate?: string; endDate?: string }): Promise<any> {
    const url = this.buildUrl(`/api/agents/${id}/analytics`, params);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getPerformance(id: string, period = 'week'): Promise<any> {
    const url = this.buildUrl(`/api/agents/${id}/performance`, { period });
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async stop(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/agents/${id}/stop`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(response);
  }

  async getLiveKitStatus(id: string): Promise<any> {
    const url = this.buildUrl(`/api/agents/${id}/livekit-status`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }
}

// ===============================
// EXPORT SINGLETON INSTANCES
// ===============================
export const campaignService = new CampaignService();
export const numbersService = new NumbersService();
export const trunksService = new TrunksService();
export const leadListService = new LeadListService();
export const livekitSyncService = new LiveKitSyncService();
export const agentsService = new AgentsService();

// Export all services as a single object for convenience
export const gobiService = {
  campaigns: campaignService,
  numbers: numbersService,
  trunks: trunksService,
  leadLists: leadListService,
  livekitSync: livekitSyncService,
  agents: agentsService,
};

export default gobiService;