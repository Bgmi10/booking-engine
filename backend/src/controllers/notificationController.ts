import { notificationService } from '../services/notificationService';
import { responseHandler, handleError } from '../utils/helper';
import { Request, Response } from 'express';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { status, type, priority, limit } = req.query;
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    const notifications = await notificationService.getNotificationsForUser(
      user.id,
      user.role,
      isAdminOrManager,
      {
        status: typeof status === 'string' ? status : undefined,
        type: typeof type === 'string' ? type : undefined,
        priority: typeof priority === 'string' ? priority : undefined,
        limit: limit ? Number(limit) : undefined
      }
    );
    responseHandler(res, 200, 'Notifications fetched', notifications);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(id);
    responseHandler(res, 200, 'Notification fetched', notification);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { type, assignedRole } = req.body;

    const typeOptions = [
      'TASK', 'MAINTENANCE', 'CLEANING', 'GUEST_REQUEST', 'BIRTHDAY', 'CHECK_IN', 'CHECK_OUT', 'PAYMENT', 'KITCHEN', 'SERVICE', 'ADMIN'
    ];
    const roleOptions = [
      'ADMIN', 'MANAGER', 'RECEPTION', 'CLEANER', 'MAINTENANCE', 'KITCHEN', 'WAITER'
    ];
    const roleTypeMap: Record<string, { types: string[], roles: string[] }> = {
      ADMIN: { types: typeOptions, roles: roleOptions },
      MANAGER: { types: typeOptions, roles: roleOptions },
      RECEPTION: { types: typeOptions, roles: roleOptions },
      WAITER: {
        types: ['SERVICE', 'KITCHEN', 'TASK'],
        roles: ['WAITER', 'KITCHEN']
      },
      CLEANER: {
        types: ['CLEANING', 'TASK'],
        roles: ['CLEANER']
      },
      MAINTENANCE: {
        types: ['MAINTENANCE', 'TASK'],
        roles: ['MAINTENANCE']
      },
      KITCHEN: {
        types: ['KITCHEN', 'TASK'],
        roles: ['KITCHEN']
      },
    };
    const allowedTypes = user?.role && roleTypeMap[user.role] ? roleTypeMap[user.role].types : typeOptions;
    const allowedRoles = user?.role && roleTypeMap[user.role] ? roleTypeMap[user.role].roles : roleOptions;
    if (!allowedTypes.includes(type) || !allowedRoles.includes(assignedRole)) {
      responseHandler(res, 403, 'You are not allowed to assign this type or role');
      return
    }
    const notification = await notificationService.createNotification(req.body, user.id);
    responseHandler(res, 201, 'Notification created', notification);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const updateNotification = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(id);
    if (!notification) {
      responseHandler(res, 404, 'Notification not found');
      return;
    }
    // Only allow full edit if admin/manager/creator
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    //@ts-ignore
    const isCreator = notification.createdByUserId === user.id;
    const isAssignee = notification.assignedTo === user.id;
    if (req.body.status && isAssignee) {
      // Allow assignee to update status only
      const updated = await notificationService.updateNotificationStatus(id, req.body.status);
      responseHandler(res, 200, 'Notification status updated', updated);
      return;
    } else if (isAdminOrManager || isCreator) {
      // Allow full edit (implement as needed)
      const updated = await notificationService.updateNotification(id, req.body);
      responseHandler(res, 200, 'Notification updated', updated);
      return;
    } else {
      responseHandler(res, 403, 'You are not allowed to edit this notification');
      return 
    }
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const completeNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;
    const notification = await notificationService.completeNotification(id, completedBy);
    responseHandler(res, 200, 'Notification completed', notification);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const { id } = req.params;
    const notification = await notificationService.getNotificationById(id);
    if (!notification) {
      responseHandler(res, 404, 'Notification not found');
      return;
    }
    const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';
    //@ts-ignore
    const isCreator = notification.createdByUserId === user.id;
    if (isAdminOrManager || isCreator) {
      await notificationService.deleteNotification(id);
      responseHandler(res, 200, 'Notification deleted');
      return;
    } else {
      responseHandler(res, 403, 'You are not allowed to delete this notification');
      return;
    }
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getDailyActionList = async (req: Request, res: Response) => {
  try {
    const { role, userId, date } = req.query;
    const actionList = await notificationService.getDailyActionList({
      role: typeof role === 'string' ? role : undefined,
      userId: typeof userId === 'string' ? userId : undefined,
      date: date ? new Date(date as string) : undefined
    });
    responseHandler(res, 200, 'Daily action list fetched', actionList);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const deleteNotificationAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotificationAttachment(id);
    responseHandler(res, 200, 'Attachment deleted');
  } catch (e) {
    handleError(res, e as Error);
  }
}; 