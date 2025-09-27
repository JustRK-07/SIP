import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const leadListRouter = createTRPCRouter({
  // Get all lead lists
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.leadList.findMany({
      include: {
        _count: {
          select: {
            leads: true,
          },
        },
        assignedCampaigns: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get lead list details
  getDetails: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const leadList = await ctx.prisma.leadList.findUnique({
        where: { id: input.id },
        include: {
          leads: {
            orderBy: { createdAt: "desc" },
          },
          assignedCampaigns: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!leadList) {
        throw new Error("Lead list not found");
      }

      return {
        ...leadList,
        totalLeads: leadList.leads.length,
        processedLeads: leadList.leads.filter(lead => lead.status === "PROCESSED").length,
      };
    }),

  // Create new lead list
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.leadList.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),

  // Upload leads to a list
  uploadLeads: publicProcedure
    .input(
      z.object({
        listId: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lines = input.content.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least one data row");
      }

      const phoneIndex = headers.findIndex(h => h.includes('phone'));
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));

      if (phoneIndex === -1) {
        throw new Error("CSV file must contain a phone number column");
      }

      const leads = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]?.split(',').map(v => v.trim()) || [];
        if (values[phoneIndex]) {
          leads.push({
            phoneNumber: values[phoneIndex],
            name: nameIndex !== -1 ? values[nameIndex] : null,
            email: emailIndex !== -1 ? values[emailIndex] : null,
            listId: input.listId,
            status: "PENDING" as const,
          });
        }
      }

      if (leads.length === 0) {
        throw new Error("No valid leads found in CSV file");
      }

      // Create leads in batches
      const batchSize = 100;
      let createdCount = 0;
      
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        await ctx.prisma.lead.createMany({
          data: batch,
          skipDuplicates: true,
        });
        createdCount += batch.length;
      }

      return { count: createdCount };
    }),

  // Assign lead list to campaign
  assignToList: publicProcedure
    .input(
      z.object({
        listId: z.string(),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if lead list exists
      const leadList = await ctx.prisma.leadList.findUnique({
        where: { id: input.listId },
      });

      if (!leadList) {
        throw new Error("Lead list not found");
      }

      // Check if campaign exists
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Get all leads from the list
      const leads = await ctx.prisma.lead.findMany({
        where: { listId: input.listId },
      });

      // Create campaign leads
      const campaignLeads = leads.map(lead => ({
        phoneNumber: lead.phoneNumber,
        name: lead.name,
        email: lead.email,
        campaignId: input.campaignId,
        status: "PENDING" as const,
      }));

      // Create leads in batches
      const batchSize = 100;
      let createdCount = 0;
      
      for (let i = 0; i < campaignLeads.length; i += batchSize) {
        const batch = campaignLeads.slice(i, i + batchSize);
        await ctx.prisma.lead.createMany({
          data: batch,
          skipDuplicates: true,
        });
        createdCount += batch.length;
      }

      // Update lead list to mark as assigned
      await ctx.prisma.leadList.update({
        where: { id: input.listId },
        data: {
          assignedCampaigns: {
            connect: { id: input.campaignId },
          },
        },
      });

      return { count: createdCount };
    }),

  // Delete lead list
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete all leads in the list first
      await ctx.prisma.lead.deleteMany({
        where: { listId: input.id },
      });

      // Delete the lead list
      return ctx.prisma.leadList.delete({
        where: { id: input.id },
      });
    }),
});

