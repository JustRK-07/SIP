const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const DatabaseService = require('../services/DatabaseService');
const ResponseService = require('../services/ResponseService');
const ValidationService = require('../services/ValidationService');
const { parse } = require('csv-parse').parse;

const router = express.Router();
const prisma = DatabaseService.getClient();

/**
 * @swagger
 * /api/lead-lists:
 *   get:
 *     summary: Get all lead lists
 *     tags: [Lead Lists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of lead lists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeadList'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leadLists = await prisma.leadList.findMany({
      include: {
        _count: {
          select: {
            leads: true
          }
        },
        assignedCampaigns: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      data: leadLists.map(list => ({
        ...list,
        _count: {
          leads: list._count.leads
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching lead lists:', error);
    ResponseService.internalError(res, error, 'Failed to fetch lead lists');
  }
});

/**
 * @swagger
 * /api/lead-lists/{id}:
 *   get:
 *     summary: Get lead list details
 *     tags: [Lead Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead list ID
 *     responses:
 *       200:
 *         description: Lead list details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LeadList'
 *       404:
 *         description: Lead list not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const leadList = await prisma.leadList.findUnique({
      where: { id },
      include: {
        leads: {
          take: 100,
          orderBy: {
            createdAt: 'desc'
          }
        },
        assignedCampaigns: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            leads: true
          }
        }
      }
    });

    if (!leadList) {
      return ResponseService.notFound(res, 'Lead list not found');
    }

    res.json({ data: leadList });
  } catch (error) {
    console.error('Error fetching lead list:', error);
    ResponseService.internalError(res, error, 'Failed to fetch lead list');
  }
});

/**
 * @swagger
 * /api/lead-lists:
 *   post:
 *     summary: Create new lead list
 *     tags: [Lead Lists]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Lead list name
 *               description:
 *                 type: string
 *                 description: Lead list description
 *     responses:
 *       201:
 *         description: Lead list created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LeadList'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return ResponseService.badRequest(res, 'Lead list name is required');
    }

    // Create lead list
    const leadList = await prisma.leadList.create({
      data: {
        name,
        description
      },
      include: {
        _count: {
          select: {
            leads: true
          }
        }
      }
    });

    res.status(201).json({
      data: leadList,
      message: 'Lead list created successfully'
    });
  } catch (error) {
    console.error('Error creating lead list:', error);
    ResponseService.internalError(res, error, 'Failed to create lead list');
  }
});

/**
 * @swagger
 * /api/lead-lists/{id}/upload:
 *   post:
 *     summary: Upload leads to a lead list
 *     tags: [Lead Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead list ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: CSV content with leads
 *               campaignId:
 *                 type: string
 *                 description: Optional campaign ID to assign leads to
 *     responses:
 *       200:
 *         description: Leads uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLeads:
 *                       type: number
 *                     newLeads:
 *                       type: number
 *                     duplicates:
 *                       type: number
 *       400:
 *         description: Bad request
 *       404:
 *         description: Lead list not found
 *       500:
 *         description: Server error
 */
router.post('/:id/upload', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, campaignId } = req.body;

    if (!content) {
      return ResponseService.badRequest(res, 'CSV content is required');
    }

    // Check if lead list exists
    const leadList = await prisma.leadList.findUnique({
      where: { id }
    });

    if (!leadList) {
      return ResponseService.notFound(res, 'Lead list not found');
    }

    // Parse CSV content
    let records;
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseError) {
      return ResponseService.badRequest(res, 'Invalid CSV format');
    }

    if (!records || records.length === 0) {
      return ResponseService.badRequest(res, 'No valid records found in CSV');
    }

    // Get existing phone numbers to check for duplicates
    const phoneNumbers = records.map(r => r.phoneNumber || r.phone || r.Phone || r['Phone Number']);
    const existingLeads = await prisma.lead.findMany({
      where: {
        listId: id,
        phoneNumber: {
          in: phoneNumbers
        }
      },
      select: {
        phoneNumber: true
      }
    });

    const existingNumbers = new Set(existingLeads.map(l => l.phoneNumber));

    // Prepare leads for insertion
    const newLeads = [];
    let duplicates = 0;

    for (const record of records) {
      const phoneNumber = record.phoneNumber || record.phone || record.Phone || record['Phone Number'];
      const name = record.name || record.Name || record['Full Name'] || '';
      const email = record.email || record.Email || '';

      if (!phoneNumber) continue;

      if (existingNumbers.has(phoneNumber)) {
        duplicates++;
        continue;
      }

      newLeads.push({
        phoneNumber,
        name,
        email,
        listId: id,
        campaignId: campaignId || null,
        status: 'PENDING'
      });
    }

    // Insert new leads
    let inserted = 0;
    if (newLeads.length > 0) {
      const result = await prisma.lead.createMany({
        data: newLeads,
        skipDuplicates: true
      });
      inserted = result.count;
    }

    // If campaign is provided, associate the list with the campaign
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (campaign) {
        await prisma.leadList.update({
          where: { id },
          data: {
            assignedCampaigns: {
              connect: { id: campaignId }
            }
          }
        });
      }
    }

    res.json({
      message: 'Leads uploaded successfully',
      data: {
        totalLeads: records.length,
        newLeads: inserted,
        duplicates: duplicates
      }
    });

  } catch (error) {
    console.error('Error uploading leads:', error);
    ResponseService.internalError(res, error, 'Failed to upload leads');
  }
});

/**
 * @swagger
 * /api/lead-lists/{id}:
 *   put:
 *     summary: Update lead list
 *     tags: [Lead Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead list ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Lead list name
 *               description:
 *                 type: string
 *                 description: Lead list description
 *     responses:
 *       200:
 *         description: Lead list updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LeadList'
 *                 message:
 *                   type: string
 *       404:
 *         description: Lead list not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if lead list exists
    const existingList = await prisma.leadList.findUnique({
      where: { id }
    });

    if (!existingList) {
      return ResponseService.notFound(res, 'Lead list not found');
    }

    // Update lead list
    const updatedList = await prisma.leadList.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      },
      include: {
        _count: {
          select: {
            leads: true
          }
        },
        assignedCampaigns: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      data: updatedList,
      message: 'Lead list updated successfully'
    });
  } catch (error) {
    console.error('Error updating lead list:', error);
    ResponseService.internalError(res, error, 'Failed to update lead list');
  }
});

/**
 * @swagger
 * /api/lead-lists/{id}:
 *   delete:
 *     summary: Delete lead list
 *     tags: [Lead Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead list ID
 *     responses:
 *       200:
 *         description: Lead list deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Lead list not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if lead list exists
    const leadList = await prisma.leadList.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            leads: true
          }
        }
      }
    });

    if (!leadList) {
      return ResponseService.notFound(res, 'Lead list not found');
    }

    // Delete all leads in the list first
    await prisma.lead.deleteMany({
      where: { listId: id }
    });

    // Delete the lead list
    await prisma.leadList.delete({
      where: { id }
    });

    res.json({
      message: `Lead list deleted successfully (${leadList._count.leads} leads removed)`
    });
  } catch (error) {
    console.error('Error deleting lead list:', error);
    ResponseService.internalError(res, error, 'Failed to delete lead list');
  }
});

module.exports = router;