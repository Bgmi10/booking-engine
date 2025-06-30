import prisma from '../prisma';
import WebSocketManager from '../websocket/websocketManager';
import TelegramService from './telegramService';
interface OrderEventData {
  orderId: string;
  status: string;
  customerName?: string;
  items?: any[];
  total?: number;
  assignedTo?: string;
  assignedToName?: string;
  pickedAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
  queuePosition?: number;
  paymentMethod?: string;
  hasKitchenItems?: boolean;
  hasWaiterItems?: boolean;
  kitchenItems?: any[];
  waiterItems?: any[];
}

interface OrderQueueItem {
  orderId: string;
  status: string;
  createdAt: Date;
  assignedTo?: string | null;
}

interface QueueUpdateEvent {
  type: string;
  data: { queue: OrderQueueItem[] };
  timestamp: Date;
}

class OrderEventService {
  private wsManager: WebSocketManager;
  private kitchenQueue: Map<string, OrderQueueItem> = new Map();
  private waiterQueue: Map<string, OrderQueueItem> = new Map();
  private kitchenAssignments: Map<string, { userId: string; assignedAt: Date }> = new Map();
  private waiterAssignments: Map<string, { userId: string; assignedAt: Date }> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.initializeQueues();
    this.startPeriodicRefresh();
  }

  private async initializeQueues() {
    try {
      // Load pending orders into kitchen queue
      const pendingOrders = await (prisma as any).order.findMany({
        where: { status: 'PENDING' },
        include: { customer: true }
      });

      pendingOrders.forEach((order: any) => {
        this.kitchenQueue.set(order.id, {
          orderId: order.id,
          status: order.status,
          createdAt: order.createdAt,
          assignedTo: order.assignedToKitchen
        });
      });

      // Load ready orders into waiter queue
      const readyOrders = await (prisma as any).order.findMany({
        where: { status: 'READY' },
        include: { customer: true }
      });

      readyOrders.forEach((order: any) => {
        this.waiterQueue.set(order.id, {
          orderId: order.id,
          status: order.status,
          createdAt: order.createdAt,
          assignedTo: order.assignedToWaiter
        });
      });

      console.log(`Initialized queues: ${this.kitchenQueue.size} kitchen orders, ${this.waiterQueue.size} waiter orders`);
    } catch (error) {
      console.error('Error initializing queues:', error);
    }
  }

  private startPeriodicRefresh() {
    // Refresh queues every 30 seconds to keep clients in sync
    setInterval(() => {
      try {
        this.broadcastKitchenQueue();
        this.broadcastWaiterQueue();
        
        // Send heartbeat to all rooms to keep connections alive
        const heartbeat = {
          type: 'heartbeat',
          data: { timestamp: Date.now() },
          timestamp: new Date()
        };
        this.wsManager.sendToRoom('KITCHEN', heartbeat);
        this.wsManager.sendToRoom('WAITER', heartbeat);
        this.wsManager.sendToRoom('ADMIN', heartbeat);
      } catch (error) {
        console.error("Error in periodic refresh:", error);
      }
    }, 30000); // 30 seconds
  }

  // Order created - notify kitchen and add to queue
  async orderCreated(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          location: true,
          charge: true,
          temporaryCustomer: true
        }
      });

      if (!order) return;

      const allItems = order.items as any[];
      const kitchenItems = allItems.filter(item => !item.role || item.role === 'KITCHEN');
      const waiterItems = allItems.filter(item => item.role === 'WAITER');
      const hasKitchenItems = kitchenItems.length > 0;
      const hasWaiterItems = waiterItems.length > 0;
      
      const customerName = order.customer 
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer 
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      // Flow 1: Order has kitchen items (can be kitchen-only or hybrid)
      if (hasKitchenItems) {
        console.log(`Order ${orderId} has kitchen items. Starting kitchen flow.`);
        
        this.kitchenQueue.set(order.id, {
        orderId: order.id,
        status: order.status,
            createdAt: order.createdAt
        });

        // Notify Kitchen staff
        this.wsManager.sendToRoom('KITCHEN', {
          type: 'order:created',
          orderId: order.id,
            data: { ...order, hasKitchenItems: true, hasWaiterItems, customerName },
          timestamp: new Date()
        });
        
        await TelegramService.notifyNewOrder(order.id, {
            total: order.total,
            locationName: order.locationName,
            hasKitchenItems: true,
            hasWaiterItems,
            itemCount: kitchenItems.length
        });

        // If it's a HYBRID order, also notify Waiter staff as a heads-up
      if (hasWaiterItems) {
            console.log(`Order ${orderId} is hybrid. Notifying waiters.`);
        this.wsManager.sendToRoom('WAITER', {
          type: 'order:created',
          orderId: order.id,
                data: { ...order, hasKitchenItems, hasWaiterItems, customerName },
          timestamp: new Date()
        });
            await TelegramService.notifyWaiterOrder(order.id, {
                total: order.total,
                locationName: order.locationName,
                hasKitchenItems: true,
                itemCount: waiterItems.length
            });
        }
        
      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:created',
        orderId: order.id,
            data: { ...order, customerName },
        timestamp: new Date()
      });

        // single source of truth for a new order, preventing a race condition
        // with the queue update on the client-side. The queue will sync on the
        // next periodic refresh or other event.
        this.broadcastKitchenQueue();

      // Flow 2: Order is waiter-only (no kitchen items)
      } else if (hasWaiterItems) {
        console.log(`Order ${orderId} is waiter-only. Skipping kitchen.`);
        
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'READY', deliveryItems: waiterItems },
            include: { customer: true, temporaryCustomer: true, location: true, charge: true }
        });

        this.waiterQueue.set(updatedOrder.id, {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            createdAt: updatedOrder.createdAt,
        });

        const customerName = updatedOrder.customer 
          ? `${updatedOrder.customer.guestFirstName} ${updatedOrder.customer.guestLastName}`
          : updatedOrder.temporaryCustomer 
            ? `Guest ${updatedOrder.temporaryCustomer.surname}`
            : 'Unknown Guest';

        const eventData = { ...updatedOrder, customerName, hasKitchenItems: false, hasWaiterItems: true };

        this.wsManager.sendToRoom('WAITER', {
            type: 'order:ready',
            orderId: updatedOrder.id,
            data: eventData,
            timestamp: new Date()
        });
        
        this.wsManager.sendToRoom('ADMIN', {
            type: 'order:created',
            orderId: updatedOrder.id,
            data: eventData,
            timestamp: new Date()
        });

        await TelegramService.notifyWaiterOrder(order.id, {
            total: order.total,
            locationName: order.locationName,
            hasKitchenItems: false,
            itemCount: waiterItems.length
        });
        
        this.broadcastWaiterQueue();
      
      // Flow 3: Order has no items, default to kitchen to be safe
      } else {
        console.log(`Order ${orderId} has no specific items, defaulting to kitchen flow.`);
        this.kitchenQueue.set(order.id, {
            orderId: order.id,
            status: order.status,
            createdAt: order.createdAt
        });
        this.wsManager.sendToRoom('KITCHEN', {
            type: 'order:created',
            orderId: order.id,
            data: { ...order, customerName },
            timestamp: new Date()
        });
        await TelegramService.notifyNewOrder(order.id, {
            total: order.total,
            locationName: order.locationName,
            hasKitchenItems: true,
            hasWaiterItems: false,
            itemCount: 0
        });
        // Do NOT broadcast here either for the same reason.
        this.broadcastKitchenQueue();
      }

      } catch (error) {
      console.error('Error in orderCreated:', error);
    }
  }

  // Kitchen picks up order (with concurrent prevention)
  async orderAssignedToKitchen(orderId: string, kitchenUserId: string, kitchenUserName: string) {
    try {
      // Check if order is already assigned to a kitchen member
      if (this.kitchenAssignments.has(orderId)) {
        const assignment = this.kitchenAssignments.get(orderId);
        if (assignment && assignment.userId !== kitchenUserId) {
          throw new Error(`Order ${orderId} is already assigned to another user`);
        }
      }

      // Check if order is in kitchen queue
      if (!this.kitchenQueue.has(orderId)) {
        // Check if order exists in database with PENDING status before failing
        const orderExists = await prisma.order.findFirst({
          where: { 
            id: orderId,
            status: 'PENDING'
          }
        });
        
        if (orderExists) {
          // If order exists in database but not in queue, add it to the queue
          console.log(`Order ${orderId} found in database but not in queue. Adding to queue now.`);
          this.kitchenQueue.set(orderId, {
            orderId,
            status: orderExists.status,
            createdAt: orderExists.createdAt
          });
        } else {
        throw new Error(`Order ${orderId} is not available in kitchen queue`);
        }
      }

      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: 'PREPARING',
          assignedToKitchen: kitchenUserId,
          kitchenAssignedAt: new Date()
        },
        include: {
          customer: true,
          kitchenStaff: true,
          temporaryCustomer: true
        }
      });

      // Remove from kitchen queue
      this.kitchenQueue.delete(orderId);

      // Track assignment for kitchen
      this.kitchenAssignments.set(orderId, {
        userId: kitchenUserId,
        assignedAt: new Date()
      });

      const customerName = order.customer
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: customerName,
        assignedTo: kitchenUserId,
        assignedToName: kitchenUserName,
        items: order.items as any[],
        pickedAt: order.kitchenAssignedAt
      };

      // Send to kitchen room
      this.wsManager.sendToRoom('KITCHEN', {
        type: 'order:assigned_kitchen',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:assigned_kitchen',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to admin room
      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:assigned_kitchen',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Update kitchen queue for all users
      this.broadcastKitchenQueue();

      console.log(`Order assigned to kitchen: ${orderId} by ${kitchenUserName}`);
    } catch (error) {
      console.error('Error assigning order to kitchen:', error);
      throw error;
    }
  }

  // Kitchen marks order as ready
  async orderReady(orderId: string) {
    try {
      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          readyAt: new Date(),
          deliveryItems: (await prisma.order.findUnique({ where: { id: orderId } }))?.items,
        },
        include: {
          customer: true,
          kitchenStaff: true,
          temporaryCustomer: true,
          location: true
        }
      });

      // Add to waiter queue - all ready orders should be in waiter queue
      this.waiterQueue.set(order.id, {
        orderId: order.id,
        status: order.status,
        createdAt: order.createdAt
      });

      // Remove kitchen assignment tracking
      this.kitchenAssignments.delete(orderId);

      const customerName = order.customer
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      // Send the full order object.
      const eventData = { ...order, customerName };

      // Send to waiter room
      this.wsManager.sendToRoom('WAITER', {
        type: 'order:ready',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:ready',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to admin room
      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:ready',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Update waiter queue for all users
      this.broadcastWaiterQueue();

      // Send Telegram notification to Waiter ONLY if no waiter has acknowledged it yet.
      if (!order.assignedToWaiter) {
      try {
        const notificationSent = await TelegramService.notifyOrderReadyForPickup(order.id);
        
        if (notificationSent) {
          console.log(`Telegram notification sent for ready order: ${orderId}`);
        } else {
          console.warn(`Failed to send Telegram notification for ready order: ${orderId}`);
        }
      } catch (error) {
        console.error(`Error sending Telegram notification for ready order: ${orderId}`, error);
        }
      }

      console.log(`Order ready and added to waiter queue: ${orderId}`);
    } catch (error) {
      console.error('Error marking order as ready:', error);
    }
  }

  // Waiter picks up order (with concurrent prevention)
  async orderAssignedToWaiter(orderId: string, waiterUserId: string, waiterUserName: string) {
    try {
      const currentOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (!currentOrder) {
        throw new Error(`Order ${orderId} not found.`);
      }

      // CRITICAL: Check if another waiter has already been assigned in the DB.
      // This prevents race conditions for both acknowledgements and pickups.
      if (currentOrder.assignedToWaiter && currentOrder.assignedToWaiter !== waiterUserId) {
          throw new Error(`Order ${orderId} is already assigned to another waiter.`);
      }

      // If the order is READY, it's a delivery assignment. Check waiterAssignments map for in-memory safety.
      if (currentOrder.status === 'READY') {
        if (this.waiterAssignments.has(orderId)) {
          const assignment = this.waiterAssignments.get(orderId);
        if (assignment && assignment.userId !== waiterUserId) {
            throw new Error(`Order ${orderId} is already assigned to another waiter for delivery`);
          }
        }
      }

      // A waiter can be assigned to PENDING, PREPARING, or READY orders.
      const isAssignable = ['PENDING', 'PREPARING', 'READY'].includes(currentOrder.status);
      if (!isAssignable) {
        throw new Error(`Order ${orderId} is in status ${currentOrder.status} and cannot be assigned.`);
      }

      // The status only becomes 'ASSIGNED' if the order was already 'READY' for pickup.
      // Otherwise, it remains in its current state (e.g., 'PENDING', 'PREPARING').
      const newStatus = currentOrder.status === 'READY' ? 'ASSIGNED' : currentOrder.status;

      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          assignedToWaiter: waiterUserId,
          waiterAssignedAt: new Date()
        },
        include: {
          customer: true,
          waiter: true,
          temporaryCustomer: true,
          location: true
        }
      });

      // Remove from waiter queue only if it was ready and in the queue
      if (currentOrder.status === 'READY') {
      this.waiterQueue.delete(orderId);
      }

      // If order is ready, it's a delivery assignment.
      // Otherwise, it's just an acknowledgement.
      if (currentOrder.status === 'READY') {
          this.waiterAssignments.set(orderId, {
        userId: waiterUserId,
        assignedAt: new Date()
      });
      }

      const customerName = order.customer
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: customerName,
        assignedTo: waiterUserId,
        assignedToName: waiterUserName,
        items: order.items as any[],
        pickedAt: order.waiterAssignedAt
      };

      // Send to waiter room
      this.wsManager.sendToRoom('WAITER', {
        type: 'order:assigned_waiter',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:assigned_waiter',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to admin room
      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:assigned_waiter',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Update waiter queue for all users
      this.broadcastWaiterQueue();

      console.log(`Order assigned to waiter: ${orderId} by ${waiterUserName}`);
    } catch (error) {
      console.error('Error assigning order to waiter:', error);
      throw error;
    }
  }

  // Waiter delivers order
  async orderDelivered(orderId: string) {
    try {
      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date()
        },
        include: {
          customer: true,
          waiter: true
        }
      });

      // Remove assignment tracking for both
      this.kitchenAssignments.delete(orderId);
      this.waiterAssignments.delete(orderId);

      const customerName = order.customer
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: customerName,
        assignedTo: order.waiter?.name,
        deliveredAt: order.deliveredAt
      };

      // Send to admin room
      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:delivered',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:delivered',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      console.log(`Order delivered: ${orderId}`);
    } catch (error) {
      console.error('Error delivering order:', error);
    }
  }

  // Order cancelled
  async orderCancelled(orderId: string) {
    try {
      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED'
        },
        include: {
          customer: true,
          temporaryCustomer: true
        }
      });

      // Remove from queues
      this.kitchenQueue.delete(orderId);
      this.waiterQueue.delete(orderId);
      this.kitchenAssignments.delete(orderId);
      this.waiterAssignments.delete(orderId);

      const customerName = order.customer
        ? `${order.customer.guestFirstName} ${order.customer.guestLastName}`
        : order.temporaryCustomer
          ? `Guest ${order.temporaryCustomer.surname}`
          : 'Unknown Guest';

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: customerName,
      };

      // Send to all relevant rooms
      this.wsManager.sendToRoom('KITCHEN', {
        type: 'order:cancelled',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      this.wsManager.sendToRoom('WAITER', {
        type: 'order:cancelled',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      this.wsManager.sendToRoom('ADMIN', {
        type: 'order:cancelled',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:cancelled',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Update queues
      this.broadcastKitchenQueue();
      this.broadcastWaiterQueue();

      // Send Telegram notification to all staff
      try {
        const notificationSent = await TelegramService.notifyOrderCancelled(order.id);
        
        if (notificationSent) {
          console.log(`Telegram notification sent for cancelled order: ${orderId}`);
        } else {
          console.warn(`Failed to send Telegram notification for cancelled order: ${orderId}`);
        }
      } catch (error) {
        console.error(`Error sending Telegram notification for cancelled order: ${orderId}`, error);
      }

      console.log(`Order cancelled: ${orderId}`);
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  }

  // Get kitchen queue
  async getKitchenQueue() {
    const queue = Array.from(this.kitchenQueue.values());
    return queue.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  // Get waiter queue
  async getWaiterQueue() {
    const queue = Array.from(this.waiterQueue.values());
    return queue.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  // Broadcast kitchen queue to all kitchen users
  public async broadcastKitchenQueue() {
    try {
    // Fetch all orders in the kitchen queue with full details
    const queue = Array.from(this.kitchenQueue.values());
      
      if (queue.length === 0) {
        const emptyQueueEvent: QueueUpdateEvent = {
          type: 'queue:kitchen_update',
          data: { queue: [] },
          timestamp: new Date()
        };
        this.wsManager.sendToRoom('KITCHEN', emptyQueueEvent);
        return;
      }
      
    const orderIds = queue.map(q => q.orderId);
      
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
        include: { location: true, customer: true, temporaryCustomer: true, charge: true }
    });
      
    // Map to detailed queue items
    const detailedQueue = queue.map(q => {
      const order = orders.find(o => o.id === q.orderId);
        
        // Handle customer name properly with fallbacks
        let customerName = 'Unknown Guest';
        if (order?.customer) {
          customerName = `${order.customer.guestFirstName || ''} ${order.customer.guestLastName || ''}`.trim();
        } else if (order?.temporaryCustomer) {
          customerName = `Guest ${order.temporaryCustomer.surname || ''}`.trim();
        }
        
      return {
        orderId: q.orderId,
        status: q.status,
        createdAt: q.createdAt,
        assignedToKitchen: q.assignedTo,
        locationName: order?.locationName || '',
        items: order?.items || [],
          customerName: customerName,
          total: order?.total || 0,
          charge: order?.charge || null
      };
    });
      
    const queueEvent: QueueUpdateEvent = {
      type: 'queue:kitchen_update',
      data: { queue: detailedQueue },
      timestamp: new Date()
    };
      
      this.wsManager.sendToRoom('KITCHEN', queueEvent);
    } catch (error) {
      console.error('Error broadcasting kitchen queue:', error);
    }
  }

  // Broadcast waiter queue to all waiter users
  public async broadcastWaiterQueue() {
    try {
      const queue = Array.from(this.waiterQueue.values());
      
      if (queue.length === 0) {
        const emptyQueueEvent: QueueUpdateEvent = {
        type: 'queue:waiter_update',
          data: { queue: [] },
        timestamp: new Date()
      };
        this.wsManager.sendToRoom('WAITER', emptyQueueEvent);
        return;
      }
      
      const orderIds = queue.map(q => q.orderId);
      
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: { location: true, customer: true, temporaryCustomer: true, charge: true }
      });
      
      // Map to detailed queue items with charge information
      const detailedQueue = queue.map(q => {
        const order = orders.find(o => o.id === q.orderId);
        
        // Handle customer name properly with fallbacks
        let customerName = 'Unknown Guest';
        if (order?.customer) {
          customerName = `${order.customer.guestFirstName || ''} ${order.customer.guestLastName || ''}`.trim();
        } else if (order?.temporaryCustomer) {
          customerName = `Guest ${order.temporaryCustomer.surname || ''}`.trim();
        }
        
        return {
          orderId: q.orderId,
          status: q.status,
          createdAt: q.createdAt,
          assignedToWaiter: q.assignedTo,
          locationName: order?.locationName || '',
          items: order?.items || [],
          customerName: customerName,
          total: order?.total || 0,
          charge: order?.charge || null
        };
      });
      
      // Sort by created time
      const sortedQueue = detailedQueue.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      const queueEvent: QueueUpdateEvent = {
        type: 'queue:waiter_update',
        data: { queue: sortedQueue },
        timestamp: new Date()
      };
      
      this.wsManager.sendToRoom('WAITER', queueEvent);
    } catch (error) {
      console.error('Error broadcasting waiter queue:', error);
    }
  }

  // Get queue position for an order
  private getQueuePosition(orderId: string, queueType: 'kitchen' | 'waiter'): number {
    const queue = queueType === 'kitchen' ? this.kitchenQueue : this.waiterQueue;
    const queueArray = Array.from(queue.values());
    const sortedQueue = queueArray.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    
    return sortedQueue.findIndex(item => item.orderId === orderId) + 1;
  }

  // Check if order is available for pickup
  isOrderAvailable(orderId: string, queueType: 'kitchen' | 'waiter'): boolean {
    if (queueType === 'kitchen') {
        return this.kitchenQueue.has(orderId) && !this.kitchenAssignments.has(orderId);
    }
    // For waiters, "available" means in the ready queue and not assigned for delivery
    return this.waiterQueue.has(orderId) && !this.waiterAssignments.has(orderId);
  }

  // Get order assignment info
  getOrderAssignment(orderId: string) {
    return {
        kitchen: this.kitchenAssignments.get(orderId),
        waiter: this.waiterAssignments.get(orderId)
    };
  }

  // Get connected users count for monitoring
  getConnectedUsersCount() {
    return {
      total: this.wsManager.getConnectedUsersCount(),
      kitchen: this.wsManager.getRoomUsersCount('KITCHEN'),
      waiter: this.wsManager.getRoomUsersCount('WAITER'),
      admin: this.wsManager.getRoomUsersCount('ADMIN')
    };
  }

  // Get queue statistics
  getQueueStats() {
    return {
      kitchen: {
        total: this.kitchenQueue.size
      },
      waiter: {
        total: this.waiterQueue.size
      },
      assignments: {
        kitchen: this.kitchenAssignments.size,
        waiter: this.waiterAssignments.size
      }
    };
  }

  // Synchronize queues with database to ensure consistency
  async synchronizeQueues() {
    try {
      console.log("Starting queue synchronization with database...");
      
      // Clear existing queues
      this.kitchenQueue.clear();
      this.waiterQueue.clear();
      
      // Reload pending orders into kitchen queue
      const pendingOrders = await prisma.order.findMany({
        where: { status: 'PENDING' }
      });

      pendingOrders.forEach(order => {
        this.kitchenQueue.set(order.id, {
          orderId: order.id,
          status: order.status,
          createdAt: order.createdAt,
          assignedTo: order.assignedToKitchen
        });
      });

      // Reload ready orders into waiter queue
      const readyOrders = await prisma.order.findMany({
        where: { status: 'READY' }
      });

      readyOrders.forEach(order => {
        this.waiterQueue.set(order.id, {
          orderId: order.id,
          status: order.status,
          createdAt: order.createdAt,
          assignedTo: order.assignedToWaiter
        });
      });
      
      // Reset assignments to ensure they match reality
      this.kitchenAssignments.clear();
      this.waiterAssignments.clear();
      const assignedOrders = await prisma.order.findMany({
        where: {
          OR: [
            { status: 'PREPARING', NOT: { assignedToKitchen: null } },
            { status: 'ASSIGNED', NOT: { assignedToWaiter: null } }
          ]
        }
      });
      
      assignedOrders.forEach(order => {
        if (order.status === 'PREPARING' && order.assignedToKitchen) {
          this.kitchenAssignments.set(order.id, {
            userId: order.assignedToKitchen as string,
            assignedAt: order.kitchenAssignedAt || new Date()
          });
        }
        // A waiter can be assigned to a PENDING/PREPARING order (acknowledged)
        if (order.assignedToWaiter && ['PENDING', 'PREPARING'].includes(order.status)) {
            // This is an acknowledgement, not a delivery assignment, so we don't add to waiterAssignments map.
            // The DB is the source of truth for this state.
        }
        // A waiter can be assigned to a READY order (for delivery)
        else if (order.status === 'ASSIGNED' && order.assignedToWaiter) {
          this.waiterAssignments.set(order.id, {
            userId: order.assignedToWaiter as string,
            assignedAt: order.waiterAssignedAt || new Date()
          });
        }
      });

      console.log(`Queue synchronization complete: ${this.kitchenQueue.size} kitchen orders, ${this.waiterQueue.size} waiter orders, ${this.kitchenAssignments.size} kitchen assignments, ${this.waiterAssignments.size} waiter assignments`);
      
      // Broadcast updated queues
      this.broadcastKitchenQueue();
      this.broadcastWaiterQueue();
      
      return {
        kitchen: this.kitchenQueue.size,
        waiter: this.waiterQueue.size,
        assignments: this.kitchenAssignments.size + this.waiterAssignments.size
      };
    } catch (error) {
      console.error('Error synchronizing queues:', error);
      throw error;
    }
  }
}

export default OrderEventService; 