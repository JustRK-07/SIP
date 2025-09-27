import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { parse } from "csv-parse/sync";

export const csvRouter = createTRPCRouter({
  uploadCsv: publicProcedure
    .input(
      z.object({
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Parse CSV content
        const records = parse(input.content, {
          columns: true,
          skip_empty_lines: true,
        });

        // Validate and insert records
        const insertPromises = records.map((record: any) => {
          return ctx.prisma.csvData.create({
            data: {
              phoneNumber: record.phoneNumber || "",
              name: record.name || null,
            },
          });
        });

        await Promise.all(insertPromises);
        return { success: true, count: records.length };
      } catch (error) {
        console.error("Error processing CSV:", error);
        throw new Error("Failed to process CSV file");
      }
    }),

  getAllRecords: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.csvData.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  updateProcessedStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        processed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.csvData.update({
        where: { id: input.id },
        data: { processed: input.processed },
      });
    }),
}); 