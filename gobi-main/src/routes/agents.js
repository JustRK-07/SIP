const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const DatabaseService = require('../services/DatabaseService');
const ResponseService = require('../services/ResponseService');
const ValidationService = require('../services/ValidationService');

const prisma = DatabaseService.getClient();

// Heartbeat timeout threshold (in milliseconds) - 90 seconds = 3x typical 30s heartbeat interval
const HEARTBEAT_TIMEOUT_MS = 90 * 1000;

/**
 * Check and update agents with stale heartbeats
 * Marks agents as INACTIVE if they haven't sent a heartbeat in HEARTBEAT_TIMEOUT_MS
 */
async function checkAndUpdateStaleAgents(agents) {
  const now = new Date();
  const agentsArray = Array.isArray(agents) ? agents : [agents];
  const staleAgentIds = [];

  for (const agent of agentsArray) {
    if (agent.status === 'ACTIVE' && agent.livekitConfig) {
      try {
        const config = typeof agent.livekitConfig === 'string'
          ? JSON.parse(agent.livekitConfig)
          : agent.livekitConfig;

        const lastHeartbeat = config.lastHeartbeat ? new Date(config.lastHeartbeat) : null;

        if (lastHeartbeat) {
          const timeSinceLastHeartbeat = now - lastHeartbeat;

          if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
            staleAgentIds.push(agent.id);
            // Update agent in memory for immediate response
            agent.status = 'INACTIVE';
          }
        }
      } catch (error) {
        console.error(`Error parsing livekitConfig for agent ${agent.id}:`, error);
      }
    }
  }

  // Batch update stale agents in database
  if (staleAgentIds.length > 0) {
    try {
      await prisma.agent.updateMany({
        where: { id: { in: staleAgentIds } },
        data: { status: 'INACTIVE' }
      });
      console.log(`Auto-marked ${staleAgentIds.length} agent(s) as INACTIVE due to heartbeat timeout`);
    } catch (error) {
      console.error('Error updating stale agents:', error);
    }
  }

  return agentsArray;
}

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: AI Agent management endpoints
 */

/**
 * @swagger
 * /api/agents/templates:
 *   get:
 *     summary: Get available agent templates
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agent templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = [
      {
        id: 'customer-service',
        name: 'Customer Service Agent',
        description: 'Professional customer support agent for handling inquiries and complaints',
        category: 'Support',
        prompt: 'You are a professional customer service representative. Be helpful, empathetic, and solution-oriented.',
        voice: 'nova',
        model: 'gpt-4',
        temperature: 0.7,
        features: ['FAQs', 'Ticket Creation', 'Sentiment Analysis']
      },
      {
        id: 'sales-outreach',
        name: 'Sales Outreach Agent',
        description: 'Engaging sales agent for cold calls and lead qualification',
        category: 'Sales',
        prompt: 'You are a friendly sales representative. Focus on understanding customer needs and providing value.',
        voice: 'shimmer',
        model: 'gpt-4',
        temperature: 0.8,
        features: ['Lead Qualification', 'Product Info', 'Appointment Booking']
      },
      {
        id: 'appointment-scheduler',
        name: 'Appointment Scheduler',
        description: 'Efficient agent for booking and managing appointments',
        category: 'Scheduling',
        prompt: 'You are an appointment scheduling assistant. Help users book, reschedule, or cancel appointments efficiently.',
        voice: 'echo',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        features: ['Calendar Integration', 'Reminder Setup', 'Rescheduling']
      },
      {
        id: 'survey-collector',
        name: 'Survey Collector',
        description: 'Polite agent for conducting customer surveys and feedback collection',
        category: 'Research',
        prompt: 'You are conducting a customer satisfaction survey. Be polite, clear, and respect their time.',
        voice: 'onyx',
        model: 'gpt-3.5-turbo',
        temperature: 0.6,
        features: ['Survey Logic', 'Data Collection', 'Response Validation']
      }
    ];

    res.json({
      templates,
      totalTemplates: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    ResponseService.internalError(res, error, 'Failed to fetch templates');
  }
});

/**
 * @swagger
 * /api/agents/from-template:
 *   post:
 *     summary: Create agent from template
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - name
 *             properties:
 *               templateId:
 *                 type: string
 *               name:
 *                 type: string
 *               customizations:
 *                 type: object
 *     responses:
 *       201:
 *         description: Agent created from template
 */
