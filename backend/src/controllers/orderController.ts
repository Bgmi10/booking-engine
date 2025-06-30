import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";

export const getAllPendingCustomersOrders = async (req: express.Request, res: express.Response) => {
  try {
    const pendingOrders = await prisma.order.findMany({
       where: {
         status: "PENDING",
         assignedToKitchen: null
       },
       include: {
         location: true,
         customer: true,
         temporaryCustomer: true,
         charge: true
       }
    });
    responseHandler(res, 200, "success", pendingOrders);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}  
export const getAllAssignedCustomersOrders = async (req: express.Request, res: express.Response) => {
  try {
    const pendingOrders = await prisma.order.findMany({
       where: {
         status: "READY",
         assignedToWaiter: null
       },
       include: {
         location: true,
         customer: true,
         temporaryCustomer: true,
         charge: true
       }
    });
    responseHandler(res, 200, "success", pendingOrders);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}  

export const getKitchenOrdersByUserId = async (req: express.Request, res: express.Response) => {
  //@ts-ignore
  const  { id } = req.user;

  try {
    const orders = await prisma.order.findMany({
      where: { 
        kitchenStaff: { id }, 
      },
      include: {
        customer: {
          select: {
            guestFirstName: true,
            guestLastName: true,
            guestMiddleName: true,
          }
        },
        temporaryCustomer: true,
        charge: {
          select: { id: true }
        }
      }
    });
    responseHandler(res, 200, "success", orders);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}


export const getWaiterOrdersByUserId = async (req: express.Request, res: express.Response) => {
  //@ts-ignore
  const  { id } = req.user;

  try {
    const orders = await prisma.order.findMany({
      where: { 
        waiter: { id }, 
      },
      include: {
        customer: {
          select: {
            guestFirstName: true,
            guestLastName: true,
            guestMiddleName: true,
          }
        },
        temporaryCustomer: true,
        charge: {
          select: { id: true }
        }
      }
    });
    responseHandler(res, 200, "success", orders);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const getOrderById = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Missing id in params");
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        items: true,
        status: true,
        deliveredAt: true,
        readyAt: true,
        total: true,
        createdAt: true,
        locationName: true
      }
    });

    responseHandler(res, 200, "success", order);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const getPendingHybridOrdersForWaiter = async (req: express.Request, res: express.Response) => {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        assignedToWaiter: null
      },
      include: {
        location: true,
        customer: true,
        temporaryCustomer: true,
        charge: true,
      },
    });

    // We filter in code because Prisma JSON filtering can be complex.
    // This is safe as the number of PENDING orders should be manageable.
    const hybridOrders = pendingOrders.filter(order => {
      const items = order.items as any[];
      const hasKitchen = items.some(item => !item.role || item.role === 'KITCHEN');
      const hasWaiter = items.some(item => item.role === 'WAITER');
      return hasKitchen && hasWaiter;
    });

    responseHandler(res, 200, "success", hybridOrders);
  } catch (e) {
    console.error(e);
    handleError(res, e as Error);
  }
};

export const createAdminOrder = async (req: express.Request, res: express.Response) => {
    const { items, paymentMethod, customerId, temporaryCustomerSurname, locationName } = req.body;
    //@ts-ignore
    const { id: adminId } = req.user;


    if (!items || !paymentMethod || !locationName) {
      responseHandler(res, 400, "Missing required fields: items, paymentMethod, locationName are required.");
      return;
    }
    if (!customerId && !temporaryCustomerSurname) {
      responseHandler(res, 400, "Either customerId or temporaryCustomerSurname must be provided.");
      return;
    }
    if (customerId && temporaryCustomerSurname) {
      responseHandler(res, 400, "Provide either customerId or temporaryCustomerSurname, not both.");
      return;
    }
    if (paymentMethod === 'ASSIGN_TO_ROOM' && !customerId) {
      responseHandler(res, 400, "ASSIGN_TO_ROOM payment method is only for existing customers.");
      return;
    }

    try {
        let tempCustomerId: string | undefined;

        if (temporaryCustomerSurname) {
            const tempCustomer = await prisma.temporaryCustomer.create({
                data: {
                    surname: temporaryCustomerSurname,
                },
            });
            tempCustomerId = tempCustomer.id;
        }
        
        const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        const newOrder = await prisma.order.create({
            data: {
                items,
                total,
                status: 'PENDING',
                locationName,
                customerId: customerId,
                temporaryCustomerId: tempCustomerId
            }
        });
        
        if (paymentMethod === 'ASSIGN_TO_ROOM' && customerId) {
            await prisma.charge.create({
                data: {
                    amount: total,
                    description: `Room charge for order #${newOrder.id.substring(0, 8)}`,
                    status: 'PENDING',
                    customerId: customerId,
                    orderId: newOrder.id,
                    createdBy: adminId
                }
            });
        }
        
        const orderEventService = (global as any).orderEventService;
        if (orderEventService) {
            await orderEventService.orderCreated(newOrder.id);
        } else {
            console.error("orderEventService not found, could not send real-time order notification.");
        }

        responseHandler(res, 201, "Order created successfully", newOrder);

    } catch (error) {
        console.error("Error creating admin order:", error);
        handleError(res, error as Error);
    }
};