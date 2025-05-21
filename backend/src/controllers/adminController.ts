import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";
import { comparePassword, hashPassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import { sendOtp } from "../services/sendotp";
import { s3 } from "../config/s3";
import { deleteImagefromS3 } from "../services/s3";

dotenv.config();

const getAllusers = async (req: express.Request, res: express.Response) => {
  //@ts-ignore
  const { id } = req.user;
  try {
    const users = await prisma.user.findMany({  where: { id: { not: id } }, select: { id: true, name: true, email: true, role: true, createdAt: true, phone: true } });
    responseHandler(res, 200, "All users", users);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateAdminProfile = async (req: express.Request, res: express.Response) => {
  const { name, email } = req.body;
  //@ts-ignore
  const { id } = req.user;

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email },
    });  

    responseHandler(res, 200, "Profile updated successfully", updatedUser);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateAdminPassword = async (req: express.Request, res: express.Response) => {
  const { newPassword } = req.body;
  //@ts-ignore
  const { id } = req.user;

  try {
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
    responseHandler(res, 200, "Password updated successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const createUser = async (req: express.Request, res: express.Response) => {
  const { name, email, password, role } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    responseHandler(res, 400, "User already exists");
    return;
  }

  try {
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword, role } });
    responseHandler(res, 200, "User created successfully", user);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const deleteUser = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "User ID is required");
    return;
  }

  try {
    await prisma.user.delete({ where: { id } });
    responseHandler(res, 200, "User deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateUserRole = async (req: express.Request, res: express.Response) => {
  const { role } = req.body;
  const { id } = req.params;

  if (!id || !role) {
    responseHandler(res, 400, "All fields are required");
    return;
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: { role } });
    responseHandler(res, 200, "User role updated", user);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const getAdminProfile = async (req: express.Request, res: express.Response) => { 
  try { 
    const admin = await prisma.user.findUnique({ where: { 
      //@ts-ignore
      id: req.user.id }, select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, phone: true } });
    responseHandler(res, 200, "Admin profile", admin);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const forgetPassword = async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  if (!email) {
    responseHandler(res, 400, "Email is required");
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    responseHandler(res, 400, "User not found");
    return;
  }

  if (user.role !== "ADMIN") {
    responseHandler(res, 400, "User is not an admin");
    return;
  }
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    await prisma.otp.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });
    await sendOtp(email, "forgot-password", otp);
    responseHandler(res, 200, "OTP sent to email");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const resetPassword = async (req: express.Request, res: express.Response) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    responseHandler(res, 400, "All fields are required");
    return;
  }
   
  const otpData = await prisma.otp.findUnique({ where: { email, otp } });

  if (!otpData) {
    responseHandler(res, 400, "Invalid OTP");
    return;
  }
  
  if (otpData.expiresAt < new Date()) {
    responseHandler(res, 400, "OTP expired");
    return;
  }
  try {
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    responseHandler(res, 200, "Password reset successful");
  } catch (e) {
    handleError(res, e as Error);
  }
}

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

const logout = async (req: express.Request, res: express.Response) => {
  res.clearCookie("token");
  responseHandler(res, 200, "Logout successful");
}   

const createRoom = async (req: express.Request, res: express.Response) => {
  const { name, price, description, images, capacity } = req.body;
  try {
    const room = await prisma.room.create({
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
    

    const room = await prisma.room.update({
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
  const { images } = req.body;

  try {
    await prisma.room.delete({ where: { id } });
    responseHandler(res, 200, "Room deleted successfully");
    await Promise.all(images.map((image: string) => deleteImagefromS3(image)));
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoomImage = async (req: express.Request, res: express.Response) => {
  const { roomId, imageId } = req.params;
  const { url } = req.body;

  try {
    const image = await prisma.roomImage.update({
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
    await prisma.roomImage.delete({ where: { id: imageId } });
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
        payment: true,
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

const uploadUrl = async (req: express.Request, res: express.Response) => {
  const { url } = req.body;

  try {
    const bucketName = process.env.S3_BUCKET_NAME!;
    const uploadKey = url;

    const signedUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: uploadKey,
      Expires: 300,
      ContentType: req.body.fileType,
    });

    // Construct the final file URL
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${uploadKey}`;

    responseHandler(res, 200, "Upload URL", {
      uploadUrl: signedUrl,
      fileUrl: fileUrl,
    });
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
};

const deleteImage = async (req: express.Request, res: express.Response) => {
  const { url } = req.body;
  try {
    await deleteImagefromS3(url);
    responseHandler(res, 200, "Image deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const createRoomImage = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { images } = req.body;

  if (!id) {
    return responseHandler(res, 400, "roomId is required in the URL");
  }

  if (!Array.isArray(images) || images.length === 0) {
    return responseHandler(res, 400, "Images array is required in the body");
  }

  try {
    const room = await prisma.room.update({
      where: { id },
      data: {
        images: {
          create: images.map((url: string) => ({
            url,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    responseHandler(res, 200, "Images added successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const createBooking = async (req: express.Request, res: express.Response) => {
  const { roomId, checkIn, checkOut, guestEmail, guestName, guestNationality, guestPhone } = req.body;

  try {
    const response = await prisma.booking.create({
      data: {
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestEmail,
        guestName,
        guestNationality,
        guestPhone,
      }
    });

    responseHandler(res, 200, "booking created successfully", response)

  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
  
} 

const updateBooking = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const {
    roomId,
    checkIn,
    checkOut,
    guestEmail,
    guestName,
    guestNationality,
    guestPhone,
    status
  } = req.body;

  try {
    // Build dynamic update object by filtering out undefined values
    const updateData: any = {
      ...(roomId && { roomId }),
      ...(checkIn && { checkIn: new Date(checkIn) }),
      ...(checkOut && { checkOut: new Date(checkOut) }),
      ...(guestEmail && { guestEmail }),
      ...(guestName && { guestName }),
      ...(guestNationality && { guestNationality }),
      ...(guestPhone && { guestPhone }),
      ...(status && { status })
    };

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData
    });

    responseHandler(res, 200, "Booking updated successfully", booking);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const deleteBooking = async (req: express.Request, res: express.Response) => { 
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Booking ID is required");
    return;
  }

  try {
    await prisma.booking.delete({ where: { id } });
    responseHandler(res, 200, "Booking deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};


export { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, createBooking, updateBooking, deleteBooking };


