import prisma from '../prisma';
import { addDays, addHours, isSameDay, startOfDay, endOfDay } from 'date-fns';

interface CreateNotificationData {
  title: string;
  description?: string;
  type: 'TASK' | 'MAINTENANCE' | 'CLEANING' | 'GUEST_REQUEST' | 'BIRTHDAY' | 'CHECK_IN' | 'CHECK_OUT' | 'PAYMENT' | 'KITCHEN' | 'SERVICE' | 'ADMIN';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  assignedRole?: 'ADMIN' | 'MANAGER' | 'RECEPTION' | 'CLEANER' | 'MAINTENANCE' | 'KITCHEN' | 'WAITER';
  guestId?: string;
  roomId?: string;
  bookingId?: string;
  dueDate?: Date;
  isAutomated: boolean;
  assignedBy: string;
  automatedRuleId: string;
}

interface DailyActionListFilters {
  role?: string;
  userId?: string;
  date?: Date;
}

class NotificationService {
  async createNotification(data: CreateNotificationData & { attachments?: any[] }, creatorUserId?: string) {
    try {
      // Get guest and room names for display
      let guestName: string | undefined;
      let roomName: string | undefined;

      if (data.guestId) {
        const guest = await prisma.customer.findUnique({
          where: { id: data.guestId },
          select: { guestFirstName: true, guestLastName: true }
        });
        if (guest) {
          guestName = `${guest.guestFirstName} ${guest.guestLastName}`;
        }
      }

      if (data.roomId) {
        const room = await prisma.room.findUnique({
          where: { id: data.roomId },
          select: { name: true }
        });
        if (room) {
          roomName = room.name;
        }
      }

      // Build notification data object robustly
      const notificationData: any = {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        assignedRole: data.assignedRole,
        assignedTo: data.assignedTo || undefined,
        assignedBy: creatorUserId || undefined,
        guest: { connect: { id: data.guestId }},
        guestName,
        room: { connect: { id: data.roomId }},
        roomName,
        booking: { connect: { id: data.bookingId }},
        dueDate: data.dueDate,
        isAutomated: data.isAutomated,
        automatedRule: { connect: { id: data.automatedRuleId }},
        ...(creatorUserId ? { createdByUser: { connect: { id: creatorUserId } } } : {}),
      };
      // Remove undefined fields to avoid Prisma errors
      Object.keys(notificationData).forEach(
        (key) => notificationData[key] === undefined && delete notificationData[key]
      );

      const notification = await prisma.notification.create({
        //@ts-ignore
        data: notificationData,
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } },
          booking: { select: { checkIn: true, checkOut: true } },
          attachments: true
        }
      });

      // Handle attachments
      if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
        await prisma.notificationAttachment.createMany({
          data: data.attachments.map(att => ({
            notificationId: notification.id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
            fileSize: att.fileSize,
            uploadedBy: creatorUserId || 'SYSTEM',
          }))
        });
      }

      // Return notification with attachments
      const notificationWithAttachments = await prisma.notification.findUnique({
        where: { id: notification.id },
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } },
          booking: { select: { checkIn: true, checkOut: true } },
          attachments: true
        }
      });
      return notificationWithAttachments;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getDailyActionList(filters: DailyActionListFilters) {
    try {
      const date = filters.date || new Date();
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      // Base query for notifications
      const notificationsQuery = {
        where: {
          AND: [
            {
              OR: [
                { assignedTo: filters.userId },
                { assignedRole: filters.role as any }
              ]
            },
            {
              status: { not: 'COMPLETED' }
            }
          ]
        },
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } },
          booking: { select: { checkIn: true, checkOut: true } },
          attachments: true
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ]
      };

      // Get notifications
      //@ts-ignore
      const notifications = await prisma.notification.findMany(notificationsQuery);

      // Get check-ins for today
      const checkIns = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          checkIn: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          customer: { select: { guestFirstName: true, guestLastName: true, guestEmail: true, guestPhone: true } },
          room: { select: { name: true } }
        }
      });

      // Get check-outs for today
      const checkOuts = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          checkOut: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          customer: { select: { guestFirstName: true, guestLastName: true, guestEmail: true, guestPhone: true } },
          room: { select: { name: true } }
        }
      });

      // Get rooms that need cleaning (check-outs + daily cleaning)
      const roomsToClean = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          checkOut: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          room: { select: { name: true } }
        }
      });

      // Get pending payments
      const pendingPayments = await prisma.paymentIntent.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            gte: new Date()
          }
        },
        include: {
          customer: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } }
        }
      });

      // Group by sections based on role
      const sections = this.groupBySections(notifications, checkIns, checkOuts, roomsToClean, pendingPayments, filters.role);

      return {
        date: date.toISOString(),
        sections,
        summary: {
          totalNotifications: notifications.length,
          totalCheckIns: checkIns.length,
          totalCheckOuts: checkOuts.length,
          totalRoomsToClean: roomsToClean.length,
          totalPendingPayments: pendingPayments.length
        }
      };
    } catch (error) {
      console.error('Error getting daily action list:', error);
      throw error;
    }
  }

  private groupBySections(notifications: any[], checkIns: any[], checkOuts: any[], roomsToClean: any[], pendingPayments: any[], role?: string) {
    const sections: any = {};

    // Add notifications section
    if (notifications.length > 0) {
      sections.notifications = {
        title: 'Tasks & Notifications',
        items: notifications,
        count: notifications.length
      };
    }

    // Role-specific sections
    if (role === 'RECEPTION' || role === 'MANAGER' || role === 'ADMIN') {
      if (checkIns.length > 0) {
        sections.checkIns = {
          title: 'Check-ins Today',
          items: checkIns,
          count: checkIns.length
        };
      }

      if (checkOuts.length > 0) {
        sections.checkOuts = {
          title: 'Check-outs Today',
          items: checkOuts,
          count: checkOuts.length
        };
      }

      if (pendingPayments.length > 0) {
        sections.payments = {
          title: 'Pending Payments',
          items: pendingPayments,
          count: pendingPayments.length
        };
      }
    }

    if (role === 'CLEANER' || role === 'MANAGER' || role === 'ADMIN') {
      if (roomsToClean.length > 0) {
        sections.cleaning = {
          title: 'Rooms to Clean',
          items: roomsToClean,
          count: roomsToClean.length
        };
      }
    }

    return sections;
  }

  async completeNotification(notificationId: string, completedBy: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy
        },
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          completedByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } }
        }
      });

      return notification;
    } catch (error) {
      console.error('Error completing notification:', error);
      throw error;
    }
  }

  async updateNotificationStatus(notificationId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE') {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { status },
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } },
          attachments: true
        }
      });

      return notification;
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  }

  async getNotificationsForUser(userId: string, userRole: string, userIsAdminOrManager: boolean, filters?: {
    status?: string;
    type?: string;
    priority?: string;
    limit?: number;
    createdByMe?: boolean;
  }) {
    try {
      const whereClause: any = {
        OR: [
          { assignedTo: userId },
          { assignedRole: { not: null } } // Role-based assignments
        ]
      };

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.type) {
        whereClause.type = filters.type;
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          assignedUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
          guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
          room: { select: { name: true } },
          attachments: true
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        take: filters?.limit || 50
      });
      return notifications;
    } catch (error) {
      console.error('Error getting notifications for user:', error);
      throw error;
    }
  }

  async createAutomatedTaskRule(data: {
    name: string;
    description?: string;
    taskTitle: string;
    taskDescription?: string;
    triggerType: 'DAY_OF_STAY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CHECK_IN' | 'CHECK_OUT';
    triggerDay?: number;
    triggerTime?: string;
    assignedRole: string;
    assignedTo?: string;
    roomScope: 'ALL_ROOMS' | 'SPECIFIC_ROOMS';
    roomIds?: string[];
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDateOffset?: number;
  }) {
    try {
      const rule = await prisma.automatedTaskRule.create({
        data: {
          name: data.name,
          description: data.description,
          taskTitle: data.taskTitle,
          taskDescription: data.taskDescription,
          triggerType: data.triggerType,
          triggerDay: data.triggerDay,
          triggerTime: data.triggerTime,
          assignedRole: data.assignedRole as any,
          assignedTo: data.assignedTo,
          roomScope: data.roomScope,
          roomIds: data.roomIds || [],
          priority: data.priority,
          dueDateOffset: data.dueDateOffset
        }
      });

      return rule;
    } catch (error) {
      console.error('Error creating automated task rule:', error);
      throw error;
    }
  }

  async triggerAutomatedTasks() {
    try {
      const activeRules = await prisma.automatedTaskRule.findMany({
        where: { isActive: true },
        include: { assignedUser: { select: { name: true, email: true } } }
      });

      const triggeredTasks = [];

      for (const rule of activeRules) {
        if (rule.triggerType === 'DAY_OF_STAY') {
          // Trigger for bookings on specific day of stay
          const triggered = await this.triggerDayOfStayTasks(rule);
          triggeredTasks.push(...triggered);
        } else if (rule.triggerType === 'CHECK_IN') {
          // Trigger for new check-ins
          const triggered = await this.triggerCheckInTasks(rule);
          triggeredTasks.push(...triggered);
        }
      }

      return triggeredTasks;
    } catch (error) {
      console.error('Error triggering automated tasks:', error);
      throw error;
    }
  }

  private async triggerDayOfStayTasks(rule: any) {
    const today = new Date();
    const triggeredTasks = [];

    // Find bookings that are on the specified day of stay
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        checkIn: { lte: today },
        checkOut: { gt: today }
      },
      include: {
        room: true,
        customer: true
      }
    });

    for (const booking of bookings) {
      const daysSinceCheckIn = Math.floor((today.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCheckIn === rule.triggerDay) {
        // Check if room is in scope
        if (rule.roomScope === 'ALL_ROOMS' || 
            (rule.roomScope === 'SPECIFIC_ROOMS' && rule.roomIds.includes(booking.roomId))) {
          
          const dueDate = rule.dueDateOffset 
            ? addHours(today, rule.dueDateOffset)
            : today;

          // Prevent duplicate tasks
          const existing = await prisma.notification.findFirst({
            where: {
              automatedRuleId: rule.id,
              roomId: booking.roomId,
              bookingId: booking.id,
              dueDate,
              status: { notIn: ['COMPLETED', 'CANCELLED'] }
            }
          });

          if (!existing) {
            const notificationData: any = {
              title: rule.taskTitle,
              description: rule.taskDescription,
              type: 'TASK',
              priority: rule.priority,
              assignedRole: rule.assignedRole,
              assignedTo: rule.assignedTo,
              guestId: booking.customerId,
              roomId: booking.roomId,
              bookingId: booking.id,
              dueDate,
              isAutomated: true,
              automatedRuleId: rule.id
            };
            // Remove undefined fields
            Object.keys(notificationData).forEach(
              (key) => notificationData[key] === undefined && delete notificationData[key]
            );
            const task = await this.createNotification(notificationData);
            triggeredTasks.push(task);
          }
        }
      }
    }

    return triggeredTasks;
  }

  private async triggerCheckInTasks(rule: any) {
    const today = new Date();
    const triggeredTasks = [];

    // Find bookings that check in today
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        checkIn: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      },
      include: {
        room: true,
        customer: true
      }
    });

    for (const booking of bookings) {
      // Check if room is in scope
      if (rule.roomScope === 'ALL_ROOMS' || 
          (rule.roomScope === 'SPECIFIC_ROOMS' && rule.roomIds.includes(booking.roomId))) {
        
        const dueDate = rule.dueDateOffset 
          ? addHours(today, rule.dueDateOffset)
          : today;

        // Prevent duplicate tasks
        const existing = await prisma.notification.findFirst({
          where: {
            automatedRuleId: rule.id,
            roomId: booking.roomId,
            bookingId: booking.id,
            dueDate,
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          }
        });

        if (!existing) {
          const notificationData: any = {
            title: rule.taskTitle,
            description: rule.taskDescription,
            type: 'TASK',
            priority: rule.priority,
            assignedRole: rule.assignedRole,
            assignedTo: rule.assignedTo,
            guestId: booking.customerId,
            roomId: booking.roomId,
            bookingId: booking.id,
            dueDate,
            isAutomated: true,
            automatedRuleId: rule.id
          };
          // Remove undefined fields
          Object.keys(notificationData).forEach(
            (key) => notificationData[key] === undefined && delete notificationData[key]
          );
          const task = await this.createNotification(notificationData);
          triggeredTasks.push(task);
        }
      }
    }

    return triggeredTasks;
  }

  async deleteNotificationAttachment(id: string) {
    try {
      await prisma.notificationAttachment.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting notification attachment:', error);
      throw error;
    }
  }

  async getAllAutomatedTaskRules() {
    return await prisma.automatedTaskRule.findMany();
  }

  async updateAutomatedTaskRule(id: string, data: any) {
    return await prisma.automatedTaskRule.update({
      where: { id },
      data,
    });
  }

  async deleteAutomatedTaskRule(id: string) {
    return await prisma.automatedTaskRule.delete({ where: { id } });
  }

  async getNotificationById(id: string) {
    return await prisma.notification.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { name: true, email: true, id: true } },
        createdByUser: { select: { name: true, email: true, id: true } },
        guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
        room: { select: { name: true } },
        attachments: true
      }
    });
  }

  async updateNotification(id: string, data: any) {
    // Exclude status (handled separately)
    const { status, ...updateData } = data;
    return await prisma.notification.update({
      where: { id },
      data: updateData,
      include: {
        assignedUser: { select: { name: true, email: true, id: true } },
        createdByUser: { select: { name: true, email: true, id: true } },
        guest: { select: { guestFirstName: true, guestLastName: true, guestEmail: true } },
        room: { select: { name: true } },
        attachments: true
      }
    });
  }

  async deleteNotification(id: string) {
    return await prisma.notification.delete({ where: { id } });
  }
}

export const notificationService = new NotificationService(); 