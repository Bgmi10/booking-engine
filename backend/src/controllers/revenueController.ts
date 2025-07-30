import { Request, Response } from "express";
import prisma from "../prisma";

// Cash Management Endpoints

export const getCashSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.cashCalculationSettings.findFirst({
      where: { isActive: true }
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          calculationPeriodDays: 1,
          resetTime: "00:00",
          isActive: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching cash settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash settings"
    });
  }
};

export const updateCashSettings = async (req: Request, res: Response) => {
  try {
    const { calculationPeriodDays, resetTime } = req.body;

    // Deactivate existing settings
    await prisma.cashCalculationSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new settings
    const settings = await prisma.cashCalculationSettings.create({
      data: {
        calculationPeriodDays: calculationPeriodDays || 1,
        resetTime: resetTime || "00:00",
        isActive: true
      }
    });

    res.json({
      success: true,
      data: settings,
      message: "Cash settings updated successfully"
    });
  } catch (error) {
    console.error("Error updating cash settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cash settings"
    });
  }
};

export const getWaiterCashSummary = async (req: Request, res: Response) => {
  try {
    const { waiterId } = req.params;
    const { date } = req.query;

    const summaryDate = date ? new Date(date as string) : new Date();
    summaryDate.setHours(0, 0, 0, 0);

    // Check if summary exists, if not create one based on cash orders for the day
    let summary = await prisma.waiterCashSummary.findFirst({
      where: {
        waiterId,
        summaryDate
      },
      include: {
        waiter: {
          select: { id: true, name: true, email: true }
        },
        deposits: {
          include: {
            processingManager: {
              select: { id: true, name: true }
            }
          }
        },
        verifyingManager: {
          select: { id: true, name: true }
        }
      }
    });

    // If no summary exists, calculate cash orders for the day and create one
    if (!summary) {
      const startOfDay = new Date(summaryDate);
      const endOfDay = new Date(summaryDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get cash orders for this waiter for the day
      const cashOrders = await prisma.order.findMany({
        where: {
          assignedToWaiter: waiterId,
          status: 'DELIVERED',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          charge: {
            paymentMethod: 'cash', // Fixed: lowercase 'cash' instead of 'CASH'
            status: 'SUCCEEDED'
          }
        },
        include: {
          charge: true
        }
      });


      const totalCashOrders = cashOrders.reduce((sum, order) => sum + (order.charge?.amount || 0), 0);

      if (totalCashOrders > 0) {
        summary = await prisma.waiterCashSummary.create({
          data: {
            waiterId,
            summaryDate,
            periodStart: startOfDay,
            periodEnd: endOfDay,
            totalCashOrders,
            outstandingBalance: totalCashOrders,
            status: 'PENDING'
          },
          include: {
            waiter: {
              select: { id: true, name: true, email: true }
            },
            deposits: {
              include: {
                processingManager: {
                  select: { id: true, name: true }
                }
              }
            },
            verifyingManager: {
              select: { id: true, name: true }
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("Error fetching waiter cash summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch waiter cash summary"
    });
  }
};

export const createWaiterCashSummary = async (req: Request, res: Response) => {
  try {
    const { waiterId, summaryDate, totalCashOrders, outstandingBalance } = req.body;

    const date = new Date(summaryDate);
    date.setHours(0, 0, 0, 0);

    // Check if summary already exists for this date
    const existingSummary = await prisma.waiterCashSummary.findFirst({
      where: {
        waiterId,
        summaryDate: date
      }
    });

    if (existingSummary) {
      return res.status(400).json({
        success: false,
        message: "Cash summary already exists for this date"
      });
    }

    const summary = await prisma.waiterCashSummary.create({
      data: {
        waiterId,
        summaryDate: date,
        periodStart: date,
        periodEnd: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1),
        totalCashOrders: totalCashOrders || 0,
        outstandingBalance: outstandingBalance || 0,
        status: "PENDING"
      },
      include: {
        waiter: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: summary,
      message: "Cash summary created successfully"
    });
  } catch (error) {
    console.error("Error creating waiter cash summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create waiter cash summary"
    });
  }
};

export const submitCashDeposit = async (req: Request, res: Response) => {
  try {
    const { cashSummaryId, amount, notes } = req.body;

    const deposit = await prisma.cashDeposit.create({
      data: {
        cashSummaryId,
        amount,
        status: "SUBMITTED",
        depositedAt: new Date()
      }
    });

    // Update summary status to submitted
    await prisma.waiterCashSummary.update({
      where: { id: cashSummaryId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: deposit,
      message: "Cash deposit submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting cash deposit:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit cash deposit"
    });
  }
};

export const getPendingDeposits = async (req: Request, res: Response) => {
  try {
    // Get waiter cash summaries that have been submitted but not yet verified
    const summaries = await prisma.waiterCashSummary.findMany({
      where: {
        status: "SUBMITTED"
      },
      include: {
        waiter: {
          select: { id: true, name: true, email: true }
        },
        deposits: {
          include: {
            processingManager: {
              select: { id: true, name: true }
            }
          }
        },
        verifyingManager: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    console.error("Error fetching pending deposits:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending deposits"
    });
  }
};

export const verifyDeposit = async (req: Request, res: Response) => {
  try {
    const { depositId } = req.params;
    const { actualReceived, action, notes } = req.body;
    //@ts-ignore
    const managerId = req.user?.id;

    const deposit = await prisma.cashDeposit.findUnique({
      where: { id: depositId },
      include: { cashSummary: true }
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found"
      });
    }

    const difference = actualReceived - deposit.amount;
    let newStatus: string;
    let acceptedLoss = false;

    switch (action) {
      case 'accept':
        newStatus = "ACCEPTED";
        break;
      case 'discrepancy':
        newStatus = "DISCREPANCY";
        break;
      case 'accept_loss':
        newStatus = "LOSS_ACCEPTED";
        acceptedLoss = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action"
        });
    }

    // Update deposit
    const updatedDeposit = await prisma.cashDeposit.update({
      where: { id: depositId },
      data: {
        actualReceived,
        difference,
        status: newStatus as any,
        processedAt: new Date(),
        processedBy: managerId,
        notes,
        acceptedLoss
      }
    });

    // Update cash summary status
    const summaryStatus = newStatus === "ACCEPTED" || newStatus === "LOSS_ACCEPTED" ? "VERIFIED" : "DISCREPANCY";
    await prisma.waiterCashSummary.update({
      where: { id: deposit.cashSummaryId },
      data: {
        status: summaryStatus as any,
        verifiedAt: new Date(),
        verifiedBy: managerId
      }
    });

    res.json({
      success: true,
      data: updatedDeposit,
      message: "Deposit verified successfully"
    });
  } catch (error) {
    console.error("Error verifying deposit:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify deposit"
    });
  }
};

export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    //@ts-ignore
    const managerId = req.user?.id;

    const summaryDate = date ? new Date(date as string) : new Date();
    summaryDate.setHours(0, 0, 0, 0);

    // Get or create daily summary
    let dailySummary = await prisma.managerDailySummary.findFirst({
      where: {
        managerId,
        summaryDate
      }
    });

    if (!dailySummary) {
      // Calculate totals from waiter summaries
      const waiterSummaries = await prisma.waiterCashSummary.findMany({
        where: {
          summaryDate,
          status: { in: ["VERIFIED", "DISCREPANCY", "COMPLETED"] }
        },
        include: {
          deposits: true,
          waiter: {
            select: { id: true, name: true }
          }
        }
      });

      const totalCashDeposited = waiterSummaries.reduce((sum, summary) => 
        sum + summary.deposits.reduce((depositSum, deposit) => depositSum + deposit.amount, 0), 0);
      
      const totalCashReceived = waiterSummaries.reduce((sum, summary) => 
        sum + summary.deposits.reduce((depositSum, deposit) => depositSum + (deposit.actualReceived || 0), 0), 0);
      
      const totalDiscrepancy = totalCashReceived - totalCashDeposited;
      
      const totalAcceptedLoss = waiterSummaries.reduce((sum, summary) => 
        sum + summary.deposits.filter(d => d.acceptedLoss).reduce((lossSum, deposit) => lossSum + Math.abs(deposit.difference || 0), 0), 0);

      dailySummary = await prisma.managerDailySummary.create({
        data: {
          managerId,
          summaryDate,
          totalCashDeposited,
          totalCashReceived,
          totalDiscrepancy,
          totalAcceptedLoss,
          waiterCount: waiterSummaries.length,
          status: "PENDING"
        }
      });
    }

    // Get waiter details for the day
    const waiterSummaries = await prisma.waiterCashSummary.findMany({
      where: {
        summaryDate,
        status: { in: ["VERIFIED", "DISCREPANCY", "COMPLETED"] }
      },
      include: {
        deposits: true,
        waiter: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        summary: dailySummary,
        waiterSummaries
      }
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily summary"
    });
  }
};

export const finalizeDailySummary = async (req: Request, res: Response) => {
  try {
    const { summaryId } = req.params;
    const { notes } = req.body;

    const updatedSummary = await prisma.managerDailySummary.update({
      where: { id: summaryId },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        notes
      }
    });

    res.json({
      success: true,
      data: updatedSummary,
      message: "Daily summary finalized successfully"
    });
  } catch (error) {
    console.error("Error finalizing daily summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to finalize daily summary"
    });
  }
};

