import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;
let isDbAvailable = false;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  try {
    prismaInstance = new PrismaClient();
    isDbAvailable = true;
  } catch (error: any) {
    console.warn("[Database] PrismaClient initialization warning (PostgreSQL offline):", error?.message || error);
    // Safe proxy that prevents unhandled crashes on import and rejects gracefully during DB operations
    prismaInstance = new Proxy({} as any, {
      get(_target, _prop) {
        return new Proxy({}, {
          get() {
            return () => Promise.reject(new Error("Database unavailable (PostgreSQL is offline)"));
          }
        });
      }
    });
    isDbAvailable = false;
  }

  return prismaInstance!;
}

export const prisma = getPrismaClient();
export const isDatabaseAvailable = () => isDbAvailable;
