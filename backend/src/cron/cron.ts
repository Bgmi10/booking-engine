import cron from "node-cron";
import prisma from "../prisma";
import { licensePlateCleanupService } from "../services/licensePlateCleanupService";
import { dahuaService } from "../services/dahuaService";
import { notificationService } from "../services/notificationService";
import { PaymentReminderService } from "../services/paymentReminderService";
import { WeddingReminderService } from "../services/weddingReminderService";
import { cashReminderService } from "../services/cashReminderService";

const now = new Date();

export const cleanExpiredTempHolds = () => {
  cron.schedule("*/25 * * * *", async () => {
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

export const makeExpiredSessionToInactive = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const paymentIntent = await prisma.paymentIntent.findMany({
        where: { 
          expiresAt: { 
           lte: now
          }
        },
        select: { id: true }
      });

      console.log("log")

      if (!paymentIntent) {
        console.log("No expired session found");
        return 
      }

      if (paymentIntent) {
        for (const payment of paymentIntent) {
          try {
            await prisma.paymentIntent.update({
              where: { id: payment.id },
              data: {
                status: "EXPIRED"
              }
            })
          } catch (e) {
           console.log(e)
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  })
}

export const cleanupExpiredLicensePlates = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("[Cron] Starting license plate cleanup...");
      await licensePlateCleanupService.cleanupExpiredLicensePlates();
      console.log("[Cron] License plate cleanup completed");
    } catch (error) {
      console.error("[Cron] License plate cleanup failed:", error);
    }
  });
};

export const initializeDahuaService = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[Cron] Initializing Dahua service...");
      await dahuaService.initialize();
      console.log("[Cron] Dahua service initialization completed");
    } catch (error) {
      console.error("[Cron] Dahua service initialization failed:", error);
    }
  });
};

export const triggerAutomatedTasks = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("[Cron] Starting automated task triggering...");
      const triggeredTasks = await notificationService.triggerAutomatedTasks();
      console.log(`[Cron] Automated task triggering completed. Created ${triggeredTasks.length} tasks`);
    } catch (error) {
      console.error("[Cron] Automated task triggering failed:", error);
    }
  });
};

export const schedulePaymentReminders = () => {
  // Process all payment reminders (wedding + booking) every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[Cron] Starting comprehensive payment reminder processing...");
      const totalReminders = await PaymentReminderService.processAllPaymentReminders();
      console.log(`[Cron] Comprehensive payment reminder processing complete. Total reminders sent: ${totalReminders}`);
    } catch (error) {
      console.error("[Cron] Failed to process payment reminders:", error);
    }
  });
};

// Schedule wedding final guest count reminders - runs daily at 9 AM
export const scheduleWeddingReminders = () => {
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("[Cron] Starting wedding final guest count reminder check...");
      const remindersSent = await WeddingReminderService.checkAndSendReminders();
      console.log(`[Cron] Sent ${remindersSent} wedding guest count reminders`);
    } catch (error) {
      console.error("[Cron] Error in wedding reminder job:", error);
    }
  });
};

// Schedule cash collection reminders - runs daily at configured time
export const scheduleCashReminders = () => {
  cron.schedule("0 18 * * *", async () => { // Default to 6 PM
    try {
      console.log("[Cron] Starting cash reminder checks...");
      const remindersSent = await cashReminderService.checkAndSendCashReminders();
      console.log(`[Cron] Sent ${remindersSent} cash reminders`);
    } catch (error) {
      console.error("[Cron] Error in cash reminder job:", error);
    }
  });
};

// // Schedule daily cash summary emails - runs daily at 8 AM// Schedule cash summary emails every 2 seconds
// export const scheduleDailyCashSummaryEmails = () => {
//   setInterval(async () => {
//     try {
//       console.log("[Interval] Starting cash summary emails...");
//       const emailsSent = await cashReminderService.sendDailySummaryEmail();
//       console.log(`[Interval] Sent ${emailsSent} cash summary emails`);
//     } catch (error) {
//       console.error("[Interval] Error sending cash summary emails:", error);
//     }
//   }, 2000); // 2000 milliseconds = 2 seconds
// };