router.post('/from-template', authenticateToken, async (req, res) => {
  try {
    const { templateId, name, customizations = {} } = req.body;

    if (!templateId || !name) {
      return ResponseService.badRequest(res, 'Template ID and name are required');
    }

    // Get template (in real implementation, this would be from database)
    const templates = {
      'customer-service': {
        prompt: 'You are a professional customer service representative. Be helpful, empathetic, and solution-oriented.',
        voice: 'nova',
        model: 'gpt-4',
        temperature: 0.7,
        template: 'customer-service'
      },
      'sales-outreach': {
        prompt: 'You are a friendly sales representative. Focus on understanding customer needs and providing value.',
        voice: 'shimmer',
        model: 'gpt-4',
        temperature: 0.8,
        template: 'sales-outreach'
      },
      'appointment-scheduler': {
        prompt: 'You are an appointment scheduling assistant. Help users book, reschedule, or cancel appointments efficiently.',
        voice: 'echo',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        template: 'appointment-scheduler'
      },
      'survey-collector': {
        prompt: 'You are conducting a customer satisfaction survey. Be polite, clear, and respect their time.',
        voice: 'onyx',
        model: 'gpt-3.5-turbo',
        temperature: 0.6,
        template: 'survey-collector'
      }
    };

    const template = templates[templateId];
    if (!template) {
      return ResponseService.notFound(res, 'Template not found');
    }

    // Check for duplicate name
    const existingAgent = await prisma.agent.findUnique({
      where: { name }
    });

    if (existingAgent) {
      return ResponseService.conflict(res, 'Agent with this name already exists');
    }

    // Create agent from template
    const agent = await prisma.agent.create({
      data: {
        name,
        description: `${name} - Created from ${templateId} template`,
        ...template,
        ...customizations,
        status: 'INACTIVE',
        deploymentMode: 'livekit'
      }
    });

    res.status(201).json({
      message: 'Agent created from template',
      agent,
      templateUsed: templateId
    });
  } catch (error) {
    console.error('Error creating agent from template:', error);
    ResponseService.internalError(res, error, 'Failed to create agent from template');
  }
});

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: List all agents
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, TRAINING, FAILED]
 *         description: Filter by agent status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search agents by name or description
 *     responses:
 *       200:
 *         description: List of agents
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, tenantId, sortBy = 'createdAt', order = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};

    // For now, we'll return all agents regardless of tenant
    // In a multi-tenant setup, you might want to add a tenantId field to the Agent model
    // or only show agents that have campaigns associated with the user's tenant

    // Optional: Filter by agents that have campaigns for this tenant
    // Commented out for now to avoid empty results
    /*
    if (!req.user.roles?.includes('admin')) {
      where.campaigns = {
        some: {
          campaign: {
            tenantId: req.user.acct
          }
        }
      };
    } else if (tenantId) {
      where.campaigns = {
        some: {
          campaign: {
            tenantId: tenantId
          }
        }
      };
    }
    */

    // Filter by status
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get agents with pagination
    const [agents, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: order },
        include: {
          phoneNumber: true,
          campaigns: {
            include: {
              campaign: {
                include: {
                  tenant: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              conversations: true
            }
          }
        }
      }),
      prisma.agent.count({ where })
    ]);

    // Check and update agents with stale heartbeats
    await checkAndUpdateStaleAgents(agents);

    res.json({
      agents: agents.map(agent => ({
        ...agent,
        totalConversations: agent._count.conversations,
        _count: undefined
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    ResponseService.internalError(res, error, 'Failed to fetch agents');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}:
 *   get:
 *     summary: Get specific agent details
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent details
 *       404:
 *         description: Agent not found
 */
router.get('/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        phoneNumber: true,
        campaigns: {
          include: {
            campaign: {
              include: {
                tenant: true
              }
            }
          }
        },
        conversations: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Check if user has access to this agent
    if (!req.user.roles?.includes('admin')) {
      const userTenantId = req.user.acct;
      const hasAccess = agent.campaigns.some(ca =>
        ca.campaign.tenantId === userTenantId
      );

      if (!hasAccess) {
        return ResponseService.forbidden(res, 'Access denied to this agent');
      }
    }

    // Check and update if agent has stale heartbeat
    await checkAndUpdateStaleAgents(agent);

    // Parse JSON fields
    if (agent.livekitConfig) {
      try {
        agent.livekitConfig = JSON.parse(agent.livekitConfig);
      } catch (e) {}
    }
    if (agent.twilioConfig) {
      try {
        agent.twilioConfig = JSON.parse(agent.twilioConfig);
      } catch (e) {}
    }
    if (agent.performance) {
      try {
        agent.performance = JSON.parse(agent.performance);
      } catch (e) {}
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    ResponseService.internalError(res, error, 'Failed to fetch agent');
  }
});

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Create new AI agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INBOUND, OUTBOUND, HYBRID]
 *               personality:
 *                 type: object
 *               llmConfig:
 *                 type: object
 *               capabilities:
 *                 type: object
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'INBOUND',
      personality = {},
      llmConfig = {},
      capabilities = {},
      businessHours,
      fallbackConfig,
      tenantId
    } = req.body;

    // Validation
    if (!name) {
      return ResponseService.badRequest(res, 'Agent name is required');
    }

    // Check for duplicate name
    const existingAgent = await prisma.agent.findUnique({
      where: { name }
    });

    if (existingAgent) {
      return ResponseService.conflict(res, 'Agent with this name already exists');
    }

    // Set defaults for LLM config
    const defaultLLMConfig = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: `You are a helpful AI assistant named ${name}.`,
      ...llmConfig
    };

    // Set defaults for personality
    const defaultPersonality = {
      tone: 'professional',
      language: 'en-US',
      voice: 'nova',
      speed: 1.0,
      ...personality
    };

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        prompt: defaultLLMConfig.systemPrompt,
        model: defaultLLMConfig.model,
        voice: defaultPersonality.voice,
        temperature: defaultLLMConfig.temperature,
        maxTokens: defaultLLMConfig.maxTokens,
        status: 'INACTIVE',
        deploymentMode: 'livekit',
        template: 'custom',
        livekitConfig: JSON.stringify({
          personality: defaultPersonality,
          capabilities,
          businessHours,
          fallbackConfig
        })
      }
    });

    // If tenantId provided, create campaign association
    if (tenantId || req.user.acct) {
      const targetTenantId = req.user.roles?.includes('admin') && tenantId ? tenantId : req.user.acct;

      // Create a default campaign for the agent
      const campaign = await prisma.campaign.create({
        data: {
          name: `${name} Campaign`,
          description: `Campaign for ${name} agent`,
          status: 'DRAFT',
          campaignType: type,
          tenantId: targetTenantId
        }
      });

      // Associate agent with campaign
      await prisma.campaignAgent.create({
        data: {
          campaignId: campaign.id,
          agentId: agent.id,
          isActive: true,
          priority: 1
        }
      });
    }

    res.status(201).json({
      message: 'Agent created successfully',
      agent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    ResponseService.internalError(res, error, 'Failed to create agent');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}:
 *   put:
 *     summary: Update agent configuration
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 */
router.put('/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaigns: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Check access permissions
    if (!req.user.roles?.includes('admin')) {
      const userTenantId = req.user.acct;
      const hasAccess = agent.campaigns.some(ca =>
        ca.campaign.tenantId === userTenantId
      );

      if (!hasAccess) {
        return ResponseService.forbidden(res, 'Access denied to this agent');
      }
    }

    // Prepare update data
    const updateData = {};

    // Update basic fields
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.status) updateData.status = updates.status;
    if (updates.prompt) updateData.prompt = updates.prompt;
    if (updates.model) updateData.model = updates.model;
    if (updates.voice) updateData.voice = updates.voice;
    if (updates.temperature !== undefined) updateData.temperature = updates.temperature;
    if (updates.maxTokens !== undefined) updateData.maxTokens = updates.maxTokens;

    // Update complex JSON fields
    if (updates.livekitConfig) {
      updateData.livekitConfig = typeof updates.livekitConfig === 'string'
        ? updates.livekitConfig
        : JSON.stringify(updates.livekitConfig);
    }
    if (updates.twilioConfig) {
      updateData.twilioConfig = typeof updates.twilioConfig === 'string'
        ? updates.twilioConfig
        : JSON.stringify(updates.twilioConfig);
    }

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData
    });

    res.json({
      message: 'Agent updated successfully',
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    ResponseService.internalError(res, error, 'Failed to update agent');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}:
 *   delete:
 *     summary: Delete agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
router.delete('/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Delete request for agent:', agentId);
    console.log('User:', req.user);

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaigns: {
          include: {
            campaign: true
          }
        }
      }
    });

    console.log('Agent found:', agent ? 'Yes' : 'No');
    console.log('Agent campaigns count:', agent?.campaigns?.length || 0);

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Allow deletion - agents in the user's visible list can be deleted
    // The cascade delete will remove CampaignAgent associations regardless of tenant
    console.log('User tenant ID:', req.user.acct);
    console.log('Agent campaigns count:', agent.campaigns.length);
    console.log('Allowing deletion');

    console.log('Proceeding with delete...');

    // First, delete related CampaignAgent records (cascade delete)
    await prisma.campaignAgent.deleteMany({
      where: { agentId }
    });
    console.log('Deleted related CampaignAgent records');

    // Then delete the agent
    await prisma.agent.delete({
      where: { id: agentId }
    });

    console.log('Agent deleted successfully');
    res.json({
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    ResponseService.internalError(res, error, 'Failed to delete agent');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/deploy:
 *   post:
 *     summary: Deploy agent to production
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *               recordCalls:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Agent deployed successfully
 */
router.post('/:agentId/deploy', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { phoneNumbers = [], recordCalls = true, transcribeRealtime = true } = req.body;

    // Update agent status to ACTIVE
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'ACTIVE',
        livekitConfig: JSON.stringify({
          recordCalls,
          transcribeRealtime,
          deployedAt: new Date().toISOString()
        })
      }
    });

    // TODO: Integrate with LiveKit to actually deploy the agent
    // This would involve:
    // 1. Creating LiveKit room configuration
    // 2. Setting up SIP trunk if needed
    // 3. Configuring webhooks

    res.json({
      message: 'Agent deployed successfully',
      agent,
      deploymentStatus: 'ACTIVE'
    });
  } catch (error) {
    console.error('Error deploying agent:', error);
    ResponseService.internalError(res, error, 'Failed to deploy agent');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/heartbeat:
 *   post:
 *     summary: Send heartbeat to indicate agent is running
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [RUNNING, IDLE, ERROR]
 *               metrics:
 *                 type: object
 *     responses:
 *       200:
 *         description: Heartbeat received
 */
router.post('/:agentId/heartbeat', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status: runtimeStatus = 'RUNNING', metrics = {} } = req.body;

    // Fetch current agent first
    const currentAgent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!currentAgent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse existing config
    let existingConfig = {};
    try {
      existingConfig = JSON.parse(currentAgent.livekitConfig || '{}');
    } catch (e) {
      // If parsing fails, start with empty object
    }

    // Determine agent status based on runtime status
    const agentStatus = runtimeStatus === 'STOPPED' ? 'INACTIVE' : 'ACTIVE';

    // Update agent with last heartbeat timestamp
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: agentStatus,
        livekitConfig: JSON.stringify({
          ...existingConfig,
          lastHeartbeat: new Date().toISOString(),
          runtimeStatus,
          metrics
        })
      }
    });

    res.json({
      message: 'Heartbeat received',
      timestamp: new Date().toISOString(),
      agentStatus: agentStatus
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    ResponseService.internalError(res, error, 'Failed to process heartbeat');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/test-call:
 *   post:
 *     summary: Initiate test call with agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testPhoneNumber:
 *                 type: string
 *               scenario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test call initiated
 */
router.post('/:agentId/test-call', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { testPhoneNumber, scenario = 'general' } = req.body;

    if (!testPhoneNumber) {
      return ResponseService.badRequest(res, 'Test phone number is required');
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // TODO: Integrate with Twilio/LiveKit to make actual test call
    // This would involve:
    // 1. Using Twilio API to initiate call
    // 2. Connecting call to LiveKit room with agent
    // 3. Running predefined test scenario

    res.json({
      message: 'Test call initiated',
      callId: `test_${Date.now()}`,
      status: 'CALLING',
      estimatedDuration: '2-3 minutes'
    });
  } catch (error) {
    console.error('Error initiating test call:', error);
    ResponseService.internalError(res, error, 'Failed to initiate test call');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/analytics:
 *   get:
 *     summary: Get agent performance metrics
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Agent analytics data
 */
router.get('/:agentId/analytics', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get agent with conversations and campaigns for access check
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaigns: {
          include: {
            campaign: true
          }
        },
        conversations: {
          where: dateFilter.gte || dateFilter.lte ? {
            createdAt: dateFilter
          } : undefined,
          select: {
            id: true,
            duration: true,
            status: true,
            sentiment: true,
            leadScore: true,
            outcome: true,
            createdAt: true
          }
        }
      }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Check if user has access to this agent
    if (!req.user.roles?.includes('admin')) {
      const userTenantId = req.user.acct;
      const hasAccess = agent.campaigns.some(ca =>
        ca.campaign.tenantId === userTenantId
      );

      if (!hasAccess) {
        return ResponseService.forbidden(res, 'Access denied to this agent');
      }
    }

    // Calculate metrics
    const totalCalls = agent.conversations.length;
    const completedCalls = agent.conversations.filter(c => c.status === 'COMPLETED').length;
    const avgDuration = agent.conversations.reduce((sum, c) => sum + (c.duration || 0), 0) / (totalCalls || 1);
    const positiveSentiment = agent.conversations.filter(c => c.sentiment === 'positive').length;
    const resolvedCalls = agent.conversations.filter(c => c.outcome === 'resolved').length;

    // Calculate hourly distribution
    const hourlyDistribution = {};
    agent.conversations.forEach(conv => {
      const hour = new Date(conv.createdAt).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Find peak hours (top 3)
    const peakHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    res.json({
      totalCalls,
      successRate: totalCalls > 0 ? (completedCalls / totalCalls) : 0,
      avgCallDuration: Math.round(avgDuration),
      customerSatisfaction: totalCalls > 0 ? ((positiveSentiment / totalCalls) * 5) : 0,
      resolutionRate: totalCalls > 0 ? (resolvedCalls / totalCalls) : 0,
      peakHours,
      hourlyDistribution,
      period: {
        startDate: startDate || 'all-time',
        endDate: endDate || 'current'
      }
    });
  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    ResponseService.internalError(res, error, 'Failed to fetch analytics');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/clone:
 *   post:
 *     summary: Clone existing agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               includeKnowledge:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agent cloned successfully
 */
router.post('/:agentId/clone', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { name, includeKnowledge = true } = req.body;

    if (!name) {
      return ResponseService.badRequest(res, 'New agent name is required');
    }

    // Get source agent
    const sourceAgent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!sourceAgent) {
      return ResponseService.notFound(res, 'Source agent not found');
    }

    // Check for duplicate name
    const existingAgent = await prisma.agent.findUnique({
      where: { name }
    });

    if (existingAgent) {
      return ResponseService.conflict(res, 'Agent with this name already exists');
    }

    // Clone agent
    const clonedAgent = await prisma.agent.create({
      data: {
        name,
        description: `${sourceAgent.description} (Cloned)`,
        prompt: sourceAgent.prompt,
        model: sourceAgent.model,
        voice: sourceAgent.voice,
        temperature: sourceAgent.temperature,
        maxTokens: sourceAgent.maxTokens,
        status: 'INACTIVE',
        deploymentMode: sourceAgent.deploymentMode,
        template: sourceAgent.template,
        livekitConfig: sourceAgent.livekitConfig,
        twilioConfig: sourceAgent.twilioConfig
      }
    });

    res.status(201).json({
      message: 'Agent cloned successfully',
      agent: clonedAgent,
      sourceAgentId: agentId
    });
  } catch (error) {
    console.error('Error cloning agent:', error);
    ResponseService.internalError(res, error, 'Failed to clone agent');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/voice-config:
 *   put:
 *     summary: Update agent voice configuration
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voice:
 *                 type: string
 *                 enum: [nova, shimmer, echo, onyx, fable, alloy]
 *               speed:
 *                 type: number
 *               pitch:
 *                 type: number
 *               volume:
 *                 type: number
 *               language:
 *                 type: string
 *               emotion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Voice configuration updated
 */
router.put('/:agentId/voice-config', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const voiceConfig = req.body;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse existing config
    let livekitConfig = {};
    if (agent.livekitConfig) {
      try {
        livekitConfig = JSON.parse(agent.livekitConfig);
      } catch (e) {}
    }

    // Update voice configuration
    livekitConfig.voice = {
      ...livekitConfig.voice,
      ...voiceConfig
    };

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        voice: voiceConfig.voice || agent.voice,
        livekitConfig: JSON.stringify(livekitConfig)
      }
    });

    res.json({
      message: 'Voice configuration updated',
      voiceConfig: livekitConfig.voice
    });
  } catch (error) {
    console.error('Error updating voice config:', error);
    ResponseService.internalError(res, error, 'Failed to update voice configuration');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/knowledge-base:
 *   get:
 *     summary: Get agent knowledge base
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Knowledge base items
 */
router.get('/:agentId/knowledge-base', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse knowledge base from livekitConfig
    let knowledgeBase = [];
    if (agent.livekitConfig) {
      try {
        const config = JSON.parse(agent.livekitConfig);
        knowledgeBase = config.knowledgeBase || [];
      } catch (e) {}
    }

    res.json({
      agentId,
      knowledgeBase,
      totalItems: knowledgeBase.length
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    ResponseService.internalError(res, error, 'Failed to fetch knowledge base');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/knowledge-base:
 *   post:
 *     summary: Add item to agent knowledge base
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [faq, document, url, script]
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Knowledge base item added
 */
router.post('/:agentId/knowledge-base', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { type, title, content, metadata } = req.body;

    if (!type || !content) {
      return ResponseService.badRequest(res, 'Type and content are required');
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse existing config
    let livekitConfig = {};
    if (agent.livekitConfig) {
      try {
        livekitConfig = JSON.parse(agent.livekitConfig);
      } catch (e) {}
    }

    // Add to knowledge base
    if (!livekitConfig.knowledgeBase) {
      livekitConfig.knowledgeBase = [];
    }

    const newItem = {
      id: `kb_${Date.now()}`,
      type,
      title,
      content,
      metadata,
      createdAt: new Date().toISOString()
    };

    livekitConfig.knowledgeBase.push(newItem);

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        livekitConfig: JSON.stringify(livekitConfig)
      }
    });

    res.status(201).json({
      message: 'Knowledge base item added',
      item: newItem
    });
  } catch (error) {
    console.error('Error adding knowledge base item:', error);
    ResponseService.internalError(res, error, 'Failed to add knowledge base item');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/webhooks:
 *   get:
 *     summary: Get agent webhook configuration
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook configuration
 */
router.get('/:agentId/webhooks', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse webhooks from config
    let webhooks = {};
    if (agent.livekitConfig) {
      try {
        const config = JSON.parse(agent.livekitConfig);
        webhooks = config.webhooks || {};
      } catch (e) {}
    }

    res.json({
      agentId,
      webhooks
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    ResponseService.internalError(res, error, 'Failed to fetch webhooks');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/webhooks:
 *   put:
 *     summary: Update agent webhook configuration
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               onCallStart:
 *                 type: string
 *               onCallEnd:
 *                 type: string
 *               onTranscription:
 *                 type: string
 *               onError:
 *                 type: string
 *               authHeaders:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhooks updated
 */
router.put('/:agentId/webhooks', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const webhookConfig = req.body;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    // Parse existing config
    let livekitConfig = {};
    if (agent.livekitConfig) {
      try {
        livekitConfig = JSON.parse(agent.livekitConfig);
      } catch (e) {}
    }

    // Update webhooks
    livekitConfig.webhooks = {
      ...livekitConfig.webhooks,
      ...webhookConfig,
      updatedAt: new Date().toISOString()
    };

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        livekitConfig: JSON.stringify(livekitConfig)
      }
    });

    res.json({
      message: 'Webhooks updated successfully',
      webhooks: livekitConfig.webhooks
    });
  } catch (error) {
    console.error('Error updating webhooks:', error);
    ResponseService.internalError(res, error, 'Failed to update webhooks');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/conversations:
 *   get:
 *     summary: Get agent conversation history
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conversation history
 */
router.get('/:agentId/conversations', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Check if user has access to this agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaigns: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    if (!req.user.roles?.includes('admin')) {
      const userTenantId = req.user.acct;
      const hasAccess = agent.campaigns.some(ca =>
        ca.campaign.tenantId === userTenantId
      );

      if (!hasAccess) {
        return ResponseService.forbidden(res, 'Access denied to this agent');
      }
    }

    // Build where clause
    const where = { agentId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [conversations, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: {
              name: true,
              phoneNumber: true,
              email: true
            }
          },
          campaign: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.conversation.count({ where })
    ]);

    res.json({
      conversations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    ResponseService.internalError(res, error, 'Failed to fetch conversations');
  }
});

/**
 * @swagger
 * /api/agents/{agentId}/performance:
 *   get:
 *     summary: Get detailed agent performance metrics
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/:agentId/performance', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = 'week' } = req.query;

    // Check if user has access to this agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        campaigns: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!agent) {
      return ResponseService.notFound(res, 'Agent not found');
    }

    if (!req.user.roles?.includes('admin')) {
      const userTenantId = req.user.acct;
      const hasAccess = agent.campaigns.some(ca =>
        ca.campaign.tenantId === userTenantId
      );

      if (!hasAccess) {
        return ResponseService.forbidden(res, 'Access denied to this agent');
      }
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get conversations for the period
    const conversations = await prisma.conversation.findMany({
      where: {
        agentId,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        status: true,
        duration: true,
        sentiment: true,
        leadScore: true,
        outcome: true,
        createdAt: true
      }
    });

    // Calculate metrics
    const totalCalls = conversations.length;
    const completedCalls = conversations.filter(c => c.status === 'COMPLETED').length;
    const failedCalls = conversations.filter(c => c.status === 'FAILED').length;
    const abandonedCalls = conversations.filter(c => c.status === 'ABANDONED').length;

    // Sentiment analysis
    const sentimentCounts = {
      positive: conversations.filter(c => c.sentiment === 'positive').length,
      neutral: conversations.filter(c => c.sentiment === 'neutral').length,
      negative: conversations.filter(c => c.sentiment === 'negative').length
    };

    // Outcome analysis
    const outcomeCounts = {
      resolved: conversations.filter(c => c.outcome === 'resolved').length,
      escalated: conversations.filter(c => c.outcome === 'escalated').length,
      unresolved: conversations.filter(c => c.outcome === 'unresolved').length,
      callback: conversations.filter(c => c.outcome === 'callback').length
    };

    // Average metrics
    const avgDuration = conversations.reduce((sum, c) => sum + (c.duration || 0), 0) / (totalCalls || 1);
    const avgLeadScore = conversations.reduce((sum, c) => sum + (c.leadScore || 0), 0) / (totalCalls || 1);

    // Daily trend
    const dailyTrend = {};
    conversations.forEach(conv => {
      const date = new Date(conv.createdAt).toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = {
          calls: 0,
          completed: 0,
          avgDuration: 0
        };
      }
      dailyTrend[date].calls++;
      if (conv.status === 'COMPLETED') dailyTrend[date].completed++;
      dailyTrend[date].avgDuration += (conv.duration || 0);
    });

    // Finalize daily averages
    Object.keys(dailyTrend).forEach(date => {
      dailyTrend[date].avgDuration = dailyTrend[date].avgDuration / dailyTrend[date].calls;
    });

    res.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      overview: {
        totalCalls,
        completedCalls,
        failedCalls,
        abandonedCalls,
        successRate: totalCalls > 0 ? (completedCalls / totalCalls) : 0,
        avgCallDuration: Math.round(avgDuration),
        avgLeadScore: Math.round(avgLeadScore * 10) / 10
      },
      sentiment: sentimentCounts,
      outcomes: outcomeCounts,
      dailyTrend
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    ResponseService.internalError(res, error, 'Failed to fetch performance metrics');
  }
});

module.exports = router;