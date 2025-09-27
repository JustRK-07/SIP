import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

declare global {
	var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
	return new PrismaClient({
		log:
			env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
	});
};

export const db = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") globalThis.prisma = db;

export type { PrismaClient };
