/**
 * Comprehensive service layer for gobi-main API integration
 * Replaces TRPC with direct REST API calls to gobi-main backend
 */

import authManager from '../utils/auth';

// Base configuration
const GOBI_MAIN_API_URL = process.env.NEXT_PUBLIC_GOBI_MAIN_API_URL || 'http://localhost:3000';

// Auth functions using proper authentication with automatic token refresh
const getToken = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access authentication during server-side rendering');
  }
  return authManager.getValidToken();
};

const getTenantId = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access tenant ID during server-side rendering');
  }
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

  /**
   * Check if we're running in a browser context
   * Throws an error during SSR to prevent localStorage access
   */
  protected checkBrowserContext(): void {
    if (typeof window === 'undefined') {
      throw new Error('API calls are only available in browser context');
    }
  }

  protected async getAuthHeaders(): Promise<HeadersInit> {
    this.checkBrowserContext();

    try {
      const token = await getToken();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    } catch (error) {
      // If authentication fails, redirect to login page
      if (typeof window !== 'undefined') {
        console.error('Authentication error:', error);
        window.location.href = '/auth';
      }
      throw error;
    }
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

      // Check if it's an authentication error
      if (response.status === 401) {
        // Clear tokens and redirect to login
        if (typeof window !== 'undefined') {
          authManager.clearTokens();
          console.error('Authentication failed. Redirecting to login.');
          window.location.href = '/auth';
        }
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
  agents?: Array<{
    id: string;
    campaignId: string;
    agentId: string;
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    agent: {
      id: string;
      name: string;
      status: string;
      model?: string;
      voice?: string;
      createdAt: Date;
    };
  }>;
  livekitTrunk?: {
    id: string;
    name: string;
    description?: string;
    trunkType: string;
    livekitTrunkId?: string;
    status: string;
    maxConcurrentCalls?: number;
  };
  dispatchRule?: {
    id: string;
    name: string;
    agentName?: string;
    livekitDispatchRuleId?: string;
    ruleType: string;
    roomName?: string;
    status: string;
  };
  _count?: {
    phoneNumbers?: number;
    agents?: number;
  };
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
  agentIds?: string[];
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

  async getPlatformTrunks(params?: { page?: number; limit?: number; search?: string; isActive?: boolean; sortBy?: string; sortOrder?: string }): Promise<{ data: PlatformTrunk[]; pagination?: any }> {
    const url = this.buildUrl('/api/platform-trunks', params);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getLiveKitTrunks(params?: { tenantId?: string; page?: number; limit?: number; search?: string; status?: string }): Promise<{ data: LiveKitTrunk[]; pagination?: any }> {
    const url = this.buildUrl('/api/livekit-trunks', params);
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

  // Platform Trunk CRUD
  async getPlatformTrunkById(id: string): Promise<PlatformTrunk> {
    const url = this.buildUrl(`/api/platform-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async createPlatformTrunk(data: { name?: string; description?: string; twilioRegion?: string; maxChannels?: number }): Promise<PlatformTrunk> {
    const url = this.buildUrl('/api/platform-trunks');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updatePlatformTrunk(id: string, data: { name?: string; description?: string; twilioRegion?: string; maxChannels?: number; isActive?: boolean }): Promise<PlatformTrunk> {
    const url = this.buildUrl(`/api/platform-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deletePlatformTrunk(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/platform-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  // LiveKit Trunk CRUD
  async getLiveKitTrunkById(id: string): Promise<LiveKitTrunk> {
    const url = this.buildUrl(`/api/livekit-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async createLiveKitTrunk(data: { name: string; description?: string; tenantId: string; livekitRegion?: string; trunkType?: 'INBOUND' | 'OUTBOUND'; maxConcurrentCalls?: number; codecPreferences?: string[] }): Promise<LiveKitTrunk> {
    const url = this.buildUrl('/api/livekit-trunks');
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateLiveKitTrunk(id: string, data: { name?: string; description?: string; status?: string; livekitRegion?: string; maxConcurrentCalls?: number; codecPreferences?: string[]; isActive?: boolean }): Promise<LiveKitTrunk> {
    const url = this.buildUrl(`/api/livekit-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteLiveKitTrunk(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/livekit-trunks/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
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
  campaignId?: string;
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

  async create(data: CreateLeadListData): Promise<{ data: LeadList; message: string }> {
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

    const requestBody: any = { content: data.content };
    if (data.campaignId) {
      requestBody.campaignId = data.campaignId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    return this.handleResponse(response);
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<{ message: string; leadList: LeadList }> {
    const url = this.buildUrl(`/api/lead-lists/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/lead-lists/${id}`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
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

  async testCall(id: string, data: { testPhoneNumber: string; scenario?: string }): Promise<{ message: string; callId: string; status: string; estimatedDuration: string }> {
    const url = this.buildUrl(`/api/agents/${id}/test-call`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async clone(id: string, data: { name: string; includeKnowledge?: boolean }): Promise<{ message: string; agent: Agent; sourceAgentId: string }> {
    const url = this.buildUrl(`/api/agents/${id}/clone`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateVoiceConfig(id: string, data: { voice?: string; speed?: number; pitch?: number; volume?: number; language?: string; emotion?: string }): Promise<{ message: string; voiceConfig: any }> {
    const url = this.buildUrl(`/api/agents/${id}/voice-config`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getKnowledgeBase(id: string): Promise<{ agentId: string; knowledgeBase: any[]; totalItems: number }> {
    const url = this.buildUrl(`/api/agents/${id}/knowledge-base`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async addKnowledgeBaseItem(id: string, data: { type: string; title?: string; content: string; metadata?: any }): Promise<{ message: string; item: any }> {
    const url = this.buildUrl(`/api/agents/${id}/knowledge-base`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getWebhooks(id: string): Promise<{ webhooks: any[]; totalWebhooks: number }> {
    const url = this.buildUrl(`/api/agents/${id}/webhooks`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async updateWebhooks(id: string, data: { webhooks: Array<{ event: string; url: string; method?: string; headers?: any }> }): Promise<{ message: string; webhooks: any[] }> {
    const url = this.buildUrl(`/api/agents/${id}/webhooks`);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getConversations(id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }): Promise<{ conversations: any[]; pagination: any }> {
    const url = this.buildUrl(`/api/agents/${id}/conversations`, params);
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }
}

// ===============================
// EXPORT SINGLETON INSTANCES
// ===============================
export const campaignService = new CampaignService();
// ============================================
// Authentication Service
// ============================================
class AuthService extends BaseGobiService {
  async login(data: { username: string; password: string }): Promise<{ accessToken: string; refreshToken: string; tokenType: string; firebaseToken?: string }> {
    const url = this.buildUrl('/api/auth/login');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async refresh(data: { refreshToken: string }): Promise<{ accessToken: string; refreshToken: string; tokenType: string }> {
    const url = this.buildUrl('/api/auth/refresh');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async logout(): Promise<{ message: string }> {
    const url = this.buildUrl('/api/auth/logout');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(response);
  }

  async validate(): Promise<{ valid: boolean; user: any }> {
    const url = this.buildUrl('/api/auth/validate');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async register(data: { username: string; email: string; password: string; firstName?: string; lastName?: string }): Promise<{ message: string; userId: string }> {
    const url = this.buildUrl('/api/auth/register');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getProfile(): Promise<{ user: any }> {
    const url = this.buildUrl('/api/auth/profile');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async updateProfile(data: { firstName?: string; lastName?: string; email?: string; phone?: string }): Promise<{ message: string; user: any }> {
    const url = this.buildUrl('/api/auth/profile');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async forgotPassword(data: { email: string }): Promise<{ message: string }> {
    const url = this.buildUrl('/api/auth/forgot-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async resetPassword(data: { token: string; newPassword: string }): Promise<{ message: string }> {
    const url = this.buildUrl('/api/auth/reset-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const url = this.buildUrl('/api/auth/change-password');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }
}

// ============================================
// Tenant Service
// ============================================
class TenantService extends BaseGobiService {
  async getAll(): Promise<{ tenants: any[]; total: number }> {
    const url = this.buildUrl('/api/tenants');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async getById(id: string): Promise<{ tenant: any }> {
    const url = this.buildUrl(`/api/tenants/${id}`);
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    return this.handleResponse(response);
  }

  async create(data: { name: string; domain?: string; settings?: any }): Promise<{ message: string; tenant: any }> {
    const url = this.buildUrl('/api/tenants');
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async update(id: string, data: { name?: string; domain?: string; settings?: any; isActive?: boolean }): Promise<{ message: string; tenant: any }> {
    const url = this.buildUrl(`/api/tenants/${id}`);
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(id: string): Promise<{ message: string }> {
    const url = this.buildUrl(`/api/tenants/${id}`);
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  async activate(id: string): Promise<{ message: string; tenant: any }> {
    const url = this.buildUrl(`/api/tenants/${id}/activate`);
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
    });
    return this.handleResponse(response);
  }
}

export const authService = new AuthService();
export const tenantService = new TenantService();
export const numbersService = new NumbersService();
export const trunksService = new TrunksService();
export const leadListService = new LeadListService();
export const livekitSyncService = new LiveKitSyncService();
export const agentsService = new AgentsService();

// Export all services as a single object for convenience
export const gobiService = {
  auth: authService,
  tenants: tenantService,
  campaigns: campaignService,
  numbers: numbersService,
  trunks: trunksService,
  leadLists: leadListService,
  livekitSync: livekitSyncService,
  agents: agentsService,
};

export default gobiService;