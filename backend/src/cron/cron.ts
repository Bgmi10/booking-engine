import cron from "node-cron";
import prisma from "../prisma";
import { licensePlateCleanupService } from "../services/licensePlateCleanupService";
import { dahuaService } from "../services/dahuaService";
import { notificationService } from "../services/notificationService";
import { PaymentReminderService } from "../services/paymentReminderService";
import { WeddingReminderService } from "../services/weddingReminderService";
import { cashReminderService } from "../services/cashReminderService";
import { LicensePlateExportService } from "../services/licensePlateExportService";
import { EmailService } from "../services/emailService";

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

// export const initializeDahuaService = () => {
//   cron.schedule("0 0 * * *", async () => {
//     try {
//       console.log("[Cron] Initializing Dahua service...");
//       await dahuaService.initialize();
//       console.log("[Cron] Dahua service initialization completed");
//     } catch (error) {
//       console.error("[Cron] Dahua service initialization failed:", error);
//     }
//   });
// };

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

export const updateExpiredLicensePlates = () => {
  cron.schedule("0 0 * * *", async () => { // Run daily at midnight
    try {
      console.log("[Cron] Starting expired license plate update...");
    
      const now = new Date();
      
      // Find expired license plates that are still ALLOW_LIST
      // A plate is expired if current time is past its validEndTime
      const expiredPlates = await prisma.licensePlateEntry.findMany({
        where: {
          type: "ALLOW_LIST",
          validEndTime: {
            lt: now
          },
          isActive: true
        }
      });
      
      if (expiredPlates.length === 0) {
        console.log("[Cron] No expired license plates found to update");
      } else {
        // Update expired plates to BLOCK_LIST and set as inactive
        const updateResult = await prisma.licensePlateEntry.updateMany({
          where: {
            id: {
              in: expiredPlates.map(plate => plate.id)
            }
          },
          data: {
            type: "BLOCK_LIST",
            isActive: false, // Mark as inactive when expired
            updatedAt: now
          }
        });
        
        console.log(`[Cron] Updated ${updateResult.count} expired license plates to BLOCK_LIST status`);
        
        // Log the updated plates for tracking
        for (const plate of expiredPlates) {
          console.log(`[Cron] License plate ${plate.plateNo} (${plate.ownerName}) updated to BLOCK_LIST - expired at ${plate.validEndTime}`);
        }
      }

      // Delete old expired license plates based on configured expiry days
      await LicensePlateExportService.deleteExpiredLicensePlates();
      
    } catch (error) {
      console.error("[Cron] Error updating expired license plates:", error);
    }
  });
};

// Dynamic cron job for license plate export email
export const scheduleLicensePlateExport = () => {
  // Check every minute to see if it's time to send the export
  cron.schedule("* * * * *", async () => {
    try {
      const settings = await prisma.generalSettings.findFirst();
      if (!settings || !settings.licensePlateDailyTriggerTime) {
        return; // No settings or no trigger time configured
      }

      // Convert trigger time to Italian timezone
      const now = new Date();
      const italianTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).format(now);

      const triggerTime = settings.licensePlateDailyTriggerTime;

      // Check if current Italian time matches trigger time
      if (italianTime === triggerTime) {
        console.log(`[Cron] License plate export triggered at Italian time: ${italianTime}`);
        await sendLicensePlateExport();
      }
      console.log("time doesnt match to send an csv file email to admin")
    } catch (error) {
      console.error("[Cron] Error in license plate export scheduler:", error);
    }
  });
};

// Function to send license plate export email
const sendLicensePlateExport = async () => {
  try {
    console.log("[License Plate Export] Starting daily export...");

    // Get license plate data and statistics
    const data = await LicensePlateExportService.getLicensePlateData();
    const totalEntries = data.length;
    const activeEntries = data.filter(entry => entry.type === 'ALLOW_LIST').length;

    // Create CSV attachment
    const csvAttachment = await LicensePlateExportService.createCSVAttachment();

    // Get admin email from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("[License Plate Export] ADMIN_EMAIL not configured in environment variables");
      return;
    }

    // Format date for email
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(today);

    // Send email with attachment
    await EmailService.sendEmail({
      to: {
        email: adminEmail,
        name: 'Administrator'
      },
      templateType: 'LICENSE_PLATE_EXPORT',
      templateData: {
        date: formattedDate,
        totalEntries,
        activeEntries
      },
      attachments: [csvAttachment]
    });

    console.log(`[License Plate Export] Export email sent successfully to ${adminEmail} with ${totalEntries} entries`);
  } catch (error) {
    console.error("[License Plate Export] Failed to send export email:", error);
  }
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
