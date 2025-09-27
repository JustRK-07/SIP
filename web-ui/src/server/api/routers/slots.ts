import { z } from "zod";
import { TRPCClientError } from "@trpc/client";
import { createTRPCRouter, publicProcedure } from "../trpc";

// Shared input schema
const slotSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  date: z.string().refine(
    (date) => {
      try {
        new Date(date).toISOString();
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Invalid date format. Please provide a valid ISO date string",
    }
  ),
});

export const slotsRouter = createTRPCRouter({
  // ✅ Book a single slot
  bookSlot: publicProcedure
    .input(slotSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const dateTime = new Date(input.date);

        const slot = await ctx.prisma.slot.create({
          data: {
            name: input.name,
            date: dateTime,
          },
        });

        return {
          success: true,
          slot,
          message: "Slot booked successfully",
        };
      } catch (error) {
        console.error("Error booking slot:", error);
        throw new TRPCClientError("Failed to book slot");
      }
    }),

  // ✅ Get all slots
  getAllSlots: publicProcedure.query(async ({ ctx }) => {
    try {
      const slots = await ctx.prisma.slot.findMany({
        orderBy: { date: "desc" },
      });
      return slots;
    } catch (error) {
      console.error("Error fetching slots:", error);
      throw new TRPCClientError("Failed to fetch slots");
    }
  }),

  // ✅ Upload file (raw content into DB)
  uploadFile: publicProcedure
    .input(
      z.object({
        name: z.string(),
        content: z.string(), // base64 or raw text
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const file = await ctx.prisma.file.create({
          data: {
            name: input.name,
            content: input.content,
          },
        });
        return { success: true, file };
      } catch (err) {
        console.error("File upload error:", err);
        throw new TRPCClientError("File upload failed.");
      }
    }),

  // ✅ Bulk insert slots from Excel/CSV
  bulkInsertSlots: publicProcedure
    .input(
      z.object({
        slots: z.array(slotSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const created = await ctx.prisma.slot.createMany({
          data: input.slots.map((s) => ({
            name: s.name,
            date: new Date(s.date),
          })),
        });

        return { success: true, count: created.count };
      } catch (err) {
        console.error("Bulk insert failed:", err);
        throw new TRPCClientError("Bulk insert failed.");
      }
    }),
});
