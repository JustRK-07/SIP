const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireTenantAccess } = require('../utils/routeUtils');
const LiveKitService = require('../services/LiveKitService');
const ValidationService = require('../services/ValidationService');
const DatabaseService = require('../services/DatabaseService');
const PaginationService = require('../services/PaginationService');
const ResponseService = require('../services/ResponseService');
const RouteHelperService = require('../services/RouteHelperService');
const {SIPTransport} = require("@livekit/protocol");

const router = express.Router();
const prisma = DatabaseService.getClient();


/**
 * @swagger
 * /api/tenants/{tenantId}/campaigns:
 *   get:
 *     summary: List campaigns for a tenant
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID (must match JWT acct field)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter campaigns by name or description
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by campaign active status
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get('/:tenantId/campaigns', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Build paginated query using PaginationService
    const queryOptions = PaginationService.buildPaginatedQuery({
      query: req.query,
      where: { tenantId },
      searchFields: ['name', 'description'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc'
    });

    // Add include for phone numbers count
    queryOptions.include = {
      _count: {
        select: {
          phoneNumbers: true
        }
      }
    };

    // Execute paginated query using RouteHelperService
    await RouteHelperService.executePaginatedQuery('campaign', queryOptions, res);
  } catch (error) {
    ResponseService.internalError(res, error, 'Failed to fetch campaigns');
  }
});

/**
 * @swagger
 * /api/tenants/{tenantId}/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID (must match JWT acct field)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign details
 *       404:
 *         description: Campaign not found
 */
router.get('/:tenantId/campaigns/:id', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId, id } = req.params;

    const include = {
      phoneNumbers: {
        select: {
          id: true,
          number: true,
          type: true,
          label: true,
          extension: true,
          provider: true,
          isActive: true,
          createdAt: true
        }
      },
      tenant: {
        select: {
          id: true,
          name: true,
          domain: true
        }
      }
    };

    const campaign = await RouteHelperService.validateTenantResource(
      'campaign', id, tenantId, 'Campaign', res, include
    );

    if (campaign) {
      ResponseService.success(res, campaign);
    }
  } catch (error) {
    ResponseService.internalError(res, error, 'Failed to fetch campaign');
  }
});

/**
 * @swagger
 * /api/tenants/{tenantId}/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID (must match JWT acct field)
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
 *                 description: Campaign name
 *               agentName:
 *                 type: string
 *                 description: Agent name to be assigned to the dispatch rule
 *               description:
 *                 type: string
 *                 description: Campaign description
 *               campaignType:
 *                 type: string
 *                 enum: [INBOUND, OUTBOUND]
 *                 default: INBOUND
 *                 description: Campaign type for inbound or outbound operations
 *               numberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone number IDs to prepopulate the LiveKit trunk (optional, defaults to '+15555555555'). Only applied to inbound trunks.
 *     responses:
 *       201:
 *         description: Campaign created successfully
 */
