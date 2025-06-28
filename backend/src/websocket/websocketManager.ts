import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import dotenv from "dotenv";

dotenv.config();

interface ConnectedUser {
  id: string;
  role?: string;
  ws: WebSocket;
  rooms: string[];
  isCustomer?: boolean;
}

interface OrderEvent {
  type: string;
  orderId: string;
  data: any;
  timestamp: Date;
}

interface JWTPayload {
  id: string;
  email?: string;
  role?: string;
  iat: number;
  exp: number;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    });
    this.initialize();
  }

  private async verifyClient(info: any, callback: (res: boolean, code?: number, message?: string) => void) {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token || token === 'undefined' || token === 'null') {
        console.log('WebSocket connection rejected: No token provided');
        callback(false, 4000, 'No Token Provided');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;

        console.log(decoded)
        if (decoded.role) {
          // User with role (staff)
          (info.req as any).user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
          };
          callback(true);
        } else {
          // Customer: check if id exists in Customer table
          const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
          if (customer) {
            (info.req as any).user = {
              id: decoded.id,
              email: decoded.email,
              isCustomer: true
            };
            callback(true);
          } else {
            console.log('WebSocket connection rejected: Customer not found');
            callback(false, 4004, 'Customer Not Found');
          }
        }
      } catch (jwtError) {
        console.log('WebSocket connection rejected: Invalid token');
        callback(false, 4001, 'Invalid Token');
      }
    } catch (error) {
      console.log('WebSocket connection rejected: Token verification error');
      callback(false, 4002, 'Token Verification Error');
    }
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const user = req.user;
      if (!user) {
        ws.close(4003, 'No User Info');
        return;
      }

      if (user.role) {
        // Staff user
        console.log(`New WebSocket connection established for user: ${user.id} (${user.role})`);
        const connectedUser: ConnectedUser = {
          id: user.id,
          role: user.role,
          ws: ws,
          rooms: []
        };
        this.connectedUsers.set(user.id, connectedUser);
        this.joinRoom(ws, { room: user.role });
      } else if (user.isCustomer) {
        // Customer user
        console.log(`New WebSocket connection established for customer: ${user.id}`);
        const connectedUser: ConnectedUser = {
          id: user.id,
          ws: ws,
          rooms: [],
          isCustomer: true
        };
        this.connectedUsers.set(user.id, connectedUser);
        this.joinRoom(ws, { room: `customer:${user.id}` });
      }

      ws.send(JSON.stringify({ 
        type: 'auth_success', 
        userId: user.id, 
        role: user.role || null,
        isCustomer: !!user.isCustomer,
        message: 'Successfully connected to WebSocket server'
      }));

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'join_room':
        this.joinRoom(ws, data);
        break;
      case 'leave_room':
        this.leaveRoom(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'create_order':
        this.handleCreateOrder(ws, data);
        break;
      case 'accept_kitchen_order':
        this.handleAcceptKitchenOrder(ws, data);
        break;
      case 'mark_kitchen_ready':
        this.handleMarkKitchenReady(ws, data);
        break;
      case 'accept_waiter_order':
        this.handleAcceptWaiterOrder(ws, data);
        break;
      case 'mark_order_delivered':
        this.handleMarkOrderDelivered(ws, data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private async handleCreateOrder(ws: WebSocket, data: any) {
    try {
      const user = this.findUserByWebSocket(ws);
      if (!user || !user.isCustomer) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated as customer' }));
        return;
      }
      const orderEventService = (global as any).orderEventService;
      const order = await orderEventService.createOrderFromWebSocket({
        ...data.order,
        customerId: user.id
      });
      ws.send(JSON.stringify({ type: 'order_created', data: order }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: 'error', message: error.message || 'Order creation failed' }));
    }
  }

  private async handleAcceptKitchenOrder(ws: WebSocket, data: any) {
    try {
      const user = this.findUserByWebSocket(ws);
      if (!user || !user.role || user.role !== 'KITCHEN') {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated as kitchen staff' }));
        return;
      }
      const orderEventService = (global as any).orderEventService;
      await orderEventService.orderAssignedToKitchen(data.orderId, user.id, user.role ? user.role : user.id);
      ws.send(JSON.stringify({ type: 'accept_kitchen_order_success', orderId: data.orderId }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: 'error', message: error.message || 'Accept order failed' }));
    }
  }

  private async handleMarkKitchenReady(ws: WebSocket, data: any) {
    try {
      const user = this.findUserByWebSocket(ws);
      if (!user || user.role !== 'KITCHEN') {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated as kitchen staff' }));
        return;
      }
      const orderEventService = (global as any).orderEventService;
      await orderEventService.orderReady(data.orderId);
      ws.send(JSON.stringify({ type: 'mark_kitchen_ready_success', orderId: data.orderId }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: 'error', message: error.message || 'Mark as ready failed' }));
    }
  }

  private async handleAcceptWaiterOrder(ws: WebSocket, data: any) {
    try {
      const user = this.findUserByWebSocket(ws);
      if (!user || user.role !== 'WAITER') {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated as waiter staff' }));
        return;
      }
      const orderEventService = (global as any).orderEventService;
      const userInfo = await prisma.user.findUnique({ where: { id: user.id }});
      await orderEventService.orderAssignedToWaiter(data.orderId, user.id, userInfo?.name || 'Waiter');
      ws.send(JSON.stringify({ type: 'accept_waiter_order_success', orderId: data.orderId }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: 'error', message: error.message || 'Accept waiter order failed' }));
    }
  }

  private async handleMarkOrderDelivered(ws: WebSocket, data: any) {
    try {
      const user = this.findUserByWebSocket(ws);
      if (!user || user.role !== 'WAITER') {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated as waiter staff' }));
        return;
      }
      const orderEventService = (global as any).orderEventService;
      await orderEventService.orderDelivered(data.orderId);
      ws.send(JSON.stringify({ type: 'mark_order_delivered_success', orderId: data.orderId }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: 'error', message: error.message || 'Mark as delivered failed' }));
    }
  }

  private joinRoom(ws: WebSocket, data: any) {
    const { room } = data;
    const user = this.findUserByWebSocket(ws);

    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'User not authenticated' 
      }));
      return;
    }

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room)!.add(user.id);
    user.rooms.push(room);

    ws.send(JSON.stringify({ 
      type: 'room_joined', 
      room,
      message: `Joined room: ${room}`
    }));

    console.log(`User ${user.id} joined room: ${room}`);
  }

  private leaveRoom(ws: WebSocket, data: any) {
    const { room } = data;
    const user = this.findUserByWebSocket(ws);

    if (!user) return;

    if (this.rooms.has(room)) {
      this.rooms.get(room)!.delete(user.id);
    }

    user.rooms = user.rooms.filter(r => r !== room);

    ws.send(JSON.stringify({ 
      type: 'room_left', 
      room,
      message: `Left room: ${room}`
    }));

    console.log(`User ${user.id} left room: ${room}`);
  }

  private handleDisconnection(ws: WebSocket) {
    const user = this.findUserByWebSocket(ws);
    
    if (user) {
      // Remove from all rooms
      user.rooms.forEach(room => {
        if (this.rooms.has(room)) {
          this.rooms.get(room)!.delete(user.id);
        }
      });

      // Remove from connected users
      this.connectedUsers.delete(user.id);

      console.log(`User ${user.id} disconnected`);
    }
  }

  private findUserByWebSocket(ws: WebSocket): ConnectedUser | undefined {
    for (const user of this.connectedUsers.values()) {
      if (user.ws === ws) {
        return user;
      }
    }
    return undefined;
  }

  // Public methods for sending notifications

  public sendToRoom(room: string, event: OrderEvent) {
    if (!this.rooms.has(room)) {
      console.log(`Room ${room} doesn't exist`);
      return;
    }

    const message = JSON.stringify(event);
    const userIds = this.rooms.get(room)!;

    userIds.forEach(userId => {
      const user = this.connectedUsers.get(userId);
      if (user && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(message);
      }
    });

    console.log(`Sent ${event.type} to room ${room}:`, event.orderId);
  }

  public sendToUser(userId: string, event: OrderEvent) {
    const user = this.connectedUsers.get(userId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(event));
      console.log(`Sent ${event.type} to user ${userId}:`, event.orderId);
    } else {
      console.log(`User ${userId} not connected or WebSocket not open`);
    }
  }

  public broadcastToRole(role: string, event: OrderEvent) {
    this.sendToRoom(role, event);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getRoomUsersCount(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getUserRole(userId: string): string | undefined {
    return this.connectedUsers.get(userId)?.role;
  }

  // Get all connected users for admin monitoring
  public getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map(user => ({
      id: user.id,
      role: user.role,
      rooms: user.rooms
    }));
  }
}

export default WebSocketManager; 