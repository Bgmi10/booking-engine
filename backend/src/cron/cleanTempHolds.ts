import cron from "node-cron";
import prisma from "../prisma";

export const cleanExpiredTempHolds = () => {
  cron.schedule("0 */7 * * *", async () => {
    const now = new Date();
    try {
      const deleted = await prisma.temporaryHold.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });
      if (deleted.count > 0) {
        console.log(`[Cron] Deleted ${deleted.count} expired temporary holds at ${now.toISOString()}`);
      }
    } catch (err) {
      console.error("[Cron] Failed to delete expired temporary holds", err);
    }
  });
};
