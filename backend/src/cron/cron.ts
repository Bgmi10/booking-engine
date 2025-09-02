import cron from "node-cron";
import prisma from "../prisma";
import { notificationService } from "../services/notificationService";
import { PaymentReminderService } from "../services/paymentReminderService";
import { WeddingReminderService } from "../services/weddingReminderService";
import { cashReminderService } from "../services/cashReminderService";
import { LicensePlateExportService } from "../services/licensePlateExportService";
import { EmailService } from "../services/emailService";
import beds24Service from "../services/beds24Service";

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
//       console.log("[Interval] Starting cash sync emails...");
//       const emailsSent = await cashReminderService.sendDailySummaryEmail();
//       console.log(`[Interval] Sent ${emailsSent} cash summary emails`);
//     } catch (error) {
//       console.error("[Interval] Error sending cash summary emails:", error);
//     }
//   }, 2000); // 2000 milliseconds = 2 seconds
// };

// Channel Manager Sync Configuration
const MAX_RETRY_ATTEMPTS = 3;
let isChannelSyncRunning = false;

// Main channel sync cron job - runs every 15 minutes
export const startChannelSync = () => {
  console.log('[Channel Sync] Cron job scheduled: every 15 minutes');
  
  // Mark all mapped rooms for initial sync on startup
  markAllMappedRoomsForSync();
  
  cron.schedule('*/1 * * * *', async () => {
    if (isChannelSyncRunning) {
      console.log('[Channel Sync] Already running, skipping...');
      return;
    }

    try {
      isChannelSyncRunning = true;
      console.log('[Channel Sync] Starting automated sync...');
      await runChannelSync();
      console.log('[Channel Sync] Completed successfully');
    } catch (error) {
      console.error('[Channel Sync] Error:', error);
    } finally {
      isChannelSyncRunning = false;
    }
  });
};

// Main sync execution function
async function runChannelSync() {
  // Sync in order for efficiency
  await syncRooms();
  await syncRatePolicies();
  await syncRateDatePrices();
  await syncBookingRestrictions();
  await syncAvailability();
  await processIncomingBookings();
}

// Sync room data to channels
async function syncRooms() {
  console.log('[Channel Sync] Starting room sync...');
  
  // Get all rooms that need sync with their rate policies and overrides
  const roomsToSync = await prisma.room.findMany({
    where: {
      needsChannelSync: true,
      channelSyncFailCount: { lt: MAX_RETRY_ATTEMPTS }
    },
    include: { 
      beds24Mapping: true,
      rateDatePrices: {
        where: {
          isActive: true,
          date: {
            gte: new Date(), // Only today and future dates
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days to match syncRoomData range
          }
        },
        include: {
          ratePolicy: true
        }
      },
      RoomRate: {
        where: { isActive: true },
        include: {
          ratePolicy: true
        }
      }
    }
  });

  console.log(`[Channel Sync] Found ${roomsToSync.length} rooms to sync`);

  for (const room of roomsToSync) {
    try {
      // Check if room has beds24Mapping and it is active
      if ((room as any).beds24Mapping && (room as any).beds24Mapping.isActive) {
        console.log(`[Channel Sync] Syncing room with mapping: ${room.name}`);
        await beds24Service.syncRoomData(room);
        
        // Success: Reset sync flag
        await prisma.room.update({
          where: { id: room.id },
          data: {
            needsChannelSync: false,
            lastChannelSyncAt: new Date(),
            channelSyncFailCount: 0
          }
        });

        await prisma.beds24RoomMapping.update({
          where: { id: (room as any).beds24Mapping.id },
          data: {
            needsSync: false,
            lastSyncAt: new Date(),
            syncStatus: 'SYNCED',
            syncFailCount: 0,
            lastSyncError: null
          }
        });
        console.log(`[Channel Sync] Room ${room.name} synced successfully`);
      } else {
        // Room has no mapping - attempt to create one or skip with warning
        console.warn(`[Channel Sync] Room "${room.name}" has no Beds24 mapping - skipping sync`);
        console.warn(`[Channel Sync] To sync this room, create a mapping via admin panel or API`);
        
        // Reset sync flag to prevent repeated attempts
        await prisma.room.update({
          where: { id: room.id },
          data: {
            needsChannelSync: false,
            channelSyncFailCount: 0
          }
        });
      }
    } catch (error: any) {
      console.error(`[Channel Sync] Failed to sync room ${room.id}:`, error);
      
      await prisma.room.update({
        where: { id: room.id },
        data: { channelSyncFailCount: { increment: 1 } }
      });

      if ((room as any).beds24Mapping) {
        await prisma.beds24RoomMapping.update({
          where: { id: (room as any).beds24Mapping.id },
          data: {
            syncStatus: 'FAILED',
            syncFailCount: { increment: 1 },
            lastSyncError: error.message || 'Unknown error'
          }
        });
      }
    }
  }
}

