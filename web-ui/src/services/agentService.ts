interface Agent {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  model: string;
  voice: string;
  temperature: number;
  maxTokens: number;
  status: 'ACTIVE' | 'INACTIVE' | 'RUNNING' | 'ERROR';
  deploymentMode: string;
  template: string;
  phoneNumberId?: string;
  livekitConfig?: string;
  twilioConfig?: string;
  performance?: string;
  totalCalls: number;
  successfulCalls: number;
  conversionRate: number;
  averageDuration: number;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: {
    id: string;
    number: string;
    friendlyName: string;
  };
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  voice: string;
  model: string;
  temperature: number;
  features: string[];
}

interface CreateAgentData {
  name: string;
  description?: string;
  prompt: string;
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
  deploymentMode?: string;
  template?: string;
  phoneNumberId?: string;
}

interface UpdateAgentData extends Partial<CreateAgentData> {}

class AgentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getAgents(): Promise<{ agents: Agent[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAgent(agentId: string): Promise<{ agent: Agent }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createAgent(data: CreateAgentData): Promise<{ agent: Agent; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateAgent(agentId: string, data: UpdateAgentData): Promise<{ agent: Agent; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteAgent(agentId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTemplates(): Promise<{ templates: AgentTemplate[]; totalTemplates: number }> {
    const response = await fetch(`${this.baseUrl}/api/agents/templates`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createFromTemplate(templateId: string, name: string, customizations?: any): Promise<{ agent: Agent; message: string; templateUsed: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/from-template`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        templateId,
        name,
        customizations,
      }),
    });
    return this.handleResponse(response);
  }

  async deployAgent(agentId: string, config?: any): Promise<{ message: string; deploymentInfo: any }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/deploy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config || {}),
    });
    return this.handleResponse(response);
  }

  async testCall(agentId: string, phoneNumber: string): Promise<{ message: string; callId: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/test-call`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ phoneNumber }),
    });
    return this.handleResponse(response);
  }

  async getAnalytics(agentId: string, timeframe?: string): Promise<any> {
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/analytics?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async cloneAgent(agentId: string, newName: string): Promise<{ agent: Agent; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/clone`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name: newName }),
    });
    return this.handleResponse(response);
  }

  async updateVoiceConfig(agentId: string, config: any): Promise<{ message: string; agent: Agent }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/voice-config`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse(response);
  }

  async getKnowledgeBase(agentId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/knowledge-base`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateKnowledgeBase(agentId: string, data: any): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/knowledge-base`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getWebhooks(agentId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/webhooks`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateWebhooks(agentId: string, webhooks: any): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/webhooks`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(webhooks),
    });
    return this.handleResponse(response);
  }

  async getConversations(agentId: string, limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/conversations?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPerformance(agentId: string, timeframe?: string): Promise<any> {
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/performance?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const agentService = new AgentService();
export type { Agent, AgentTemplate, CreateAgentData, UpdateAgentData };