// Payment History Endpoints

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { date, paymentType, waiterId } = req.query;

    let whereClause: any = {};

    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    if (waiterId) {
      whereClause.assignedToWaiter = waiterId;
    }

    // Get orders based on payment type
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        waiter: {
          select: { id: true, name: true }
        },
        charge: {
          select: { id: true, amount: true, paymentMethod: true, status: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter by payment type if specified
    let filteredOrders = orders;
    if (paymentType && paymentType !== 'all') {
      filteredOrders = orders.filter(order => {
        if (!order.charge) return false;
        
        switch (paymentType) {
          case 'cash':
            return order.charge.paymentMethod === 'cash'; // Fixed: lowercase 'cash'
          case 'card':
            return order.charge.paymentMethod === 'stripe'; // Fixed: lowercase 'stripe'
          case 'bank':
            return order.charge.paymentMethod === 'bank_transfer'; // Fixed: lowercase with underscore
          default:
            return true;
        }
      });
    }

    // Group by waiter and payment method
    const groupedData = filteredOrders.reduce((acc: any, order) => {
      const waiterId: any = order.assignedToWaiter;
      const waiterName = order.waiter?.name || 'Unknown';
      const paymentMethod = order.charge?.paymentMethod || 'UNKNOWN';
      const amount = order.charge?.amount || 0;

      if (!acc[waiterId]) {
        acc[waiterId] = {
          waiterId,
          waiterName,
          paymentMethods: {}
        };
      }

      if (!acc[waiterId].paymentMethods[paymentMethod]) {
        acc[waiterId].paymentMethods[paymentMethod] = {
          totalAmount: 0,
          orderCount: 0,
          orders: []
        };
      }

      acc[waiterId].paymentMethods[paymentMethod].totalAmount += amount;
      acc[waiterId].paymentMethods[paymentMethod].orderCount += 1;
      acc[waiterId].paymentMethods[paymentMethod].orders.push(order);

      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(groupedData)
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history"
    });
  }
};