// Sync rate policies
async function syncRatePolicies() {
  const ratesToSync = await prisma.ratePolicy.findMany({
    where: {
      needsChannelSync: true,
      channelSyncFailCount: { lt: MAX_RETRY_ATTEMPTS },
      isActive: true
    }
  });

  for (const ratePolicy of ratesToSync) {
    try {
      const roomMappings = await prisma.beds24RoomMapping.findMany({
        where: { isActive: true, autoSync: true },
        include: {
          room: {
            include: {
              RoomRate: {
                where: { ratePolicyId: ratePolicy.id, isActive: true }
              }
            }
          }
        }
      });

      for (const mapping of roomMappings) {
        await beds24Service.syncRatePolicy(mapping, ratePolicy);
      }

      await prisma.ratePolicy.update({
        where: { id: ratePolicy.id },
        data: {
          needsChannelSync: false,
          lastChannelSyncAt: new Date(),
          channelSyncFailCount: 0
        }
      });
      console.log(`[Channel Sync] Rate policy ${ratePolicy.name} synced successfully`);
    } catch (error) {
      console.error(`[Channel Sync] Failed to sync rate policy ${ratePolicy.id}:`, error);
      await prisma.ratePolicy.update({
        where: { id: ratePolicy.id },
        data: { channelSyncFailCount: { increment: 1 } }
      });
    }
  }
}

