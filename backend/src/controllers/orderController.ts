import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";

export const getAllPendingCustomersOrders = async (req: express.Request, res: express.Response) => {
  try {
    const pendingOrders = await prisma.order.findMany({
       where: { status: "PENDING" },
       include: {
         location: true,
         customer: true
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
       where: { status: "READY" },
       include: {
         location: true,
         customer: true
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
        customer: true,
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
        customer: true,
      }
    });
    responseHandler(res, 200, "success", orders);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}