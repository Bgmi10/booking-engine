import prisma from '../prisma';
import WebSocketManager from '../websocket/websocketManager';

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
}

interface OrderQueueItem {
  orderId: string;
  status: string;
  createdAt: Date;
  assignedTo?: string;
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
  private orderAssignments: Map<string, { userId: string; assignedAt: Date }> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.initializeQueues();
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

  // Order created - notify kitchen and add to queue
  async orderCreated(orderId: string) {
    try {
      const order = await (prisma as any).order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          location: true
        }
      });

      if (!order) return;

      // Add to kitchen queue
      this.kitchenQueue.set(order.id, {
        orderId: order.id,
        status: order.status,
        createdAt: order.createdAt
      });

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
        items: order.items as any[],
        total: order.total,
        queuePosition: this.getQueuePosition(order.id, 'kitchen')
      };

      // Send to kitchen room with queue update
      this.wsManager.sendToRoom('KITCHEN', {
        type: 'order:created',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send to customer room
      this.wsManager.sendToRoom(`customer:${order.customerId}`, {
        type: 'order:created',
        orderId: order.id,
        data: eventData,
        timestamp: new Date()
      });

      // Send queue update to all kitchen users
      this.broadcastKitchenQueue();

      console.log(`Order created and added to kitchen queue: ${orderId}`);
    } catch (error) {
      console.error('Error sending order created notification:', error);
    }
  }

  // Kitchen picks up order (with concurrent prevention)
  async orderAssignedToKitchen(orderId: string, kitchenUserId: string, kitchenUserName: string) {
    try {
      // Check if order is already assigned
      if (this.orderAssignments.has(orderId)) {
        const assignment = this.orderAssignments.get(orderId);
        if (assignment && assignment.userId !== kitchenUserId) {
          throw new Error(`Order ${orderId} is already assigned to another user`);
        }
      }

      // Check if order is in kitchen queue
      if (!this.kitchenQueue.has(orderId)) {
        throw new Error(`Order ${orderId} is not available in kitchen queue`);
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
          kitchenStaff: true
        }
      });

      // Remove from kitchen queue
      this.kitchenQueue.delete(orderId);

      // Track assignment
      this.orderAssignments.set(orderId, {
        userId: kitchenUserId,
        assignedAt: new Date()
      });

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
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
          readyAt: new Date()
        },
        include: {
          customer: true,
          kitchenStaff: true
        }
      });

      // Add to waiter queue
      this.waiterQueue.set(order.id, {
        orderId: order.id,
        status: order.status,
        createdAt: order.createdAt
      });

      // Remove assignment tracking
      this.orderAssignments.delete(orderId);

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
        items: order.items as any[],
        readyAt: order.readyAt
      };

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

      console.log(`Order ready and added to waiter queue: ${orderId}`);
    } catch (error) {
      console.error('Error marking order as ready:', error);
    }
  }

  // Waiter picks up order (with concurrent prevention)
  async orderAssignedToWaiter(orderId: string, waiterUserId: string, waiterUserName: string) {
    try {
      // Check if order is already assigned
      if (this.orderAssignments.has(orderId)) {
        const assignment = this.orderAssignments.get(orderId);
        if (assignment && assignment.userId !== waiterUserId) {
          throw new Error(`Order ${orderId} is already assigned to another waiter`);
        }
      }

      // Check if order is in waiter queue
      if (!this.waiterQueue.has(orderId)) {
        throw new Error(`Order ${orderId} is not available in waiter queue`);
      }

      const order = await (prisma as any).order.update({
        where: { id: orderId },
        data: {
          status: 'ASSIGNED',
          assignedToWaiter: waiterUserId,
          waiterAssignedAt: new Date()
        },
        include: {
          customer: true,
          waiter: true
        }
      });

      // Remove from waiter queue
      this.waiterQueue.delete(orderId);

      // Track assignment
      this.orderAssignments.set(orderId, {
        userId: waiterUserId,
        assignedAt: new Date()
      });

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
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

      // Remove assignment tracking
      this.orderAssignments.delete(orderId);

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
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
          customer: true
        }
      });

      // Remove from queues
      this.kitchenQueue.delete(orderId);
      this.waiterQueue.delete(orderId);
      this.orderAssignments.delete(orderId);

      const eventData: OrderEventData = {
        orderId: order.id,
        status: order.status,
        customerName: `${order.customer.guestFirstName} ${order.customer.guestLastName}`,
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
  private async broadcastKitchenQueue() {
    // Fetch all orders in the kitchen queue with full details
    const queue = Array.from(this.kitchenQueue.values());
    const orderIds = queue.map(q => q.orderId);
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { location: true, customer: true }
    });
    // Map to detailed queue items
    const detailedQueue = queue.map(q => {
      const order = orders.find(o => o.id === q.orderId);
      return {
        orderId: q.orderId,
        status: q.status,
        createdAt: q.createdAt,
        assignedToKitchen: q.assignedTo,
        locationName: order?.locationName || '',
        items: order?.items || [],
        customerName: order ? `${order.customer?.guestFirstName || ''} ${order.customer?.guestLastName || ''}` : '',
        total: order?.total || 0
      };
    });
    const queueEvent: QueueUpdateEvent = {
      type: 'queue:kitchen_update',
      data: { queue: detailedQueue },
      timestamp: new Date()
    };
    (this.wsManager as any).sendToRoom('KITCHEN', queueEvent);
  }

  // Broadcast waiter queue to all waiter users
  private broadcastWaiterQueue() {
    this.getWaiterQueue().then(queue => {
      const queueEvent: QueueUpdateEvent = {
        type: 'queue:waiter_update',
        data: { queue },
        timestamp: new Date()
      };
      // Use any to bypass the type check for queue updates
      (this.wsManager as any).sendToRoom('WAITER', queueEvent);
    });
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
    const queue = queueType === 'kitchen' ? this.kitchenQueue : this.waiterQueue;
    return queue.has(orderId) && !this.orderAssignments.has(orderId);
  }

  // Get order assignment info
  getOrderAssignment(orderId: string) {
    return this.orderAssignments.get(orderId);
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
      assignments: this.orderAssignments.size
    };
  }

  async createOrderFromWebSocket({ items, total, location, customerId }: { items: any[]; total: number; location: string; customerId: string }) {
    // Create order in DB
    const order = await (prisma as any).order.create({
      data: {
        status: 'PENDING',
        items: items,
        total,
        locationName: location,
        customerId
      }
    });
    // Broadcast order created event
    await this.orderCreated(order.id);
    return order;
  }
}

export default OrderEventService; 