router.post('/:tenantId/campaigns', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Verify tenant exists
    const tenant = await RouteHelperService.validateTenant(tenantId, res);
    if (!tenant) return;

    // Validate request body
    if (!RouteHelperService.validateRequestBody(req.body, ValidationService.validateCampaignData, res)) {
      return;
    }

    const { name, agentIds, description, campaignType = 'INBOUND', numberIds } = req.body;

    // Validate numberIds array if provided
    let validatedPhoneNumbers = [];
    if (numberIds !== undefined) {
      if (!Array.isArray(numberIds)) {
        return res.status(400).json({
          error: {
            message: 'numberIds must be an array of phone number IDs',
            code: 'VALIDATION_ERROR'
          }
        });
      }
      
      // Validate each numberIds in the array is a string
      for (let i = 0; i < numberIds.length; i++) {
        if (typeof numberIds[i] !== 'string' || numberIds[i].trim().length === 0) {
          return res.status(400).json({
            error: {
              message: `numberIds array item at index ${i} must be a non-empty string`,
              code: 'VALIDATION_ERROR'
            }
          });
        }
      }

      // Validate tenant ownership of phone numbers
      if (numberIds.length > 0) {
        const phoneNumberRecords = await prisma.phoneNumber.findMany({
          where: {
            id: { in: numberIds },
            tenantId,
            isActive: true
          },
          select: {
            id: true,
            number: true
          }
        });

        if (phoneNumberRecords.length !== numberIds.length) {
          const foundIds = phoneNumberRecords.map(pn => pn.id);
          const missingIds = numberIds.filter(id => !foundIds.includes(id));
          
          return res.status(400).json({
            error: {
              message: 'Some phone number IDs are invalid or do not belong to this tenant',
              code: 'INVALID_PHONE_NUMBERS',
              details: {
                invalidIds: missingIds,
                validIds: foundIds
              }
            }
          });
        }

        // Extract actual phone numbers for trunk creation
        validatedPhoneNumbers = phoneNumberRecords.map(pn => pn.number);
        console.log(`Validated ${validatedPhoneNumbers.length} phone numbers for campaign: ${validatedPhoneNumbers.join(', ')}`);
      }
    }

    // Validate agentIds array if provided
    let validatedAgents = [];
    let primaryAgentName = null;
    if (agentIds !== undefined) {
      if (!Array.isArray(agentIds)) {
        return res.status(400).json({
          error: {
            message: 'agentIds must be an array of agent IDs',
            code: 'VALIDATION_ERROR'
          }
        });
      }

      // Validate each agentId in the array is a string
      for (let i = 0; i < agentIds.length; i++) {
        if (typeof agentIds[i] !== 'string' || agentIds[i].trim().length === 0) {
          return res.status(400).json({
            error: {
              message: `agentIds array item at index ${i} must be a non-empty string`,
              code: 'VALIDATION_ERROR'
            }
          });
        }
      }

      // Validate agents exist and are ACTIVE
      if (agentIds.length > 0) {
        const agentRecords = await prisma.agent.findMany({
          where: {
            id: { in: agentIds },
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            status: true
          }
        });

        if (agentRecords.length !== agentIds.length) {
          const foundIds = agentRecords.map(a => a.id);
          const missingIds = agentIds.filter(id => !foundIds.includes(id));

          return res.status(400).json({
            error: {
              message: 'Some agent IDs are invalid or agents are not ACTIVE',
              code: 'INVALID_AGENTS',
              details: {
                invalidIds: missingIds,
                validIds: foundIds
              }
            }
          });
        }

        validatedAgents = agentRecords;
        // Use first agent's name for dispatch rule (backward compatibility)
        primaryAgentName = agentRecords[0].name;
        console.log(`Validated ${validatedAgents.length} agents for campaign`);
      }
    }

    // Check if campaign with this name already exists for the tenant
    const isUnique = await RouteHelperService.validateUnique(
      'campaign',
      { tenantId, name: name.trim() },
      null,
      'Campaign with this name already exists',
      res
    );
    if (!isUnique) return;

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        campaignType,
        tenantId
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    });

    // Create CampaignAgent records if agents were assigned
    if (validatedAgents.length > 0) {
      try {
        await prisma.campaignAgent.createMany({
          data: validatedAgents.map((agent, index) => ({
            campaignId: campaign.id,
            agentId: agent.id,
            isActive: true,
            priority: index + 1
          }))
        });
        console.log(`Created ${validatedAgents.length} CampaignAgent record(s) for campaign ${campaign.id}`);
      } catch (error) {
        console.error('Error creating CampaignAgent records:', error);
        // Continue without failing campaign creation
      }
    }

    // Automatically create LiveKit trunk based on campaign type
    let livekitTrunk = null;
    try {
      // Find the default active platform trunk
      const platformTrunk = await prisma.platformTrunk.findFirst({
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (platformTrunk) {
        const sipClient = LiveKitService.getSipClient();
        const trunkName = `${campaign.name} - ${campaignType} Trunk`;
        
        let livekitTrunkId = null;
        let provisioningStatus = 'PROVISIONING';
        
        if (campaignType === 'INBOUND') {
          console.log(`Creating LiveKit inbound trunk for campaign: ${campaign.name}`);
          
          // Use validated phone numbers for inbound trunk, or default to '+15555555555'
          const trunkNumbers = validatedPhoneNumbers.length > 0 ? validatedPhoneNumbers : ['+15555555555'];
          console.log(`Using phone numbers for inbound trunk: ${trunkNumbers.join(', ')}`);
          
          const trunkOptions = {
            krispEnabled: true,
          };
          
          const inboundTrunk = await sipClient.createSipInboundTrunk(
            trunkName,
            trunkNumbers,
            trunkOptions,
          );
          livekitTrunkId = inboundTrunk.sipTrunkId;
          provisioningStatus = 'ACTIVE';
          
          console.log(`Successfully provisioned LiveKit inbound trunk: ${livekitTrunkId}`);
        } else if (campaignType === 'OUTBOUND') {
          console.log(`Creating LiveKit outbound trunk for campaign: ${campaign.name}`);
          
          // For outbound trunks, don't pass phone numbers (numberIds is ignored)
          const trunkNumbers = ['+15555555555']; // Default numbers for outbound
          console.log(`Using default numbers for outbound trunk: ${trunkNumbers.join(', ')}`);
          
          const trunkOptions = {
            krispEnabled: true,
            transport: SIPTransport.SIP_TRANSPORT_AUTO
          };
          
          const outboundTrunk = await sipClient.createSipOutboundTrunk(
            trunkName,
            `${platformTrunk.id}.pstn.twilio.com`,
            trunkNumbers,
            trunkOptions,
          );
          livekitTrunkId = outboundTrunk.sipTrunkId;
          provisioningStatus = 'ACTIVE';
          
          console.log(`Successfully provisioned LiveKit outbound trunk: ${livekitTrunkId}`);
        }

        // Create LiveKit trunk record in database
        if (livekitTrunkId) {
          livekitTrunk = await prisma.liveKitTrunk.create({
            data: {
              name: trunkName,
              description: `Auto-created trunk for campaign: ${campaign.name}`,
              trunkType: campaignType,
              livekitTrunkId,
              status: provisioningStatus,
              tenantId,
              platformTrunkId: platformTrunk.id,
              campaignId: campaign.id,
              maxConcurrentCalls: 10,
              codecPreferences: ['G722']
            }
          });
          
          console.log(`Created LiveKit trunk record: ${livekitTrunk.id}`);
        }
      } else {
        console.warn('No active platform trunk found - LiveKit trunk not created for campaign');
      }
    } catch (livekitError) {
      console.error('Error creating LiveKit trunk for campaign:', livekitError);
      // Continue without failing the entire campaign creation
    }

    // Create dispatch rule for the campaign
    let dispatchRule = null;
    if (livekitTrunk && livekitTrunk.livekitTrunkId && primaryAgentName) {
      try {
        console.log(`Creating dispatch rule for campaign: ${campaign.name} with agent: ${primaryAgentName}`);

        const dispatchRuleResult = await LiveKitService.createDispatchRuleForCampaign(
          campaign,
          primaryAgentName,
          livekitTrunk.livekitTrunkId
        );
        
        if (dispatchRuleResult && dispatchRuleResult.livekitDispatchRuleId) {
          // Create dispatch rule record in database
          dispatchRule = await prisma.dispatchRule.create({
            data: {
              name: dispatchRuleResult.name,
              agentName: dispatchRuleResult.agentName,
              livekitDispatchRuleId: dispatchRuleResult.livekitDispatchRuleId,
              ruleType: dispatchRuleResult.ruleType,
              roomName: dispatchRuleResult.roomName,
              status: dispatchRuleResult.status,
              tenantId,
              campaignId: campaign.id,
              livekitTrunkId: livekitTrunk.id
            }
          });
          
          console.log(`Created dispatch rule record: ${dispatchRule.id}`);
        } else {
          console.warn('Failed to create dispatch rule in LiveKit:', dispatchRuleResult?.error);
        }
      } catch (dispatchRuleError) {
        console.error('Error creating dispatch rule for campaign:', dispatchRuleError);
        // Continue without failing the entire campaign creation
      }
    } else {
      if (!livekitTrunk || !livekitTrunk.livekitTrunkId) {
        console.warn('No LiveKit trunk available - dispatch rule not created for campaign');
      } else if (!primaryAgentName) {
        console.log('No agent provided - dispatch rule creation skipped for campaign');
      }
    }

    res.status(201).json({
      data: {
        ...campaign,
        livekitTrunk: livekitTrunk ? {
          id: livekitTrunk.id,
          name: livekitTrunk.name,
          livekitTrunkId: livekitTrunk.livekitTrunkId,
          status: livekitTrunk.status,
          trunkType: livekitTrunk.trunkType
        } : null,
        dispatchRule: dispatchRule ? {
          id: dispatchRule.id,
          name: dispatchRule.name,
          agentName: dispatchRule.agentName,
          livekitDispatchRuleId: dispatchRule.livekitDispatchRuleId,
          ruleType: dispatchRule.ruleType,
          roomName: dispatchRule.roomName,
          status: dispatchRule.status
        } : null
      },
      message: 'Campaign created successfully' + 
               (livekitTrunk ? ' with LiveKit trunk' : '') +
               (dispatchRule ? ' and dispatch rule' : '')
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create campaign',
        code: 'CREATE_CAMPAIGN_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/tenants/{tenantId}/campaigns/{id}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID (must match JWT acct field)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Campaign name
 *               agentName:
 *                 type: string
 *                 description: Agent name to be assigned to the dispatch rule
 *               description:
 *                 type: string
 *                 description: Campaign description
 *               campaignType:
 *                 type: string
 *                 enum: [INBOUND, OUTBOUND]
 *                 description: Campaign type for inbound or outbound operations
 *               isActive:
 *                 type: boolean
 *                 description: Campaign active status
 *               numberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone number IDs to assign to this campaign
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 */
router.put('/:tenantId/campaigns/:id', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId, id } = req.params;

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findFirst({
      where: { 
        id,
        tenantId 
      }
    });

    if (!existingCampaign) {
      return res.status(404).json({
        error: {
          message: 'Campaign not found',
          code: 'CAMPAIGN_NOT_FOUND'
        }
      });
    }

    const validationErrors = ValidationService.validateCampaignData({ ...existingCampaign, ...req.body });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    // Check for name uniqueness if name is being updated
    if (req.body.name && req.body.name.trim() !== existingCampaign.name) {
      const conflictingCampaign = await prisma.campaign.findFirst({
        where: {
          tenantId,
          name: req.body.name.trim(),
          id: { not: id }
        }
      });

      if (conflictingCampaign) {
        return res.status(409).json({
          error: {
            message: 'Campaign with this name already exists',
            code: 'CAMPAIGN_NAME_EXISTS'
          }
        });
      }
    }

    const { name, agentName, description, isActive, campaignType, numberIds } = req.body;

    // Validate numbers array if provided
    if (numberIds !== undefined) {
      if (!Array.isArray(numberIds)) {
        return res.status(400).json({
          error: {
            message: 'numberIds must be an array of phone number IDs',
            code: 'VALIDATION_ERROR'
          }
        });
      }

      // Validate that all numberIds are valid phone number IDs for this tenant
      if (numberIds.length > 0) {
        const phoneNumberIds = await prisma.phoneNumber.findMany({
          where: {
            id: { in: numberIds },
            tenantId
          },
          select: {
            id: true,
            number: true,
            campaignId: true
          }
        });

        if (phoneNumberIds.length !== numberIds.length) {
          const foundIds = phoneNumberIds.map(pn => pn.id);
          const missingIds = numberIds.filter(id => !foundIds.includes(id));
          
          return res.status(400).json({
            error: {
              message: 'Some phone number IDs are invalid or do not belong to this tenant',
              code: 'INVALID_PHONE_NUMBERS',
              details: {
                invalidIds: missingIds,
                validIds: foundIds
              }
            }
          });
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (campaignType !== undefined) updateData.campaignType = campaignType;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    });

    // Handle phone number assignments if numberIds array is provided
    let phoneNumberUpdates = null;
    if (numberIds !== undefined) {
      try {
        console.log(`Updating phone number assignments for campaign: ${campaign.name}`);
        
        // First, remove campaign assignment from all current phone numberIds
        await prisma.phoneNumber.updateMany({
          where: {
            campaignId: id,
            tenantId
          },
          data: {
            campaignId: null
          }
        });

        // Then assign the new phone numberIds to this campaign
        if (numberIds.length > 0) {
          const updateResult = await prisma.phoneNumber.updateMany({
            where: {
              id: { in: numberIds },
              tenantId
            },
            data: {
              campaignId: id
            }
          });

          phoneNumberUpdates = {
            removed: 'all previous assignments',
            assigned: updateResult.count,
            phoneNumberIds: numberIds
          };

          console.log(`Successfully assigned ${updateResult.count} phone numberIds to campaign: ${campaign.name}`);
        } else {
          phoneNumberUpdates = {
            removed: 'all previous assignments',
            assigned: 0,
            phoneNumberIds: []
          };
          
          console.log(`Removed all phone number assignments from campaign: ${campaign.name}`);
        }
      } catch (phoneUpdateError) {
        console.error('Error updating phone number assignments:', phoneUpdateError);
        return res.status(500).json({
          error: {
            message: 'Failed to update phone number assignments',
            code: 'PHONE_NUMBER_UPDATE_ERROR'
          }
        });
      }
    }

    // Update associated LiveKit trunk with current phone numberIds (if numberIds were updated)
    let trunkUpdateResult = null;
    if (numberIds !== undefined) {
      try {
        console.log(`Updating LiveKit trunk for updated campaign: ${campaign.name}`);
        
        // Update the LiveKit trunk with current campaign phone numbers
        trunkUpdateResult = await LiveKitService.updateCampaignTrunk(
          campaign,
          tenantId,
          prisma
        );
        
        if (trunkUpdateResult) {
          console.log(`Successfully updated LiveKit trunk for campaign: ${campaign.name}`);
        } else {
          console.log(`No LiveKit trunk found or updated for campaign: ${campaign.name}`);
        }
      } catch (trunkError) {
        console.error('Error updating LiveKit trunk after campaign update:', trunkError);
        // Don't fail the campaign update if trunk update fails
        trunkUpdateResult = {
          status: 'error',
          error: trunkError.message
        };
      }
    }

    // Update dispatch rule if agentName is provided
    let dispatchRuleUpdateResult = null;
    if (agentName !== undefined) {
      try {
        console.log(`Updating dispatch rule for campaign: ${campaign.name} with new agent: ${agentName}`);
        
        // Find existing dispatch rule for this campaign
        const existingDispatchRule = await prisma.dispatchRule.findFirst({
          where: {
            campaignId: id,
            tenantId,
            isActive: true
          },
          include: {
            livekitTrunk: {
              select: {
                id: true,
                livekitTrunkId: true
              }
            }
          }
        });

        if (existingDispatchRule && existingDispatchRule.livekitDispatchRuleId) {
          // Update dispatch rule in LiveKit
          const ruleConfig = {
            name: `${campaign.name} Dispatch Rule`,
            agentName: agentName.trim(),
            type: 'direct',
            roomName: `${campaign.name.replace(/\s+/g, '-').toLowerCase()}-${campaign.campaignType.toLowerCase()}`,
            trunkIds: existingDispatchRule.livekitTrunk?.livekitTrunkId ? [existingDispatchRule.livekitTrunk.livekitTrunkId] : [],
            metadata: {
              campaignId: campaign.id,
              campaignType: campaign.campaignType,
              tenantId: campaign.tenantId
            }
          };

          try {
            const updatedDispatchRule = await LiveKitService.updateSipDispatchRule(
              existingDispatchRule.livekitDispatchRuleId,
              ruleConfig
            );

            // Update dispatch rule record in database
            const updatedDispatchRuleRecord = await prisma.dispatchRule.update({
              where: { id: existingDispatchRule.id },
              data: {
                name: ruleConfig.name,
                agentName: ruleConfig.agentName,
                roomName: ruleConfig.roomName,
                status: 'ACTIVE',
                updatedAt: new Date()
              }
            });

            dispatchRuleUpdateResult = {
              status: 'success',
              dispatchRuleId: updatedDispatchRule.sipDispatchRuleId,
              agentName: ruleConfig.agentName,
              roomName: ruleConfig.roomName
            };

            console.log(`Successfully updated dispatch rule for campaign: ${campaign.name}`);
          } catch (livekitUpdateError) {
            console.error('Error updating dispatch rule in LiveKit:', livekitUpdateError);
            dispatchRuleUpdateResult = {
              status: 'error',
              error: 'Failed to update dispatch rule in LiveKit: ' + livekitUpdateError.message
            };
          }
        } else if (existingDispatchRule) {
          // Dispatch rule exists in DB but not in LiveKit - update DB only
          await prisma.dispatchRule.update({
            where: { id: existingDispatchRule.id },
            data: {
              agentName: agentName.trim(),
              updatedAt: new Date()
            }
          });

          dispatchRuleUpdateResult = {
            status: 'success',
            message: 'Updated dispatch rule in database (no LiveKit rule to update)',
            agentName: agentName.trim()
          };
        } else {
          // No existing dispatch rule - create a new one if there's a LiveKit trunk
          const livekitTrunk = await prisma.liveKitTrunk.findFirst({
            where: {
              campaignId: id,
              tenantId,
              isActive: true
            }
          });

          if (livekitTrunk && livekitTrunk.livekitTrunkId) {
            const dispatchRuleResult = await LiveKitService.createDispatchRuleForCampaign(
              campaign,
              agentName.trim(),
              livekitTrunk.livekitTrunkId
            );

            if (dispatchRuleResult && dispatchRuleResult.livekitDispatchRuleId) {
              await prisma.dispatchRule.create({
                data: {
                  name: dispatchRuleResult.name,
                  agentName: dispatchRuleResult.agentName,
                  livekitDispatchRuleId: dispatchRuleResult.livekitDispatchRuleId,
                  ruleType: dispatchRuleResult.ruleType,
                  roomName: dispatchRuleResult.roomName,
                  status: dispatchRuleResult.status,
                  tenantId,
                  campaignId: campaign.id,
                  livekitTrunkId: livekitTrunk.id
                }
              });

              dispatchRuleUpdateResult = {
                status: 'created',
                dispatchRuleId: dispatchRuleResult.livekitDispatchRuleId,
                agentName: dispatchRuleResult.agentName,
                message: 'Created new dispatch rule for campaign'
              };
            }
          } else {
            dispatchRuleUpdateResult = {
              status: 'skipped',
              message: 'No LiveKit trunk available for dispatch rule creation'
            };
          }
        }
      } catch (dispatchRuleError) {
        console.error('Error updating dispatch rule for campaign:', dispatchRuleError);
        dispatchRuleUpdateResult = {
          status: 'error',
          error: dispatchRuleError.message
        };
      }
    }

    res.json({
      data: campaign,
      message: 'Campaign updated successfully' + 
               (phoneNumberUpdates ? ` with ${phoneNumberUpdates.assigned} phone numbers assigned` : '') +
               (trunkUpdateResult && trunkUpdateResult.sipTrunkId ? ' and LiveKit trunk updated' : '') +
               (dispatchRuleUpdateResult && dispatchRuleUpdateResult.status === 'success' ? ' and dispatch rule updated' : '') +
               (dispatchRuleUpdateResult && dispatchRuleUpdateResult.status === 'created' ? ' and dispatch rule created' : ''),
      phoneNumberUpdates: phoneNumberUpdates,
      livekitTrunkUpdate: trunkUpdateResult ? {
        status: trunkUpdateResult.sipTrunkId ? 'success' : (trunkUpdateResult.status || 'error'),
        trunkId: trunkUpdateResult.sipTrunkId || null,
        ...(trunkUpdateResult.error && { error: trunkUpdateResult.error })
      } : null,
      dispatchRuleUpdate: dispatchRuleUpdateResult ? {
        status: dispatchRuleUpdateResult.status,
        dispatchRuleId: dispatchRuleUpdateResult.dispatchRuleId || null,
        agentName: dispatchRuleUpdateResult.agentName || null,
        ...(dispatchRuleUpdateResult.message && { message: dispatchRuleUpdateResult.message }),
        ...(dispatchRuleUpdateResult.error && { error: dispatchRuleUpdateResult.error })
      } : null
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update campaign',
        code: 'UPDATE_CAMPAIGN_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/tenants/{tenantId}/campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID (must match JWT acct field)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 */
router.delete('/:tenantId/campaigns/:id', authenticateToken, requireTenantAccess, async (req, res) => {
  try {
    const { tenantId, id } = req.params;

    const existingCampaign = await prisma.campaign.findFirst({
      where: { 
        id,
        tenantId 
      }
    });

    if (!existingCampaign) {
      return res.status(404).json({
        error: {
          message: 'Campaign not found',
          code: 'CAMPAIGN_NOT_FOUND'
        }
      });
    }

    // Clean up associated dispatch rules before deleting campaign
    let dispatchRuleCleanupResults = [];
    try {
      console.log(`Cleaning up dispatch rules for campaign: ${existingCampaign.name}`);
      
      // Find all dispatch rules associated with this campaign
      const campaignDispatchRules = await prisma.dispatchRule.findMany({
        where: {
          campaignId: id,
          tenantId
        }
      });

      console.log(`Found ${campaignDispatchRules.length} dispatch rules to clean up`);

      // Delete each dispatch rule from LiveKit and database
      for (const dispatchRule of campaignDispatchRules) {
        let cleanupResult = {
          ruleId: dispatchRule.id,
          agentName: dispatchRule.agentName,
          livekitCleanup: 'skipped',
          databaseCleanup: 'pending'
        };

        // Delete from LiveKit if it has a LiveKit dispatch rule ID
        if (dispatchRule.livekitDispatchRuleId) {
          try {
            console.log(`Deleting dispatch rule from LiveKit: ${dispatchRule.livekitDispatchRuleId}`);
            await LiveKitService.deleteSipDispatchRule(dispatchRule.livekitDispatchRuleId);
            cleanupResult.livekitCleanup = 'success';
            console.log(`Successfully deleted dispatch rule from LiveKit: ${dispatchRule.livekitDispatchRuleId}`);
          } catch (livekitDeleteError) {
            console.error('Error deleting dispatch rule from LiveKit:', livekitDeleteError);
            cleanupResult.livekitCleanup = 'error';
            cleanupResult.livekitError = livekitDeleteError.message;
          }
        } else {
          cleanupResult.livekitCleanup = 'no_livekit_id';
        }

        // Delete from database
        try {
          await prisma.dispatchRule.delete({
            where: { id: dispatchRule.id }
          });
          cleanupResult.databaseCleanup = 'success';
          console.log(`Successfully deleted dispatch rule from database: ${dispatchRule.id}`);
        } catch (dbDeleteError) {
          console.error('Error deleting dispatch rule from database:', dbDeleteError);
          cleanupResult.databaseCleanup = 'error';
          cleanupResult.databaseError = dbDeleteError.message;
        }

        dispatchRuleCleanupResults.push(cleanupResult);
      }
    } catch (cleanupError) {
      console.error('Error during dispatch rule cleanup:', cleanupError);
      // Continue with campaign deletion even if cleanup fails
      dispatchRuleCleanupResults.push({
        error: 'Cleanup process failed: ' + cleanupError.message
      });
    }

    // Note: When campaign is deleted, phone numbers are not deleted
    // They just have their campaignId set to null due to onDelete: SetNull
    await prisma.campaign.delete({
      where: { id }
    });

    const successfulCleanups = dispatchRuleCleanupResults.filter(r => r.databaseCleanup === 'success').length;
    const totalRules = dispatchRuleCleanupResults.length;

    res.json({ 
      message: 'Campaign deleted successfully' + 
               (totalRules > 0 ? ` with ${successfulCleanups}/${totalRules} dispatch rules cleaned up` : ''),
      dispatchRuleCleanup: {
        totalRules,
        successfulCleanups,
        results: dispatchRuleCleanupResults
      }
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete campaign',
        code: 'DELETE_CAMPAIGN_ERROR'
      }
    });
  }
});

module.exports = router;