// Revenue Analytics Endpoints

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, dateRange } = req.query;

    let start: Date, end: Date;

    if (dateRange) {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          end = new Date(now);
      }
    } else {
      start = startDate ? new Date(startDate as string) : new Date();
      end = endDate ? new Date(endDate as string) : new Date();
    }

    // Get orders for the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        status: 'DELIVERED'
      },
      include: {
        charge: true,
        waiter: {
          select: { id: true, name: true }
        }
      }
    });

    // Calculate analytics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.charge?.amount || 0), 0);
    const totalOrders = orders.length;
    const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Payment method breakdown
    const paymentMethodStats = orders.reduce((acc: any, order) => {
      const method = order.charge?.paymentMethod || 'UNKNOWN';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count += 1;
      acc[method].amount += order.charge?.amount || 0;
      return acc;
    }, {});

    // Daily breakdown
    const dailyRevenue = orders.reduce((acc: any, order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { amount: 0, orders: 0 };
      }
      acc[date].amount += order.charge?.amount || 0;
      acc[date].orders += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          averageOrder,
          period: { start, end }
        },
        paymentMethods: paymentMethodStats,
        dailyBreakdown: dailyRevenue
      }
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue analytics"
    });
  }
};

// Revenue Settings Endpoints

export const getRevenueSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.revenueSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          autoReminders: true,
          reminderTime: "18:00",
          discrepancyThreshold: 10.00,
          autoFinalizeDays: 3,
          managerEmail: true,
          discrepancyAlerts: true,
          dailySummaryEmail: true,
          isActive: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching revenue settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue settings"
    });
  }
};

export const updateRevenueSettings = async (req: Request, res: Response) => {
  try {
    const { 
      autoReminders, 
      reminderTime, 
      discrepancyThreshold, 
      autoFinalizeDays,
      managerEmail,
      discrepancyAlerts,
      dailySummaryEmail
    } = req.body;

    // Deactivate existing settings
    await prisma.revenueSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new settings
    const settings = await prisma.revenueSettings.create({
      data: {
        autoReminders: autoReminders ?? true,
        reminderTime: reminderTime || "18:00",
        discrepancyThreshold: discrepancyThreshold ?? 10.00,
        autoFinalizeDays: autoFinalizeDays ?? 3,
        managerEmail: managerEmail ?? true,
        discrepancyAlerts: discrepancyAlerts ?? true,
        dailySummaryEmail: dailySummaryEmail ?? true,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: settings,
      message: "Revenue settings updated successfully"
    });
  } catch (error) {
    console.error("Error updating revenue settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update revenue settings"
    });
  }
};

export default {
  getCashSettings,
  updateCashSettings,
  getWaiterCashSummary,
  createWaiterCashSummary,
  submitCashDeposit,
  getPendingDeposits,
  verifyDeposit,
  getDailySummary,
  finalizeDailySummary,
  getPaymentHistory,
  getRevenueAnalytics,
  getRevenueSettings,
  updateRevenueSettings
};