// Sync date-specific rate overrides
async function syncRateDatePrices() {
  const overridesToSync = await prisma.rateDatePrice.findMany({
    where: {
      needsChannelSync: true,
      channelSyncFailCount: { lt: MAX_RETRY_ATTEMPTS },
      isActive: true,
      date: { gte: new Date() }
    },
    include: {
      room: { include: { beds24Mapping: true } },
      ratePolicy: true
    }
  });

  const groupedOverrides = overridesToSync.reduce((acc, override) => {
    const key = `${override.roomId}_${override.date.toISOString().split('T')[0]}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(override);
    return acc;
  }, {} as Record<string, typeof overridesToSync>);

  for (const [key, overrides] of Object.entries(groupedOverrides)) {
    try {
      const room = overrides[0].room;
      if (room.beds24Mapping && room.beds24Mapping.isActive) {
        await beds24Service.syncDatePrices(room, overrides);
      }

      await prisma.rateDatePrice.updateMany({
        where: { id: { in: overrides.map(o => o.id) } },
        data: {
          needsChannelSync: false,
          lastChannelSyncAt: new Date(),
          channelSyncFailCount: 0
        }
      });
      console.log(`[Channel Sync] Rate overrides for ${key} synced successfully`);
    } catch (error) {
      console.error(`[Channel Sync] Failed to sync rate overrides for ${key}:`, error);
      await prisma.rateDatePrice.updateMany({
        where: { id: { in: overrides.map(o => o.id) } },
        data: { channelSyncFailCount: { increment: 1 } }
      });
    }
  }
}

// Sync booking restrictions
async function syncBookingRestrictions() {
  const restrictionsToSync = await prisma.bookingRestriction.findMany({
    where: {
      needsChannelSync: true,
      channelSyncFailCount: { lt: MAX_RETRY_ATTEMPTS },
      isActive: true,
      endDate: { gte: new Date() }
    }
  });

  for (const restriction of restrictionsToSync) {
    try {
      await beds24Service.syncBookingRestrictions(restriction.startDate, restriction.endDate, []);
      await prisma.bookingRestriction.update({
        where: { id: restriction.id },
        data: {
          needsChannelSync: false,
          lastChannelSyncAt: new Date(),
          channelSyncFailCount: 0
        }
      });
      console.log(`[Channel Sync] Booking restriction ${restriction.name} synced successfully`);
    } catch (error) {
      console.error(`[Channel Sync] Failed to sync booking restriction ${restriction.id}:`, error);
      await prisma.bookingRestriction.update({
        where: { id: restriction.id },
        data: { channelSyncFailCount: { increment: 1 } }
      });
    }
  }
}

// Sync availability based on bookings
async function syncAvailability() {
  const bookingsToSync = await prisma.booking.findMany({
    where: {
      needsChannelSync: true,
      channelSyncFailCount: { lt: MAX_RETRY_ATTEMPTS },
      status: { in: ['CONFIRMED', 'PENDING'] },
      checkOut: { gte: new Date() }
    },
    include: {
      room: { include: { beds24Mapping: true } }
    }
  });

  const groupedBookings = bookingsToSync.reduce((acc, booking) => {
    if (!acc[booking.roomId]) acc[booking.roomId] = [];
    acc[booking.roomId].push(booking);
    return acc;
  }, {} as Record<string, typeof bookingsToSync>);

  for (const [roomId, bookings] of Object.entries(groupedBookings)) {
    try {
      const room = bookings[0].room;
      if (room.beds24Mapping && room.beds24Mapping.isActive) {
        await beds24Service.syncRoomAvailability(room, bookings);
      }

      await prisma.booking.updateMany({
        where: { id: { in: bookings.map(b => b.id) } },
        data: {
          needsChannelSync: false,
          lastChannelSyncAt: new Date(),
          channelSyncFailCount: 0
        }
      });
      console.log(`[Channel Sync] Availability for room ${roomId} synced successfully`);
    } catch (error) {
      console.error(`[Channel Sync] Failed to sync availability for room ${roomId}:`, error);
      await prisma.booking.updateMany({
        where: { id: { in: bookings.map(b => b.id) } },
        data: { channelSyncFailCount: { increment: 1 } }
      });
    }
  }
}

// Process incoming bookings from channels
async function processIncomingBookings() {
  try {
    const activeMappings = await prisma.beds24RoomMapping.findMany({
      where: { isActive: true, autoSync: true }
    });

    if (activeMappings.length === 0) return;

    const newBookings = await beds24Service.fetchNewBookings();
    
    for (const beds24Booking of newBookings) {
      const existingBooking = await prisma.booking.findFirst({
        where: { channelBookingId: beds24Booking.bookId }
      });

      if (!existingBooking) {
        const mapping = activeMappings.find(m => m.beds24RoomId === beds24Booking.roomId);
        if (mapping) {
          await beds24Service.createBookingFromChannel(beds24Booking, mapping);
          console.log(`[Channel Sync] Created booking from Beds24: ${beds24Booking.bookId}`);
        }
      }
    }
  } catch (error) {
    console.error('[Channel Sync] Failed to process incoming bookings:', error);
  }
}

// Helper function to set sync flags when data changes
export const markForChannelSync = {
  room: async (roomId: string) => {
    await prisma.room.update({
      where: { id: roomId },
      data: { needsChannelSync: true, channelSyncFailCount: 0 }
    });
  },
  
  ratePolicy: async (ratePolicyId: string) => {
    await prisma.ratePolicy.update({
      where: { id: ratePolicyId },
      data: { needsChannelSync: true, channelSyncFailCount: 0 }
    });
  },
  
  booking: async (bookingId: string) => {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { needsChannelSync: true, channelSyncFailCount: 0 }
    });
  },
  
  rateDatePrice: async (rateDatePriceId: string) => {
    await prisma.rateDatePrice.update({
      where: { id: rateDatePriceId },
      data: { needsChannelSync: true, channelSyncFailCount: 0 }
    });
  },
  
  bookingRestriction: async (restrictionId: string) => {
    await prisma.bookingRestriction.update({
      where: { id: restrictionId },
      data: { needsChannelSync: true, channelSyncFailCount: 0 }
    });
  }
};

// Mark all mapped rooms for sync (used on startup)
async function markAllMappedRoomsForSync() {
  try {
    console.log('[Channel Sync] Marking all mapped rooms for initial sync...');
    
    const result = await prisma.room.updateMany({
      where: {
        beds24Mapping: {
          isActive: true
        }
      },
      data: {
        needsChannelSync: true,
        channelSyncFailCount: 0
      }
    });
    
    console.log(`[Channel Sync] Marked ${result.count} rooms for sync`);
  } catch (error) {
    console.error('[Channel Sync] Failed to mark rooms for sync:', error);
  }
}

// Manual sync trigger function
export const triggerManualChannelSync = async () => {
  if (isChannelSyncRunning) {
    throw new Error('Channel sync already in progress');
  }
  
  try {
    isChannelSyncRunning = true;
    console.log('[Channel Sync] Manual sync triggered');
    await runChannelSync();
    console.log('[Channel Sync] Manual sync completed');
  } finally {
    isChannelSyncRunning = false;
  }
};

// Sync health check
export const getChannelSyncHealth = async () => {
  const [roomsNeedingSync, ratePoliciesNeedingSync, bookingsNeedingSync, failedSyncs] = await Promise.all([
    prisma.room.count({ where: { needsChannelSync: true } }),
    prisma.ratePolicy.count({ where: { needsChannelSync: true } }),
    prisma.booking.count({ where: { needsChannelSync: true } }),
    prisma.beds24RoomMapping.count({ where: { syncStatus: 'FAILED' } })
  ]);

  return {
    isRunning: isChannelSyncRunning,
    pendingSyncs: { rooms: roomsNeedingSync, ratePolicies: ratePoliciesNeedingSync, bookings: bookingsNeedingSync },
    failedSyncs,
    lastRun: new Date()
  };
};

export const scheduleCheckinReminder = async () => {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("[Cron] Starting online check-in reminder process...");
      
      const settings = await prisma.generalSettings.findFirst();
      if (!settings || !settings.checkinReminderDays) {
        console.log("[Cron] No check-in reminder days configured, skipping...");
        return;
      }
      
      const triggerDays = settings.checkinReminderDays;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + triggerDays);
      
      const upcomingBookings = await prisma.booking.findMany({
        where: {
          checkIn: {
            gte: targetDate,
            lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Same day
          },
          status: "CONFIRMED",
        },
        include: {
          room: true,
          customer: true,
          paymentIntent: {
            include: {
              bookingGroup: {
                include: {
                  mainGuest: true
                }
              }
            }
          }
        }
      });
      
      console.log(`[Cron] Found ${upcomingBookings.length} bookings for check-in in ${triggerDays} days`);
      
      // Group bookings by check-in date and payment intent
      const bookingGroups = new Map<string, typeof upcomingBookings>();
      
      for (const booking of upcomingBookings) {
        const checkInDate = booking.checkIn.toISOString().split('T')[0];
        const paymentIntentId = booking.paymentIntentId || 'direct';
        const groupKey = `${checkInDate}_${paymentIntentId}`;
        
        if (!bookingGroups.has(groupKey)) {
          bookingGroups.set(groupKey, []);
        }
        bookingGroups.get(groupKey)!.push(booking);
      }
      
      console.log(`[Cron] Grouped ${upcomingBookings.length} bookings into ${bookingGroups.size} email groups`);
      
      // Process each group (same check-in date and payment intent)
      for (const [groupKey, groupBookings] of bookingGroups.entries()) {
        try {
          // Check if any booking in this group already has a token
          const existingAccess = await prisma.guestCheckInAccess.findFirst({
            where: {
              bookingId: {
                in: groupBookings.map(b => b.id)
              },
              tokenExpiresAt: {
                gt: new Date() // Only active tokens
              }
            }
          });
          
          if (existingAccess) {
            console.log(`[Cron] Token already exists for booking group ${groupKey}, skipping...`);
            continue;
          }
          
          const firstBooking = groupBookings[0];
          let recipientEmail: string;
          let recipientName: string;
          let customerId: string;
          
          if (firstBooking.customer) {
            // Direct customer booking
            recipientEmail = firstBooking.customer.guestEmail;
            recipientName = `${firstBooking.customer.guestFirstName} ${firstBooking.customer.guestLastName}`;
            customerId = firstBooking.customer.id;
          } else if (firstBooking.paymentIntent?.bookingGroup?.mainGuest) {
            // Group booking - send to main guest
            const mainGuest = firstBooking.paymentIntent.bookingGroup.mainGuest;
            recipientEmail = mainGuest.guestEmail;
            recipientName = `${mainGuest.guestFirstName} ${mainGuest.guestLastName}`;
            customerId = mainGuest.id;
          } else {
            console.warn(`[Cron] No customer or main guest found for booking group ${groupKey}, skipping...`);
            continue;
          }
          
          // Set token expiry to the day after check-in (as per client requirement)
          const tokenExpiresAt = new Date(firstBooking.checkIn);
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 1); // Day after check-in
          tokenExpiresAt.setHours(23, 59, 59, 999); // End of day
          
          // Create main guest access record ONLY for the first booking (main room)
          // Other rooms will have no guests initially - guests can be added later
          const bookingToken = require('crypto').randomBytes(32).toString('hex');
          
          // Calculate completion status based on customer data
          const customer = firstBooking.customer || (firstBooking.paymentIntent?.bookingGroup?.mainGuest);
          if (!customer) {
            console.warn(`[Cron] No customer data found for first booking in group ${groupKey}, skipping...`);
            continue;
          }
          
          const personalDetailsComplete = !!(
            customer.guestFirstName && 
            customer.guestLastName && 
            customer.guestEmail && 
            customer.dob
          );
          
          const identityDetailsComplete = !!(
            customer.guestNationality && 
            customer.passportNumber && 
            customer.passportExpiry && 
            customer.passportIssuedCountry
          );
          
          const addressDetailsComplete = !!(customer.city);
          
          let completionStatus = 'INCOMPLETE';
          if (personalDetailsComplete && identityDetailsComplete && addressDetailsComplete) {
            completionStatus = 'COMPLETE';
          } else if (personalDetailsComplete || identityDetailsComplete || addressDetailsComplete) {
            completionStatus = 'PARTIAL';
          }
          
          try {
            // Create main guest record ONLY for the first booking
            await prisma.guestCheckInAccess.create({
              data: {
                customerId: customerId,
                bookingId: firstBooking.id,
                accessToken: bookingToken,
                tokenExpiresAt: tokenExpiresAt,
                isMainGuest: true,
                guestType: 'MAIN_GUEST',
                invitationStatus: 'NOT_APPLICABLE',
                completionStatus: completionStatus as any,
                personalDetailsComplete,
                identityDetailsComplete,
                addressDetailsComplete,
                checkInCompletedAt: completionStatus === 'COMPLETE' ? new Date() : null
              }
            });
            
            console.log(`[Cron] Created main guest access record for first booking ${firstBooking.id}`);
            
          } catch (error: any) {
            if (error.code === 'P2002') {
              // Token already exists for this booking
              const existingRecord = await prisma.guestCheckInAccess.findFirst({
                where: {
                  bookingId: firstBooking.id,
                  customerId: customerId,
                  tokenExpiresAt: {
                    gt: new Date()
                  }
                }
              });
              if (existingRecord) {
                console.log(`[Cron] Main guest access record already exists for booking ${firstBooking.id}, using existing token`);
              } else {
                throw error; // Re-throw if it's a different uniqueness issue
              }
            } else {
              throw error; // Re-throw other errors
            }
          }
          
          // Use the first booking's token for the email URL (since customer has access to all)
          const firstBookingAccess = await prisma.guestCheckInAccess.findFirst({
            where: {
              bookingId: groupBookings[0].id,
              customerId: customerId
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          const checkinToken = firstBookingAccess?.accessToken || bookingToken;
          
          // Create the online check-in URL
          const baseUrl = process.env.NODE_ENV === 'local' ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL;
          const checkinUrl = `${baseUrl}/online-checkin/${checkinToken}`;
          
          // Prepare booking details for email template
          const bookingDetails = groupBookings.map(booking => ({
            roomName: booking.room.name,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut
          }));
          
          // Send single online check-in invitation email for all bookings in this group
          await EmailService.sendEmail({
            to: {
              email: recipientEmail,
              name: recipientName
            },
            templateType: 'ONLINE_CHECKIN_INVITATION',
            subject: `Complete Your Online Check-In${groupBookings.length > 1 ? ' - Multiple Rooms' : ` - ${firstBooking.room.name}`}`,
            templateData: {
              customerName: recipientName,
              roomName: firstBooking.room.name, // For backward compatibility
              bookings: bookingDetails, // New field for multiple bookings
              checkInDate: firstBooking.checkIn.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              checkinUrl: checkinUrl,
              daysUntilCheckin: triggerDays,
              isMultipleBookings: groupBookings.length > 1
            }
          });
          
          console.log(`[Cron] Online check-in invitation sent to ${recipientEmail} for ${groupBookings.length} booking(s) in group ${groupKey}`);
          
        } catch (bookingError) {
          console.error(`[Cron] Failed to process online check-in for booking group ${groupKey}:`, bookingError);
        }
      }
      
      console.log(`[Cron] Online check-in reminder process completed. Processed ${bookingGroups.size} booking groups`);
      
    } catch (error) {
      console.error("[Cron] Error in Schedule checkin reminder:", error);
    }
  });
}
