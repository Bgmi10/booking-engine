import prisma from "../prisma";
import { EmailService } from "./emailService";

interface CashReminderSettings {
  autoReminders: boolean;
  reminderTime: string;
  discrepancyThreshold: number;
  managerEmail: boolean;
  discrepancyAlerts: boolean;
  dailySummaryEmail: boolean;
}

class CashReminderService {

  async checkAndSendCashReminders() {
    try {
      console.log("[CashReminderService] Starting cash reminder checks...");

      // Get active settings
      const settings = await this.getCashSettings();
      if (!settings.autoReminders) {
        console.log("[CashReminderService] Auto reminders disabled");
        return 0;
      }

      // Get pending cash summaries for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingSummaries = await prisma.waiterCashSummary.findMany({
        where: {
          summaryDate: today,
          status: 'PENDING'
        },
        include: {
          waiter: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Get managers to notify
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['MANAGER', 'ADMIN'] }
        },
        select: { id: true, name: true, email: true }
      });

      let remindersSent = 0;

      if (pendingSummaries.length > 0 && settings.managerEmail) {
        for (const manager of managers) {
          await this.sendCashReminderEmail(manager, pendingSummaries);
          remindersSent++;
        }
      }

      // Check for discrepancies and send alerts
      if (settings.discrepancyAlerts) {
        const discrepancies = await this.checkDiscrepancies(settings.discrepancyThreshold);
        if (discrepancies.length > 0) {
          for (const manager of managers) {
            await this.sendDiscrepancyAlert(manager, discrepancies);
            remindersSent++;
          }
        }
      }

      console.log(`[CashReminderService] Sent ${remindersSent} cash reminders`);
      return remindersSent;

    } catch (error) {
      console.error("[CashReminderService] Error in cash reminder service:", error);
      throw error;
    }
  }

  async sendDailySummaryEmail() {
    try {
      console.log("[CashReminderService] Starting daily summary email...");

      const settings = await this.getCashSettings();
      if (!settings.dailySummaryEmail) {
        console.log("[CashReminderService] Daily summary emails disabled");
        return 0;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Get managers
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['MANAGER', 'ADMIN'] }
        },
        select: { id: true, name: true, email: true }
      });

      let emailsSent = 0;

      for (const manager of managers) {
        // Get daily summary for the manager
        const dailySummary = await prisma.managerDailySummary.findFirst({
          where: {
            managerId: manager.id,
            summaryDate: yesterday
          }
        });

        if (dailySummary) {
          await this.sendDailySummaryEmailToManager(manager, dailySummary, yesterday);
          emailsSent++;
        }
      }

      console.log(`[CashReminderService] Sent ${emailsSent} daily summary emails`);
      return emailsSent;

    } catch (error) {
      console.error("[CashReminderService] Error sending daily summary emails:", error);
      throw error;
    }
  }

  private async getCashSettings(): Promise<CashReminderSettings> {
    try {
      // Get settings from database (these would be stored from RevenueSettings frontend)
      const settings = await prisma.revenueSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (settings) {
        return {
          autoReminders: settings.autoReminders || true,
          reminderTime: settings.reminderTime || "18:00",
          discrepancyThreshold: settings.discrepancyThreshold || 10.00,
          managerEmail: settings.managerEmail || true,
          discrepancyAlerts: settings.discrepancyAlerts || true,
          dailySummaryEmail: settings.dailySummaryEmail || true
        };
      }
    } catch (error) {
      console.log("[CashReminderService] No settings found in DB, using defaults:", error);
    }

    // Default settings fallback
    return {
      autoReminders: true,
      reminderTime: "18:00",
      discrepancyThreshold: 10.00,
      managerEmail: true,
      discrepancyAlerts: true,
      dailySummaryEmail: true
    };
  }

  private async checkDiscrepancies(threshold: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deposits = await prisma.cashDeposit.findMany({
      where: {
        status: 'DISCREPANCY',
        depositedAt: {
          gte: today
        },
        difference: {
          gte: threshold
        }
      },
      include: {
        cashSummary: {
          include: {
            waiter: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return deposits;
  }

  private async sendCashReminderEmail(manager: any, pendingSummaries: any[]) {
    const waiterList = pendingSummaries.map(summary => 
      `${summary.waiter.name}: €${summary.outstandingBalance.toFixed(2)}`
    );

    const templateData = {
      managerName: manager.name,
      pendingWaiters: waiterList,
      totalPending: pendingSummaries.length,
      currentDate: new Date().toLocaleDateString('it-IT')
    };

    await EmailService.sendEmail({
      to: {
        email: manager.email,
        name: manager.name
      },
      templateType: 'CASH_REMINDER',
      templateData
    });
  }

  private async sendDiscrepancyAlert(manager: any, discrepancies: any[]) {
    const discrepancyList = discrepancies.map(deposit => ({
      waiterName: deposit.cashSummary.waiter.name,
      discrepancyAmount: Math.abs(deposit.difference).toFixed(2),
      depositAmount: deposit.amount.toFixed(2),
      actualReceived: deposit.actualReceived?.toFixed(2) || '0.00'
    }));

    const templateData = {
      managerName: manager.name,
      discrepancies: discrepancyList,
      totalDiscrepancies: discrepancies.length,
      currentDate: new Date().toLocaleDateString('it-IT')
    };

    await EmailService.sendEmail({
      to: {
        email: manager.email,
        name: manager.name
      },
      templateType: 'CASH_DISCREPANCY_ALERT',
      templateData
    });
  }

  private async sendDailySummaryEmailToManager(manager: any, summary: any, date: Date) {
    const templateData = {
      managerName: manager.name,
      summaryDate: date.toLocaleDateString('it-IT'),
      totalCashDeposited: summary.totalCashDeposited.toFixed(2),
      totalCashReceived: summary.totalCashReceived.toFixed(2),
      totalDiscrepancy: summary.totalDiscrepancy.toFixed(2),
      totalAcceptedLoss: summary.totalAcceptedLoss?.toFixed(2) || '0.00',
      waiterCount: summary.waiterCount,
      status: summary.status,
      currentDate: new Date().toLocaleDateString('it-IT')
    };

    await EmailService.sendEmail({
      to: {
        email: manager.email,
        name: manager.name
      },
      templateType: 'DAILY_CASH_SUMMARY',
      templateData
    });
  }
}

export const cashReminderService = new CashReminderService();