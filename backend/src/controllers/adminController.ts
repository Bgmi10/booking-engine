import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";

dotenv.config();

const login = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

    try {
        const existingAdmin = await prisma.user.findUnique({
          where: {
            email,
          },
        });
    
      if (!existingAdmin) {
        responseHandler(res, 400, "User not found");
        return;
      }
    
      const isPasswordValid = await comparePassword(password, existingAdmin.password);
    
      if (!isPasswordValid) {
        responseHandler(res, 400, "Invalid password");
        return;
      }
    
      const token = generateToken({ id: existingAdmin.id, name: existingAdmin.name, email: existingAdmin.email });
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
      responseHandler(res, 200, "Login successful");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }  
  
}

const createRoom = async (req: express.Request, res: express.Response) => {
  const { name, price, description, images, capacity } = req.body;
  try {
    const room = await prisma.roomCategory.create({
      data: { name, price, description, capacity, images: { create: (images || []).map((image: string) => ({ url: image })) }},
    });
    responseHandler(res, 200, "Room created successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoom = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, price, description, capacity } = req.body;

  try {
    // Dynamically build the update payload
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity;
    

    const room = await prisma.roomCategory.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
      },
    });

    responseHandler(res, 200, "Room updated successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const deleteRoom = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    await prisma.room.delete({ where: { id } });
    responseHandler(res, 200, "Room deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoomImage = async (req: express.Request, res: express.Response) => {
  const { roomId, imageId } = req.params;
  const { url } = req.body;

  try {
    const image = await prisma.categoryImage.update({
      where: { id: imageId },
      data: { url },
    });

    responseHandler(res, 200, "Image updated successfully", image);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const deleteRoomImage = async (req: express.Request, res: express.Response) => {
  const { roomId, imageId } = req.params;
  try {
    await prisma.categoryImage.delete({ where: { id: imageId } });
    responseHandler(res, 200, "Image deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};

const getAllBookings = async (req: express.Request, res: express.Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        room: true,
      },
    });
    responseHandler(res, 200, "All bookings", bookings);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const getBookingById = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Booking ID is required");
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
    responseHandler(res, 200, "Booking", booking);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const addRoomsToCategory = async (req: express.Request, res: express.Response) => {
  const { id: categoryId } = req.params;
  const { roomNumbers } = req.body;

  if (!roomNumbers) {
    responseHandler(res, 400, "Room numbers are required");
    return;
  }
  
  try {
    const rooms = await Promise.all(
      roomNumbers.map((roomNumber: string) => 
        prisma.room.create({
          data: {
            roomNumber,
            categoryId,
            isActive: true
          }
        })
      )
    );
    
    responseHandler(res, 200, "Rooms added successfully", rooms);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const getAllRoomCategories = async (req: express.Request, res: express.Response) => {
  try {
    const categories = await prisma.roomCategory.findMany({
      include: {
        images: true,
        rooms: true,
        _count: {
          select: { rooms: true }
        }
      }
    });
    
    responseHandler(res, 200, "All room categories", categories);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const updateRoomStatus = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!isActive) {
    responseHandler(res, 400, "Room status is required");
    return;
  }
  
  try {
    const room = await prisma.room.update({
      where: { id },
      data: { isActive }
    });
    
    responseHandler(res, 200, "Room status updated", room);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const getRoomCategoryById = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Room category ID is required");
    return;
  }

  try {
    const roomCategory = await prisma.roomCategory.findUnique({ where: { id }, include: { rooms: true, images: true } });
    responseHandler(res, 200, "Room category", roomCategory);
  } catch (e) {
    handleError(res, e as Error);
  }
} 

const deleteRoomCategory = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    await prisma.roomCategory.delete({ where: { id } });
    responseHandler(res, 200, "Room category deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};

export { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, addRoomsToCategory, getAllRoomCategories, updateRoomStatus, deleteRoomCategory, getRoomCategoryById };
