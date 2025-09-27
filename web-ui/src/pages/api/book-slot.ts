import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: "Name and date are required" });
    }
    let dateTime: Date;
    try {
      dateTime = new Date(date);
      dateTime.toISOString();
    } catch (error) {
      return res.status(400).json({
        error: "Invalid date format. Please provide a valid ISO date string",
      });
    }

    const slot = await db.slot.create({
      data: {
        name,
        date: dateTime,
      },
    });

    return res.status(200).json({
      success: true,
      slot,
      message: "Slot booked successfully",
    });
  } catch (error) {
    console.error("Error booking slot:", error);
    return res.status(500).json({ error: "Failed to book slot" });
  }
}
