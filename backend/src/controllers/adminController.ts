import express from "express";
import prisma from "../prisma";
import { calculateNights, handleError, responseHandler, generateMergedBookingId } from "../utils/helper";
import { comparePassword, hashPassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import { sendOtp } from "../services/sendotp";
import { s3 } from "../config/s3";
import { deleteImagefromS3 } from "../services/s3";
import { Prisma } from "@prisma/client";
import { PartialRefundService } from "../services/partialRefundService";
import { sendConsolidatedBookingConfirmation, sendPaymentLinkEmail, sendRefundConfirmationEmail } from "../services/emailTemplate";
import { stripe } from "../config/stripeConfig";
import { baseUrl } from "../utils/constants";
import { dahuaService } from '../services/dahuaService';
import { licensePlateCleanupService } from '../services/licensePlateCleanupService';
import { findOrCreatePrice } from "../config/stripeConfig";
import { generateOTP } from "../utils/helper";
import { EmailService } from "../services/emailService";

dotenv.config();

const devUrl = "https://localhost:5173";
const prodUrl = process.env.FRONTEND_PROD_URL;

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
      id: req.user.id }, select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, phone: true, basePrice: true } });
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
    const otp = generateOTP();
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

  const otpData = await prisma.otp.findFirst({ where: { email, otp } });

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
  
    const token = generateToken({ id: existingAdmin.id, name: existingAdmin.name, email: existingAdmin.email, role: existingAdmin.role });
    res.cookie("token", token, { httpOnly: false, secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000, domain: process.env.NODE_ENV === "production" ? "latorre.farm" : "localhost" });
    responseHandler(res, 200, "Login successful");
  } catch (e) {
      console.log(e);
      handleError(res, e as Error);
  }  
  
}

const logout = async (_req: express.Request, res: express.Response) => {
  res.clearCookie("token", { domain: process.env.NODE_ENV === "local" ? "localhost" : "latorre.farm" });
  responseHandler(res, 200, "Logout successful");
}   

const createRoom = async (req: express.Request, res: express.Response) => {
  const { name, price, description, images, capacity, ratePolicyId, amenities, allowsExtraBed, maxCapacityWithExtraBed, extraBedPrice } = req.body;
  try {
    const room = await prisma.room.create({
      data: { 
        name, 
        price, 
        description, 
        capacity, 
        allowsExtraBed: allowsExtraBed || false,
        maxCapacityWithExtraBed: allowsExtraBed ? maxCapacityWithExtraBed : null,
        extraBedPrice: allowsExtraBed ? extraBedPrice : null,
        images: { create: (images || []).map((image: string) => ({ url: image })) }, 
        RoomRate: { create: ratePolicyId.map((id: string) => ({ ratePolicyId: id })) }, 
        amenities 
      },
      include: {
        RoomRate: true,
        images: true,
      },
    });
    responseHandler(res, 200, "Room created successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoom = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, price, description, capacity, ratePolicyId, amenities, allowsExtraBed, maxCapacityWithExtraBed, extraBedPrice } = req.body;

  try {
    // Build base update data
    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(description !== undefined && { description }),
      ...(capacity !== undefined && { capacity }),
      ...(amenities !== undefined && { amenities }),
      ...(allowsExtraBed !== undefined && { allowsExtraBed }),
      ...(allowsExtraBed !== undefined && { 
        maxCapacityWithExtraBed: allowsExtraBed ? maxCapacityWithExtraBed : null 
      }),
      ...(allowsExtraBed !== undefined && { 
        extraBedPrice: allowsExtraBed ? extraBedPrice : null 
      }),
    };

    if (ratePolicyId !== undefined) {
      // Clean input - remove empty strings and duplicates
      const newPolicyIds = [...new Set(
        ratePolicyId.filter((id: string) => id && id.trim() !== '')
      )];

      // Get current policies for this room
      const currentPolicies = await prisma.roomRate.findMany({
        where: { roomId: id },
        select: { ratePolicyId: true }
      });
      const currentPolicyIds = currentPolicies.map((p: any) => p.ratePolicyId);

      // Determine which policies to add and which to remove
      const policiesToAdd = newPolicyIds.filter((id: any) => !currentPolicyIds.includes(id));
      const policiesToRemove = currentPolicyIds.filter((id: string) => !newPolicyIds.includes(id));

      // Prepare the update operation
      //@ts-ignore
      updateData.RoomRate = {
        ...(policiesToRemove.length > 0 && {
          deleteMany: {
            roomId: id,
            ratePolicyId: { in: policiesToRemove }
          }
        }),
        ...(policiesToAdd.length > 0 && {
          create: policiesToAdd.map(policyId => ({ ratePolicyId: policyId }))
        })
      }; 
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        RoomRate: {
          include: {
            ratePolicy: true
          }
        }
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
        paymentIntent: {
          include: {
            payments: true
          }
        },
        enhancementBookings: {
          include: {
            enhancement: true
          }
        }
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

const createEnhancement = async (req: express.Request, res: express.Response) => {
  const { name, price, description, image, isActive, availableDays, pricingType, seasonal, seasonEnd, seasonStart } = req.body;

  let seasonEndDate = seasonEnd;
  let seasonStartDate = seasonStart;
  if (seasonEnd === "" && seasonStart === "") {
    seasonEndDate = null;
    seasonStartDate = null;
  }
  
  try {
    const enhancement = await prisma.enhancement.create({ data: { price, description, image, isActive, title: name, availableDays, pricingType, seasonal, seasonEnd: new Date(seasonEndDate), seasonStart: new Date(seasonStartDate) } });
    responseHandler(res, 200, "Enhancement created successfully", enhancement);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateEnhancement = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, price, description, image, isActive, availableDays, pricingType, seasonal, seasonEnd, seasonStart } = req.body;

  const updateData: any = {};

  let seasonEndDate = seasonEnd;
  let seasonStartDate = seasonStart;
  if (seasonEnd === "" && seasonStart === "") {
    seasonEndDate = null;
    seasonStartDate = null;
  }

  if (name !== undefined) updateData.title = name;
  if (price !== undefined) updateData.price = price;
  if (description !== undefined) updateData.description = description;
  if (image !== undefined) updateData.image = image;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (availableDays !== undefined) updateData.availableDays = availableDays;
  if (pricingType !== undefined) updateData.pricingType = pricingType;
  if (seasonal !== undefined) updateData.seasonal = seasonal;
  if (seasonEnd !== undefined) updateData.seasonEnd = new Date(seasonEndDate);
  if (seasonStart !== undefined) updateData.seasonStart = new Date(seasonStartDate);

  try {
    const enhancement = await prisma.enhancement.update({ where: { id }, data: updateData });
    responseHandler(res, 200, "Enhancement updated successfully", enhancement);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const deleteEnhancement = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  try {
    await prisma.enhancement.delete({ where: { id } });
    responseHandler(res, 200, "Enhancement deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const getAllEnhancements = async (req: express.Request, res: express.Response) => {
  try {
    const enhancements = await prisma.enhancement.findMany();
    responseHandler(res, 200, "All enhancements", enhancements);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const createRatePolicy = async (req: express.Request, res: express.Response) => {
  const { 
    name, 
    description, 
    isActive, 
    refundable, 
    prepayPercentage, 
    fullPaymentDays, 
    changeAllowedDays, 
    rebookValidityDays, 
    adjustmentPercentage,
    paymentStructure,
    cancellationPolicy
  } = req.body;

  try {
    // Build the data object with all fields
    const createData: any = {
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      paymentStructure: paymentStructure || "FULL_PAYMENT",
      cancellationPolicy: cancellationPolicy || "FLEXIBLE"
    };

    // Add optional fields if provided
    if (refundable !== undefined) createData.refundable = refundable;
    if (prepayPercentage !== undefined) createData.prepayPercentage = prepayPercentage;
    if (fullPaymentDays !== undefined) createData.fullPaymentDays = fullPaymentDays;
    if (changeAllowedDays !== undefined) createData.changeAllowedDays = changeAllowedDays;
    if (rebookValidityDays !== undefined) createData.rebookValidityDays = rebookValidityDays;
    if (adjustmentPercentage !== undefined) createData.adjustmentPercentage = adjustmentPercentage;

    const ratePolicy = await prisma.ratePolicy.create({ data: createData });
    responseHandler(res, 200, "Rate policy created successfully", ratePolicy);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRatePolicy = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { 
    name, 
    description, 
    isActive, 
    refundable, 
    prepayPercentage, 
    fullPaymentDays, 
    changeAllowedDays, 
    rebookValidityDays, 
    adjustmentPercentage,
    paymentStructure,
    cancellationPolicy
  } = req.body;

  const updateData: any = {};

  // Core fields
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (refundable !== undefined) updateData.refundable = refundable;
  if (prepayPercentage !== undefined) updateData.prepayPercentage = prepayPercentage;
  if (fullPaymentDays !== undefined) updateData.fullPaymentDays = fullPaymentDays;
  if (changeAllowedDays !== undefined) updateData.changeAllowedDays = changeAllowedDays;
  if (rebookValidityDays !== undefined) updateData.rebookValidityDays = rebookValidityDays;
  if (adjustmentPercentage !== undefined) updateData.adjustmentPercentage = adjustmentPercentage;
  if (paymentStructure !== undefined) updateData.paymentStructure = paymentStructure;
  if (cancellationPolicy !== undefined) updateData.cancellationPolicy = cancellationPolicy;

  try {
    const ratePolicy = await prisma.ratePolicy.update({ where: { id }, data: updateData });
    responseHandler(res, 200, "Rate policy updated successfully", ratePolicy);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const deleteRatePolicy = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  try {
    await prisma.ratePolicy.delete({ where: { id } });  
    responseHandler(res, 200, "Rate policy deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
}

const getAllRatePolicies = async (req: express.Request, res: express.Response) => {
  try {
    const ratePolicies = await prisma.ratePolicy.findMany({});
    responseHandler(res, 200, "All rate policies", ratePolicies);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const bulkPoliciesUpdate = async (req: express.Request, res: express.Response) => {
  const { policyId } = req.body;
  
  try {
    // Validate input
    if (!Array.isArray(policyId)) {
      responseHandler(res, 400, "policyId must be an array");
      return;
    }

    // Filter out empty/invalid IDs
    const validPolicyIds = policyId.filter(id => id && id.trim() !== '');
    
    if (validPolicyIds.length === 0) {
      responseHandler(res, 400, "No valid policy IDs provided");
      return;
    }

    // Get all room IDs in a single query
    const rooms = await prisma.room.findMany({
      select: { id: true }
    });

    // Prepare all operations in a transaction
    const operations = [];
    
    // For each valid policy ID
    for (const policyId of validPolicyIds) {
      // For each room
      for (const room of rooms) {
        operations.push(
          prisma.roomRate.upsert({
            where: {
              roomId_ratePolicyId: {
                roomId: room.id,
                ratePolicyId: policyId
              }
            },
            create: {
              roomId: room.id,
              ratePolicyId: policyId
            },
            update: {} // No changes needed if exists
          })
        );
      }
    }

    // Execute all operations in a single transaction
    await prisma.$transaction(operations);

    responseHandler(res, 200, "Policies updated successfully", {
      roomsUpdated: rooms.length,
      policiesApplied: validPolicyIds.length
    });
    
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateBasePrice = async (req: express.Request, res: express.Response) => {
  const { basePrice } = req.body;

  if (!basePrice) {
    responseHandler(res, 400, "Base price is required");
    return;
  }
  //@ts-ignore
  const { id } = req.user;
  
  try {
    const updatedUser = await prisma.user.update({ where: { id }, data: { basePrice } });
    responseHandler(res, 200, "Base price updated successfully", updatedUser);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoomPrice = async (req: express.Request, res: express.Response) => {
  const { roomId, price } = req.body;

  try {
    const updatedRoom = await prisma.room.update({ where: { id: roomId }, data: { price } });
    responseHandler(res, 200, "Room price updated successfully", updatedRoom);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateGeneralSettings = async (req: express.Request, res: express.Response) => {
  const { minStayDays, id, taxPercentage, chargePaymentConfig, dahuaApiUrl, dahuaGateId, dahuaIsEnabled, dahuaLicensePlateExpiryHours, dahuaPassword, dahuaUsername, licensePlateExpiryDays, licensePlateDailyTriggerTime, dailyBookingStartTime } = req.body;

  let updateData: { minStayDays?: number; taxPercentage?: number, chargePaymentConfig?: string, dahuaApiUrl?: string, dahuaGateId?: string, dahuaIsEnabled?: boolean, dahuaLicensePlateExpiryHours?: number, dahuaPassword?: string, dahuaUsername?: string, licensePlateExpiryDays?: number, licensePlateDailyTriggerTime?: string, dailyBookingStartTime?: string } = {};

  if (typeof minStayDays !== 'undefined') {
    updateData.minStayDays = minStayDays;
  }

  if (typeof chargePaymentConfig !== 'undefined') {
    updateData.chargePaymentConfig = chargePaymentConfig;
  }

  if (typeof taxPercentage !== 'undefined') {
    updateData.taxPercentage = taxPercentage;
  }
  
  if (typeof dahuaApiUrl !== 'undefined') {
    updateData.dahuaApiUrl = dahuaApiUrl;
  }
  
  if (typeof dahuaGateId !== 'undefined') {
    updateData.dahuaGateId = dahuaGateId;
  }

  if (typeof dahuaLicensePlateExpiryHours !== 'undefined') {
    updateData.dahuaLicensePlateExpiryHours = dahuaLicensePlateExpiryHours;
  }

  if (typeof dahuaIsEnabled !== 'undefined') {
    updateData.dahuaIsEnabled = dahuaIsEnabled;
  }
  
  if (typeof dahuaPassword !== 'undefined') {
    updateData.dahuaPassword = dahuaPassword;
  }
  if (typeof dahuaUsername !== 'undefined') {
    updateData.dahuaUsername = dahuaUsername;
  }
  
  if (typeof licensePlateExpiryDays !== 'undefined') {
    updateData.licensePlateExpiryDays = licensePlateExpiryDays;
  }
  
  if (typeof licensePlateDailyTriggerTime !== 'undefined') {
    updateData.licensePlateDailyTriggerTime = licensePlateDailyTriggerTime;
  }
  
  if (typeof dailyBookingStartTime !== 'undefined') {
    updateData.dailyBookingStartTime = dailyBookingStartTime;
  }
  
  try {
    const response = await prisma.generalSettings.update({
      where: { id },
      data: updateData
    });

    responseHandler(res, 200, "Updated general settings successfully", response);
  } catch (e) {
    console.error("Error updating general settings:", e);
    handleError(res, e as Error);
  }
};

const getGeneralSettings = async (req: express.Request, res: express.Response) => {
   
  try {
    const settingsData = await prisma.generalSettings.findMany({});
    responseHandler(res, 200, "success", settingsData);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

const createAdminPaymentLink = async (req: express.Request, res: express.Response) => {
  const { 
    bookingItems, 
    customerDetails, 
    taxAmount, 
    totalAmount, 
    expiresInHours = 72,
    adminNotes,
    customerRequest, // <-- add this
    bankDetailsId,
    sendConfirmationEmail
  } = req.body;
  //@ts-ignore
  const adminUserId = req.user?.id;

  try {
    // Check room availability (same as before)
    for (const booking of bookingItems) {
      const { checkIn, checkOut, selectedRoom: roomId } = booking;
      const overlappingBookings = await prisma.booking.findFirst({
        where: {
          roomId,
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
              status: "CONFIRMED"
            }
          ]
        }
      });
      if (overlappingBookings) {
        responseHandler(res, 400, `${booking.roomDetails.name} is not available for these dates`);
        return;
      }
      const overlappingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          expiresAt: { gt: new Date() },
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) }
            }
          ]
        }
      });
      if (overlappingHold) {
        responseHandler(res, 400, `${booking.roomDetails.name} is temporarily held`);
        return;
      }
    }
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    // Create PaymentIntent record
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        amount: totalAmount,
        currency: "eur",
        status: "CREATED",
        bookingData: JSON.stringify(bookingItems),
        customerData: JSON.stringify({
          ...customerDetails,
          receiveMarketing: customerDetails.receiveMarketing || false,
        }),
        taxAmount,
        totalAmount,
        createdByAdmin: true,
        adminUserId,
        adminNotes,
        expiresAt,
      }
    });
    await prisma.temporaryHold.createMany({
      data: bookingItems.map((booking: any) => ({
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        roomId: booking.selectedRoom,
        expiresAt,
        paymentIntentId: paymentIntent.id,
      }))
    });
    // Build line items
    const line_items: { price: string; quantity: number; }[] = [];
    await Promise.all(bookingItems.map(async (booking: any, index: number) => {
      const numberOfNights = calculateNights(booking.checkIn, booking.checkOut);
      const roomRatePerNight = booking.selectedRateOption?.price || booking.roomDetails.price;
      const totalRoomPrice = roomRatePerNight * numberOfNights;
      const roomPriceId = await findOrCreatePrice({
        name: `${booking.roomDetails.name} - ${numberOfNights} night${numberOfNights > 1 ? 's' : ''}`,
        description: `€${roomRatePerNight} per night × ${numberOfNights} night${numberOfNights > 1 ? 's' : ''} | Rate: ${booking.selectedRateOption?.name || 'Standard Rate'} | Taxes included`,
        unitAmount: Math.round(totalRoomPrice * 100),
        currency: "eur",
        images: booking.roomDetails.images.length > 0 ? booking.roomDetails.images.map((image: any) => encodeURI(image.url.trim())) : ["https://www.shutterstock.com/search/no-picture-available"],
        dates: {
          checkIn: new Date(booking.checkIn).toISOString().split('T')[0],
          checkOut: new Date(booking.checkOut).toISOString().split('T')[0]
        },
        rateOption: booking.selectedRateOption,
        bookingIndex: index
      });
      line_items.push({
        price: roomPriceId,
        quantity: booking.rooms,
      });
      if (booking.selectedEnhancements) {
        await Promise.all(booking.selectedEnhancements.map(async (enhancement: any, enhancementIndex: number) => {
          let enhancementQuantity = 1;
          if (enhancement.pricingType === "PER_GUEST") {
            enhancementQuantity = booking.adults * booking.rooms;
          } else if (enhancement.pricingType === "PER_ROOM") {
            enhancementQuantity = booking.rooms;
          } else if (enhancement.pricingType === "PER_NIGHT") {
            enhancementQuantity = numberOfNights * booking.rooms;
          } else if (enhancement.pricingType === "PER_GUEST_PER_NIGHT") {
            enhancementQuantity = booking.adults * booking.rooms * numberOfNights;
          }
          const enhancementPriceId = await findOrCreatePrice({
            name: enhancement.title,
            description: `€${enhancement.price} ${enhancement.pricingType === "PER_GUEST" ? "per guest" : enhancement.pricingType === "PER_ROOM" ? "per room" : enhancement.pricingType === "PER_NIGHT" ? "per night" : enhancement.pricingType === "PER_GUEST_PER_NIGHT" ? "per guest per night" : "per booking"} | ${enhancement.description} | Taxes included`,
            unitAmount: Math.round(enhancement.price * 100),
            currency: "eur",
            images: enhancement.image ? [enhancement.image] : undefined,
            bookingIndex: index * 1000 + enhancementIndex
          });
          line_items.push({
            price: enhancementPriceId,
            quantity: enhancementQuantity,
          });
        }));
      }
    }));
    const paymentLink = await stripe.paymentLinks.create({
      line_items,
      metadata: {
        customerEmail: customerDetails.email,
        type: "admin_payment_link",
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paymentIntentId: paymentIntent.id,
        customerRequest: customerRequest || customerDetails.specialRequests || '',
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NODE_ENV === "local" ? devUrl : prodUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`
        }
      },
      payment_intent_data: {
        metadata: {
          paymentIntentId: paymentIntent.id,
          customerEmail: customerDetails.email,
          type: "admin_payment_link",
          checkout_session_id: "{CHECKOUT_SESSION_ID}",
          customerRequest: customerRequest || customerDetails.specialRequests || '',
          sendConfirmationEmail: String(sendConfirmationEmail) || "true"
        }
      },
      allow_promotion_codes: false,
      restrictions: {
        completed_sessions: { limit: 1 }
      }
    });
    await prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        status: "PAYMENT_LINK_SENT",
        stripePaymentLinkId: paymentLink.id
      }
    });
    const route = `/payment-intent/${paymentIntent.id}/check-status`
    const paymentLinkUrl = process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL + route : process.env.FRONTEND_PROD_URL + route;
    // Fetch bank details by ID
    if (!bankDetailsId) {
      responseHandler(res, 400, "Bank details ID is required");
      return;
    }
    const bankDetails = await prisma.bankDetails.findUnique({ where: { id: bankDetailsId } });
    if (!bankDetails) {
      responseHandler(res, 400, "Bank details not found");
      return;
    }
    await sendPaymentLinkEmail({
      email: customerDetails.email,
      name: `${customerDetails.firstName} ${customerDetails.lastName}`,
      paymentLink: paymentLinkUrl,
      bookingDetails: bookingItems,
      totalAmount,
      expiresAt,
      bankName: bankDetails.bankName || '',
      accountName: bankDetails.accountName || '',
      accountNumber: bankDetails.accountNumber || '',
      iban: bankDetails.iban || '',
      swiftCode: bankDetails.swiftCode || '',
      routingNumber: bankDetails.routingNumber || ''
    });
    responseHandler(res, 200, "Payment link created and sent to customer", {
      paymentIntentId: paymentIntent.id,
      paymentLinkUrl: paymentLink.url,
      expiresAt,
      status: "PAYMENT_LINK_SENT"
    });
  } catch (e) {
    console.error("Admin payment link creation error:", e);
    handleError(res, e as Error);
  }
};

const collectCash = async (req: express.Request, res: express.Response) => {
  const { 
    bookingItems, 
    customerDetails, 
    taxAmount, 
    totalAmount, 
    customerRequest,
    expiresInHours = 24,
    adminNotes
  } = req.body;
   
  //@ts-ignore
  const adminUserId = req.user?.id;

  try {
    // Check room availability (same as createAdminPaymentLink)
    for (const booking of bookingItems) {
      const { checkIn, checkOut, selectedRoom: roomId } = booking;

      const overlappingBookings = await prisma.booking.findFirst({
        where: {
          roomId,
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
              status: "CONFIRMED"
            }
          ]
        }
      });

      if (overlappingBookings) {
        responseHandler(res, 400, `${booking.roomDetails.name} is not available for these dates`);
        return;
      }

      const overlappingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          expiresAt: { gt: new Date() },
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) }
            }
          ]
        }
      });

      if (overlappingHold) {
        responseHandler(res, 400, `${booking.roomDetails.name} is temporarily held`);
        return;
      }
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Create PaymentIntent record with CASH payment method
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        amount: totalAmount,
        currency: "eur",
        status: "PENDING",
        paymentMethod: "CASH",
        bookingData: JSON.stringify(bookingItems),
        customerData: JSON.stringify({
          ...customerDetails,
          receiveMarketing: customerDetails.receiveMarketing || false,
        }),
        taxAmount,
        totalAmount,
        createdByAdmin: true,
        adminUserId,
        adminNotes: adminNotes || customerRequest || "Cash payment - pending confirmation",
        expiresAt,
      }
    });

    // Create temporary holds
    await prisma.temporaryHold.createMany({
      data: bookingItems.map((booking: any) => ({
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        roomId: booking.selectedRoom,
        expiresAt,
        paymentIntentId: paymentIntent.id,
      }))
    });

    responseHandler(res, 200, "Cash payment intent created successfully", {
      paymentIntentId: paymentIntent.id,
      status: "PENDING",
      expiresAt: paymentIntent.expiresAt,
      message: "Payment intent created. Admin needs to confirm the booking after cash collection."
    });

  } catch (e) {
    console.error("Cash payment intent creation error:", e);
    handleError(res, e as Error);
  }
}

const createBankTransfer = async (req: express.Request, res: express.Response) => {
  const { 
    bookingItems, 
    customerDetails, 
    taxAmount, 
    totalAmount, 
    customerRequest,
    bankDetailsId,
    expiresInHours = 72,
    adminNotes
  } = req.body;
   
  //@ts-ignore
  const adminUserId = req.user?.id;

  try {
    // Get bank details
    const bankDetails = await prisma.bankDetails.findUnique({
      where: { id: bankDetailsId }
    });

    if (!bankDetails) {
      responseHandler(res, 400, "Bank details not found");
      return;
    }

    // Check room availability (same as createAdminPaymentLink)
    for (const booking of bookingItems) {
      const { checkIn, checkOut, selectedRoom: roomId } = booking;

      const overlappingBookings = await prisma.booking.findFirst({
        where: {
          roomId,
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) },
              status: "CONFIRMED"
            }
          ]
        }
      });

      if (overlappingBookings) {
        responseHandler(res, 400, `${booking.roomDetails.name} is not available for these dates`);
        return;
      }

      const overlappingHold = await prisma.temporaryHold.findFirst({
        where: {
          roomId,
          expiresAt: { gt: new Date() },
          OR: [
            {
              checkIn: { lte: new Date(checkOut) },
              checkOut: { gte: new Date(checkIn) }
            }
          ]
        }
      });

      if (overlappingHold) {
        responseHandler(res, 400, `${booking.roomDetails.name} is temporarily held`);
        return;
      }
    }

    // Create PaymentIntent record with BANK_TRANSFER payment method
    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        amount: totalAmount,
        currency: "eur",
        status: "PENDING",
        paymentMethod: "BANK_TRANSFER",
        bookingData: JSON.stringify(bookingItems),
        customerData: JSON.stringify({
          ...customerDetails,
          receiveMarketing: customerDetails.receiveMarketing || false,
        }),
        taxAmount,
        totalAmount,
        createdByAdmin: true,
        adminUserId,
        adminNotes: adminNotes || customerRequest || "Bank transfer - pending confirmation",
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000), // 72 hours
      }
    });

    // Create temporary holds
    await prisma.temporaryHold.createMany({
      data: bookingItems.map((booking: any) => ({
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        roomId: booking.selectedRoom,
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000), // 72 hours
        paymentIntentId: paymentIntent.id,
      }))
    });

    // Send bank transfer email using EmailService
    const templateData = {
      customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
      totalAmount: totalAmount.toFixed(2),
      expiresAt: paymentIntent.expiresAt?.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) || '72 hours from now',
      paymentIntentId: paymentIntent.id,
      bankName: bankDetails.bankName,
      accountName: bankDetails.accountName,
      accountNumber: bankDetails.accountNumber,
      iban: bankDetails.iban,
      swiftCode: bankDetails.swiftCode,
      routingNumber: bankDetails.routingNumber,
      bookingDetails: bookingItems.map((booking: any) => ({
        roomDetails: booking.roomDetails,
        checkIn: new Date(booking.checkIn).toLocaleDateString(),
        checkOut: new Date(booking.checkOut).toLocaleDateString(),
        adults: booking.adults,
        totalPrice: booking.totalPrice.toFixed(2)
      }))
    };

    await EmailService.sendEmail({
      to: { 
        email: customerDetails.email, 
        name: `${customerDetails.firstName} ${customerDetails.lastName}` 
      },
      templateType: 'BANK_TRANSFER_INSTRUCTIONS',
      templateData
    });

    responseHandler(res, 200, "Bank transfer payment intent created and email sent", {
      paymentIntentId: paymentIntent.id,
      status: "PENDING",
      expiresAt: paymentIntent.expiresAt,
      message: "Bank transfer instructions sent to customer. Admin needs to confirm the booking after payment verification."
    });

  } catch (e) {
    console.error("Bank transfer payment intent creation error:", e);
    handleError(res, e as Error);
  }
}

const processFutureRefund = async (req: express.Request, res: express.Response) => {
    const { paymentIntentId, sendEmailToCustomer = true } = req.body;
    
    if (!paymentIntentId) {
      responseHandler(res, 400, "Payment Intent ID is required");
      return;
    }

    try {
        // Find the payment intent and check if it's eligible for future refund
        const ourPaymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntentId },
            include: {
              bookings: {
                include: { room: true }
              },
              payments: true,
            }
        });

        if (!ourPaymentIntent) {
          responseHandler(res, 404, "Payment Intent not found");
          return;
        }

        // Check if it's in CANCELLED_NO_REFUND status
        if (ourPaymentIntent.refundStatus !== "CANCELLED_NO_REFUND") {
          responseHandler(res, 400, "Payment intent is not eligible for future refund");
          return;
        }

        // Check if it's a Stripe payment with a valid PaymentIntent
        if (!ourPaymentIntent.stripePaymentIntentId) {
          responseHandler(res, 400, "No Stripe PaymentIntent found for this booking");
          return;
        }

        // Verify the Stripe PaymentIntent is still valid
        const stripePaymentIntent = await stripe.paymentIntents.retrieve(ourPaymentIntent.stripePaymentIntentId);
        
        if (stripePaymentIntent.status !== "succeeded") {
          responseHandler(res, 400, "Original payment was not successful, cannot refund");
          return;
        }

        // Check if already refunded
        const existingRefund = await stripe.refunds.list({
          payment_intent: ourPaymentIntent.stripePaymentIntentId,
          limit: 1
        });

        if (existingRefund.data.length > 0) {
          responseHandler(res, 400, "Payment has already been refunded");
          return;
        }

        // Update status to pending before processing
        await prisma.paymentIntent.update({
          where: { id: paymentIntentId },
          data: { 
            refundStatus: "REFUND_PENDING",
            adminNotes: "Future refund initiated by admin"
          }
        });

        // Create the refund
        const refundAmount = ourPaymentIntent.totalAmount;
        const refund = await stripe.refunds.create({
            payment_intent: ourPaymentIntent.stripePaymentIntentId,
            amount: Math.round(refundAmount * 100), // Convert to cents
            reason: "requested_by_customer",
            metadata: {
              paymentIntentId: paymentIntentId,
              refundReason: "Future refund processed by admin",
              paymentStructure: ourPaymentIntent.paymentStructure || 'FULL_PAYMENT',
              isFullRefund: 'true',
              sendEmailToCustomer: sendEmailToCustomer.toString(),
              isFutureRefund: 'true'
            }
        });

        responseHandler(res, 200, "Future refund initiated successfully", {
            type: "future_refund",
            refundId: refund.id,
            paymentIntentId: paymentIntentId,
            amount: refund.amount / 100
        });

    } catch (error) {
      console.error("Error processing future refund:", error);
      responseHandler(res, 500, "Failed to process future refund");
    }
};

const refund = async (req: express.Request, res: express.Response) => {
    const { paymentIntentId, reason, bookingData, customerDetails, paymentMethod, sendEmailToCustomer = true, processRefund = true } = req.body;
  
    if (!paymentIntentId) {
      responseHandler(res, 400, "Payment Intent ID is required");
      return;
    }

    try {
        // Find the payment intent in our database
        const ourPaymentIntent = await prisma.paymentIntent.findUnique({
            where: { id: paymentIntentId },
            include: {
              bookings: {
                include: {
                  room: true
                }
              },
              payments: true,
              // Add actualPaymentMethod to the include so TS recognizes it
              // (Prisma always returns all scalar fields, but this helps TS)
            }
        });

        if (!ourPaymentIntent) {
          responseHandler(res, 404, "Payment Intent not found");
          return;
        }

        // Use actualPaymentMethod if set, else fallback to paymentMethod
        const methodToRefund = (ourPaymentIntent as any).actualPaymentMethod || paymentMethod;
        
        // Determine refund amount based on payment structure
        let refundAmount = ourPaymentIntent.totalAmount || ourPaymentIntent.amount;
        let refundNote = reason || `Refunded manually by admin (${methodToRefund})`;
        
        if (ourPaymentIntent.paymentStructure === 'SPLIT_PAYMENT') {
          // For split payments, only refund the amount already paid (30%)
          refundAmount = ourPaymentIntent.prepaidAmount || (ourPaymentIntent.totalAmount * 0.3);
          refundNote = `${refundNote} - Partial refund (prepaid amount only)`;
        }

        // Case 1: Manual payment methods (CASH or BANK_TRANSFER) - handle based on processRefund
        if (methodToRefund === "CASH" || methodToRefund === "BANK_TRANSFER") {
            const finalStatus = processRefund ? "REFUNDED" : "CANCELLED";
            const finalBookingStatus = processRefund ? "REFUNDED" : "CANCELLED";
            const finalPaymentStatus = processRefund ? "REFUNDED" : "CANCELLED";
            const finalNote = processRefund ? refundNote : `Cancelled by admin - ${reason || 'No refund processed'}`;
            const refundStatus = processRefund ? "FULLY_REFUNDED" : "CANCELLED_NO_REFUND";

            await prisma.$transaction(async (tx: any) => {
              // Update payment intent status
              await tx.paymentIntent.update({
                  where: { id: paymentIntentId },
                  data: { 
                    status: finalStatus,
                    adminNotes: finalNote,
                    refundStatus: refundStatus
                  }
              });

              // Update all related bookings to final status
              await tx.booking.updateMany({
                where: { paymentIntentId: paymentIntentId },
                data: { 
                  status: finalBookingStatus,
                  refundStatus: refundStatus
                }
              });

              // Update payment record if exists
              await tx.payment.updateMany({
                where: { paymentIntentId: paymentIntentId },
                data: { status: finalPaymentStatus }
              });

              // Remove temporary holds
              await tx.temporaryHold.deleteMany({
                where: { paymentIntentId: paymentIntentId }
              });
            });

            // Generate confirmation ID for the refund email - handle case where no bookings exist yet
            let refundConfirmationId: string;
            if (ourPaymentIntent.bookings && ourPaymentIntent.bookings.length > 0) {
              const bookingIds = ourPaymentIntent.bookings.map((booking: any) => booking.id);
              if (bookingIds.length >= 1 && bookingIds.length <= 5) {
                refundConfirmationId = generateMergedBookingId(bookingIds);
              } else {
                // If we have too many or too few bookings, use a fallback
                refundConfirmationId = `REFUND-${paymentIntentId}`;
              }
            } else {
              // No bookings exist yet, use fallback
              refundConfirmationId = `REFUND-${paymentIntentId}`;
            }

            // Update bookingData with the confirmation ID and paymentMethod
            const updatedBookingData = bookingData ? bookingData.map((booking: any) => ({
              ...booking,
              confirmationId: refundConfirmationId,
              paymentMethod: methodToRefund
            })) : [];

            if (sendEmailToCustomer) {
              if (processRefund) {
                await sendRefundConfirmationEmail(updatedBookingData, customerDetails, {
                  refundId: `manual-${paymentIntentId}`,
                  refundAmount: refundAmount,
                  refundCurrency: ourPaymentIntent.currency || 'EUR',
                  refundReason: refundNote
                });
              } else {
                // Send cancellation email without refund info
                await sendRefundConfirmationEmail(updatedBookingData, customerDetails, {
                  refundId: `cancel-${paymentIntentId}`,
                  refundAmount: 0,
                  refundCurrency: ourPaymentIntent.currency || 'EUR',
                  refundReason: `Booking cancelled - ${reason || 'No refund processed'}`,
                  isCancellationOnly: true
                });
              }
            }

            const successMessage = processRefund ? "Manual refund processed successfully" : "Booking cancelled successfully";
            responseHandler(res, 200, successMessage, {
              type: processRefund ? "manual_refund" : "cancellation",
              paymentIntentId: paymentIntentId,
              processedRefund: processRefund
            });
            return;
        }

        // Case 2: Stripe payment methods - handle based on status
        if (methodToRefund === "STRIPE" || !methodToRefund) {
            // Subcase 2a: Payment not yet completed - cancel the payment intent
            if (
                (ourPaymentIntent.status === "CREATED" || 
                 ourPaymentIntent.status === "PAYMENT_LINK_SENT" || 
                 ourPaymentIntent.status === "PENDING")) {
                
                // Cancel the Stripe payment intent if it exists
                if (ourPaymentIntent.stripePaymentIntentId) {
                  try {
                    await stripe.paymentIntents.cancel(ourPaymentIntent.stripePaymentIntentId);
                    console.log("Stripe payment intent cancelled:", ourPaymentIntent.stripePaymentIntentId);
                  } catch (stripeError: any) {
                    console.log("Could not cancel Stripe payment intent:", stripeError.message);
                  }
                }
      
                // Update our database - mark as cancelled
                await prisma.$transaction(async (tx: any) => {
                  // Update payment intent status
                  await tx.paymentIntent.update({
                      where: { id: paymentIntentId },
                      data: { 
                        status: "CANCELLED",
                        adminNotes: reason || "Cancelled by admin before payment"
                      }
                  });

                  // Update all related bookings to cancelled
                  await tx.booking.updateMany({
                    where: { paymentIntentId: paymentIntentId },
                    data: { status: "CANCELLED" }
                  });

                  // Remove temporary holds
                  await tx.temporaryHold.deleteMany({
                    where: { paymentIntentId: paymentIntentId }
                  });
                });

                // Generate confirmation ID for the refund email
                let cancelConfirmationId = `CANCEL-${paymentIntentId}`;
                if (ourPaymentIntent.bookings && ourPaymentIntent.bookings.length > 0) {
                  const bookingIds = ourPaymentIntent.bookings.map((booking: any) => booking.id);
                  if (bookingIds.length >= 1 && bookingIds.length <= 5) {
                    cancelConfirmationId = generateMergedBookingId(bookingIds);
                  }
                }
                // Update bookingData with the confirmation ID
                const updatedBookingData = bookingData ? bookingData.map((booking: any) => ({
                  ...booking,
                  confirmationId: cancelConfirmationId
                })) : [];

                if (sendEmailToCustomer) {
                  await sendRefundConfirmationEmail(updatedBookingData, customerDetails);
                }
      
              responseHandler(res, 200, "Payment intent cancelled successfully", {
                type: "cancellation",
                paymentIntentId: paymentIntentId
              });
              return;
            }
      
            // Subcase 2b: Payment has been completed - handle refund or cancel-only
            if (ourPaymentIntent.status === "SUCCEEDED" && ourPaymentIntent.stripePaymentIntentId) {
      
                const stripePaymentIntent = await stripe.paymentIntents.retrieve(ourPaymentIntent.stripePaymentIntentId);
                
                if (stripePaymentIntent.status !== "succeeded") {
                  responseHandler(res, 400, "Payment was not successful, cannot process");
                  return;
                }

                if (!processRefund) {
                  // Cancel-only scenario: update database status but don't process Stripe refund
                  await prisma.$transaction(async (tx: any) => {
                    // Update payment intent with cancelled status but keep track it can be refunded later
                    await tx.paymentIntent.update({
                        where: { id: paymentIntentId },
                        data: { 
                          status: "CANCELLED",
                          adminNotes: `Cancelled without refund - ${reason || 'Admin decision'}`,
                          refundStatus: "CANCELLED_NO_REFUND"
                        }
                    });

                    // Update all related bookings to cancelled
                    await tx.booking.updateMany({
                      where: { paymentIntentId: paymentIntentId },
                      data: { 
                        status: "CANCELLED",
                        refundStatus: "CANCELLED_NO_REFUND"
                      }
                    });

                    // Remove temporary holds
                    await tx.temporaryHold.deleteMany({
                      where: { paymentIntentId: paymentIntentId }
                    });
                  });

                  // Generate confirmation ID for cancellation email
                  let cancelConfirmationId = `CANCEL-${paymentIntentId}`;
                  if (ourPaymentIntent.bookings && ourPaymentIntent.bookings.length > 0) {
                    const bookingIds = ourPaymentIntent.bookings.map((booking: any) => booking.id);
                    if (bookingIds.length >= 1 && bookingIds.length <= 5) {
                      cancelConfirmationId = generateMergedBookingId(bookingIds);
                    }
                  }

                  // Update bookingData with the confirmation ID
                  const updatedBookingData = bookingData ? bookingData.map((booking: any) => ({
                    ...booking,
                    confirmationId: cancelConfirmationId
                  })) : [];

                  if (sendEmailToCustomer) {
                    await sendRefundConfirmationEmail(updatedBookingData, customerDetails, {
                      refundId: `cancel-${paymentIntentId}`,
                      refundAmount: 0,
                      refundCurrency: ourPaymentIntent.currency || 'EUR',
                      refundReason: `Booking cancelled - ${reason || 'No refund processed'}`,
                      isCancellationOnly: true
                    });
                  }

                  responseHandler(res, 200, "Booking cancelled successfully (refund can be processed later)", {
                      type: "cancellation",
                      paymentIntentId: paymentIntentId,
                      canRefundLater: true,
                      processedRefund: false
                  });
                  return;
                }

                // Process refund scenario
                // Check if already refunded
                const existingRefund = await stripe.refunds.list({
                  payment_intent: ourPaymentIntent.stripePaymentIntentId,
                  limit: 1
                });
      
                if (existingRefund.data.length > 0) {
                  responseHandler(res, 400, "Payment has already been refunded");
                  return;
                }
      
                // Update database to show refund pending before processing Stripe refund
                await prisma.paymentIntent.update({
                  where: { id: paymentIntentId },
                  data: { 
                    refundStatus: "REFUND_PENDING",
                    adminNotes: `Refund initiated - ${refundNote}`
                  }
                });

                // Create refund with correct amount (partial for split payments)
                const refund = await stripe.refunds.create({
                    payment_intent: ourPaymentIntent.stripePaymentIntentId,
                    amount: Math.round(refundAmount * 100), // Convert to cents
                    reason: reason || "requested_by_customer",
                    metadata: {
                      paymentIntentId: paymentIntentId,
                      refundReason: refundNote,
                      paymentStructure: ourPaymentIntent.paymentStructure || 'FULL_PAYMENT',
                      isFullRefund: 'true',
                      sendEmailToCustomer: sendEmailToCustomer.toString(),
                      processRefund: processRefund.toString()
                    }
                });
      
                responseHandler(res, 200, "Refund initiated successfully", {
                    type: "refund",
                    refundId: refund.id,
                    paymentIntentId: paymentIntentId,
                    amount: refund.amount / 100,
                    processedRefund: true
                });
              return;
            }
        }
  
      responseHandler(res, 400, `Cannot process refund/cancellation for payment intent with status: ${ourPaymentIntent.status} and payment method: ${methodToRefund}`);
  
    } catch (error) {
      console.error("Error processing refund:", error);
      responseHandler(res, 500, "Failed to process refund");
    }
};

const getAllPaymentIntent = async (req: express.Request, res: express.Response) => {

  try {
    const paymentIntent = await prisma.paymentIntent.findMany({
      include: {
        bookings: {
          select: {
            id: true,
            request: true
          }
        }
      }
    });
    responseHandler(res, 200, "success", paymentIntent);
  } catch (e) {
    console.log(e);
  }
}

const deletePaymentIntent = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Missing id in params");
    return;
  }

  try {
    await prisma.paymentIntent.delete({
      where: { id }
    })
    responseHandler(res, 200, "success");
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const sendConfirmationEmail = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  
  if (!id) {
    responseHandler(res, 400, "missing id params");
    return;
  }

  try {
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            enhancementBookings: true,
            room: true,
          }
        }
      }
    });

    if (!paymentIntent) {
      responseHandler(res, 404, "Payment intent not found");
      return;
    }

    const parsedCustomerDetails = JSON.parse(paymentIntent.customerData);
    
    // Generate merged booking ID for confirmation
    const bookingIds = paymentIntent.bookings.map((booking: any) => booking.id);

    const confirmationId = generateMergedBookingId(bookingIds);
    
    // Handle different payment methods - always generate receipt URL
    let receipt_url: string;
    
    if (paymentIntent.paymentMethod === 'STRIPE' && paymentIntent.stripeSessionId) {
      // For Stripe payments, use the existing receipt URL
      receipt_url = `${baseUrl}/sessions/${paymentIntent.stripeSessionId}/receipt`;
    } else if (paymentIntent.paymentMethod === 'CASH' || paymentIntent.paymentMethod === 'BANK_TRANSFER') {
      // For cash and bank transfer, create a custom receipt URL
      receipt_url = `${baseUrl}/sessions/receipts/${paymentIntent.id}`;
    } else {
      // Fallback for any other payment methods
      receipt_url = `${baseUrl}/sessions/receipts/${paymentIntent.id}`;
    }

    const bookingsWithPaymentIntent = paymentIntent.bookings.map((booking: any) => ({
      ...booking,
      paymentIntent: {
        amount: paymentIntent.amount,
        totalAmount: paymentIntent.totalAmount, // Add this field
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        stripeSessionId: paymentIntent.stripeSessionId,
        taxAmount: paymentIntent.taxAmount,
        paymentMethod: paymentIntent.paymentMethod,
        confirmationId: confirmationId
      }
    }));

    // Send confirmation email with PDF attachment for all payment methods
    //@ts-ignore
    await sendConsolidatedBookingConfirmation(bookingsWithPaymentIntent, parsedCustomerDetails, receipt_url);
    
    responseHandler(res, 200, "Confirmation email sent successfully");
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const getAllBookingsRestriction = async (req: express.Request, res: express.Response) => {
  try {
    const bookingRestriction = await prisma.bookingRestriction.findMany({
      include: {
        exceptions: true
      }
    });

    responseHandler(res, 200, "Fetched booking restrictions successfully", bookingRestriction);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const createBookingsRestriction = async (req: express.Request, res: express.Response) => {
  const { 
    daysOfWeek, 
    description, 
    endDate, 
    startDate, 
    isActive, 
    maxLength, 
    minLength, 
    minAdvance, 
    name, 
    priority, 
    ratePolicyIds, 
    rateScope, 
    sameDayCutoffTime, 
    type, 
    maxAdvance, 
    roomIds,
    exceptions = [] // Add exceptions to the create payload
  } = req.body;

  try {
    const restriction = await prisma.bookingRestriction.create({
      data: { 
        description,
        endDate: new Date(endDate),
        isActive,
        maxAdvance,
        daysOfWeek,
        name,
        startDate: new Date(startDate),
        maxLength,
        minAdvance,
        minLength,
        type,
        roomIds,
        sameDayCutoffTime,
        priority,
        ratePolicyIds,
        rateScope,
        exceptions: {
          create: exceptions.map((ex: any) => ({
            minLengthOverride: ex.minLengthOverride,
            maxLengthOverride: ex.maxLengthOverride,
            exceptionStartDate: ex.exceptionStartDate ? new Date(ex.exceptionStartDate) : null,
            exceptionEndDate: ex.exceptionEndDate ? new Date(ex.exceptionEndDate) : null,
            exceptionDaysOfWeek: ex.exceptionDaysOfWeek,
            rateScope: ex.rateScope,
            ratePolicyIds: ex.ratePolicyIds,
            roomScope: ex.roomScope,
            roomIds: ex.roomIds,
            isActive: ex.isActive !== false
          }))
        }
      },
      include: {
        exceptions: true
      }
    });

    responseHandler(res, 200, "Booking restriction created successfully", restriction);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const deleteBookingsRestriction = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Missing id");
    return;
  }

  try {
    // Delete will cascade to exceptions due to the relation
    await prisma.bookingRestriction.delete({ 
      where: { id }
    });
    
    responseHandler(res, 200, "Bookings restriction deleted successfully");
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const editBookingRestriction = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const data = req.body;

  // Mutate only those fields that need transformation
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  try {
    const existing = await prisma.bookingRestriction.findUnique({
      where: { id },
      include: { exceptions: true }
    });

    if (!existing) {
      res.status(404).json({ message: "Booking restriction not found" });
      return;
    }

    // Handle exceptions update
    const exceptionsUpdate = data.exceptions ? {
      deleteMany: {}, // Delete all existing exceptions
      create: data.exceptions.map((ex: any) => ({
        minLengthOverride: ex.minLengthOverride,
        maxLengthOverride: ex.maxLengthOverride,
        exceptionStartDate: ex.exceptionStartDate ? new Date(ex.exceptionStartDate) : null,
        exceptionEndDate: ex.exceptionEndDate ? new Date(ex.exceptionEndDate) : null,
        exceptionDaysOfWeek: ex.exceptionDaysOfWeek,
        rateScope: ex.rateScope,
        ratePolicyIds: ex.ratePolicyIds,
        roomScope: ex.roomScope,
        roomIds: ex.roomIds,
        isActive: ex.isActive !== false
      }))
    } : undefined;

    const updated = await prisma.bookingRestriction.update({
      where: { id },
      data: {
        ...data,
        exceptions: exceptionsUpdate
      },
      include: {
        exceptions: true
      }
    });

    responseHandler(res, 200, "Booking restriction updated successfully", updated);
  } catch (e) {
    console.error(e);
    handleError(res, e as Error);
  }
};

export const getUserByID =  async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Missing userid in params");
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id }});
    
    if (!user) {
      responseHandler(res, 404, "User not found");
      return;
    }
    responseHandler(res, 200, "success", user);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

// Dahua Camera Management Endpoints

export const testDahuaConnection = async (req: express.Request, res: express.Response) => {
  try {
    const success = await dahuaService.testConnection();
    
    if (success) {
      responseHandler(res, 200, "Dahua camera connection successful");
    } else {
      responseHandler(res, 400, "Dahua camera connection failed");
    }
  } catch (error: any) {
    console.error("Dahua connection test error:", error);
    responseHandler(res, 500, `Connection test failed: ${error.message}`);
  }
};

export const getLicensePlateStatus = async (req: express.Request, res: express.Response) => {
  const { plateNumber } = req.params;
  
  if (!plateNumber) {
    responseHandler(res, 400, "License plate number is required");
    return;
  }

  try {
    const status = await dahuaService.getLicensePlateStatus(plateNumber);
    responseHandler(res, 200, "License plate status retrieved", status);
  } catch (error: any) {
    console.error("License plate status error:", error);
    responseHandler(res, 500, `Failed to get license plate status: ${error.message}`);
  }
};

export const removeLicensePlate = async (req: express.Request, res: express.Response) => {
  const { bookingId } = req.params;
  
  if (!bookingId) {
    responseHandler(res, 400, "Booking ID is required");
    return;
  }

  try {
    const success = await licensePlateCleanupService.cleanupLicensePlateForBooking(bookingId);
    
    if (success) {
      responseHandler(res, 200, "License plate removed successfully");
    } else {
      responseHandler(res, 404, "No license plate found for this booking");
    }
  } catch (error: any) {
    console.error("License plate removal error:", error);
    responseHandler(res, 500, `Failed to remove license plate: ${error.message}`);
  }
};

export const runLicensePlateCleanup = async (req: express.Request, res: express.Response) => {
  try {
    await licensePlateCleanupService.cleanupExpiredLicensePlates();
    responseHandler(res, 200, "License plate cleanup completed successfully");
  } catch (error: any) {
    console.error("License plate cleanup error:", error);
    responseHandler(res, 500, `Cleanup failed: ${error.message}`);
  }
};

// Get users for notification assignment (optionally filter by role)
const getNotificationAssignableUsers = async (req: express.Request, res: express.Response) => {
  const { role } = req.query;
  try {
    const where: any = {};
    if (role) where.role = role;
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true }
    });
    responseHandler(res, 200, 'Assignable users', users);
  } catch (e) {
    handleError(res, e as Error);
  }
};

// Bank Details CRUD functions
const getAllBankDetails = async (req: express.Request, res: express.Response) => {
  try {
    const bankDetails = await prisma.bankDetails.findMany({
      orderBy: { createdAt: 'desc' }
    });
    responseHandler(res, 200, "Bank details retrieved successfully", bankDetails);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const createBankDetails = async (req: express.Request, res: express.Response) => {
  const { name, bankName, accountName, accountNumber, iban, swiftCode, routingNumber } = req.body;

  try {
    const bankDetails = await prisma.bankDetails.create({
      data: {
        name,
        bankName,
        accountName,
        accountNumber,
        iban,
        swiftCode,
        routingNumber
      }
    });
    responseHandler(res, 200, "Bank details created successfully", bankDetails);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const updateBankDetails = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, bankName, accountName, accountNumber, iban, swiftCode, routingNumber, isActive } = req.body;

  try {
    const bankDetails = await prisma.bankDetails.update({
      where: { id },
      data: {
        name,
        bankName,
        accountName,
        accountNumber,
        iban,
        swiftCode,
        routingNumber,
        isActive
      }
    });
    responseHandler(res, 200, "Bank details updated successfully", bankDetails);
  } catch (e) {
    handleError(res, e as Error);
  }
};

const deleteBankDetails = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  try {
    await prisma.bankDetails.delete({
      where: { id }
    });
    responseHandler(res, 200, "Bank details deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};

// Confirm booking function
const confirmBooking = async (req: express.Request, res: express.Response) => {
  const { paymentIntentId, customerRequest } = req.body;

  if (!paymentIntentId) {
    responseHandler(res, 400, "Payment Intent ID is required");
    return;
  }

  try {
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        bookings: true
      }
    });

    if (!paymentIntent) {
      responseHandler(res, 404, "Payment Intent not found");
      return;
    }

    if (paymentIntent.status !== "PENDING") {
      responseHandler(res, 400, "Payment Intent is not in PENDING status");
      return;
    }

    // Update payment intent status to SUCCEEDED
    await prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: "SUCCEEDED" }
    });

    // Parse booking data and customer data
    const bookingData = JSON.parse(paymentIntent.bookingData);
    const customerData = JSON.parse(paymentIntent.customerData);

    // Create or find customer
    let customer = await prisma.customer.findUnique({
      where: { guestEmail: customerData.email }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          guestFirstName: customerData.firstName,
          guestMiddleName: customerData.middleName,
          guestLastName: customerData.lastName,
          guestEmail: customerData.email,
          guestPhone: customerData.phone,
          guestNationality: customerData.nationality,
          accountActivated: true,
          emailVerified: true
        }
      });
    }

    // Create bookings
    const createdBookings = [];
    for (const bookingItem of bookingData) {
      const booking = await prisma.booking.create({
        data: {
          roomId: bookingItem.selectedRoom,
          checkIn: new Date(bookingItem.checkIn),
          checkOut: new Date(bookingItem.checkOut),
          totalGuests: bookingItem.adults,
          status: "CONFIRMED",
          customerId: customer.id,
          paymentIntentId: paymentIntent.id,
          request: customerRequest || customerData.specialRequests || null, // <-- use customerRequest if provided
          carNumberPlate: customerData.carNumberPlate,
          groupId: customerData.groupId
        }
      });
      createdBookings.push(booking);
    }

    // Remove temporary holds
    await prisma.temporaryHold.deleteMany({
      where: { paymentIntentId }
    });

    responseHandler(res, 200, "Booking confirmed successfully", {
      paymentIntentId,
      bookings: createdBookings,
      customer
    });

  } catch (e) {
    console.error("Error confirming booking:", e);
    handleError(res, e as Error);
  }
};

const resendBankTransferInstructions = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Payment Intent ID is required");
    return;
  }

  try {
    // Find the payment intent
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id },
      include: {
        bookings: {
          include: { room: true }
        }
      }
    });

    if (!paymentIntent) {
      responseHandler(res, 404, "Payment intent not found");
      return;
    }

    if (paymentIntent.paymentMethod !== 'BANK_TRANSFER') {
      responseHandler(res, 400, "This action is only available for bank transfer payment methods.");
      return;
    }

    // Get customer details
    const customerDetails = JSON.parse(paymentIntent.customerData);
    const bookingItems = JSON.parse(paymentIntent.bookingData);

    // Get bank details (assuming only one set of bank details is used)
    const bankDetails = await prisma.bankDetails.findFirst({});
    if (!bankDetails) {
      responseHandler(res, 400, "Bank details not found");
      return;
    }

    // Prepare template data
    const templateData = {
      customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
      totalAmount: paymentIntent.totalAmount?.toFixed(2) || paymentIntent.amount?.toFixed(2) || '0.00',
      expiresAt: paymentIntent.expiresAt?.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) || '72 hours from now',
      paymentIntentId: paymentIntent.id,
      bankName: bankDetails.bankName,
      accountName: bankDetails.accountName,
      accountNumber: bankDetails.accountNumber,
      iban: bankDetails.iban,
      swiftCode: bankDetails.swiftCode,
      routingNumber: bankDetails.routingNumber,
      bookingDetails: bookingItems.map((booking: any) => ({
        roomDetails: booking.roomDetails || booking.room,
        checkIn: new Date(booking.checkIn).toLocaleDateString(),
        checkOut: new Date(booking.checkOut).toLocaleDateString(),
        adults: booking.adults,
        totalPrice: booking.totalPrice?.toFixed(2) || '0.00'
      }))
    };

    await EmailService.sendEmail({
      to: {
        email: customerDetails.email,
        name: `${customerDetails.firstName} ${customerDetails.lastName}`
      },
      templateType: 'BANK_TRANSFER_INSTRUCTIONS',
      templateData
    });

    responseHandler(res, 200, "Bank transfer instructions resent successfully");
  } catch (e) {
    console.error("Error resending bank transfer instructions:", e);
    handleError(res, e as Error);
  }
};

// Add confirmPaymentMethod controller
const confirmPaymentMethod = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { actualPaymentMethod } = req.body;

  if (!id || !actualPaymentMethod) {
    responseHandler(res, 400, "Payment Intent ID and actualPaymentMethod are required");
    return;
  }

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update the payment intent with the actual payment method and mark as succeeded
      const updatedPaymentIntent = await tx.paymentIntent.update({
        where: { id },
        data: {
          actualPaymentMethod,
          status: "SUCCEEDED"
        }
      });

      // Remove temporary holds
      await tx.temporaryHold.deleteMany({ where: { paymentIntentId: id } });

      // Check if bookings already exist
      let bookings = await tx.booking.findMany({ where: { paymentIntentId: id } });

      if (bookings.length === 0) {
        // Parse booking data and customer data
        const bookingData = JSON.parse(updatedPaymentIntent.bookingData);
        const customerData = JSON.parse(updatedPaymentIntent.customerData);

        // Create or find customer
        let customer = await tx.customer.findUnique({
          where: { guestEmail: customerData.email }
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              guestFirstName: customerData.firstName,
              guestMiddleName: customerData.middleName,
              guestLastName: customerData.lastName,
              guestEmail: customerData.email,
              guestPhone: customerData.phone,
              guestNationality: customerData.nationality,
              accountActivated: true,
              emailVerified: true
            }
          });
        }

        // Create bookings
        for (const bookingItem of bookingData) {
          const booking = await tx.booking.create({
            data: {
              roomId: bookingItem.selectedRoom,
              checkIn: new Date(bookingItem.checkIn),
              checkOut: new Date(bookingItem.checkOut),
              totalGuests: bookingItem.adults,
              status: "CONFIRMED",
              customerId: customer.id,
              paymentIntentId: updatedPaymentIntent.id,
              request: customerData.specialRequests || null,
              carNumberPlate: customerData.carNumberPlate,
              groupId: customerData.groupId
            }
          });
          bookings.push(booking);
        }
      }

      return { updatedPaymentIntent, bookings };
    });

    responseHandler(res, 200, "Payment method confirmed, bookings created and marked as succeeded", result);
  } catch (e) {
    handleError(res, e as Error);
  }
};

// Partial Refund Functions
const processPartialRefund = async (req: express.Request, res: express.Response) => {
  const { bookingId, reason } = req.body;
  //@ts-ignore
  const adminUserId = req.user?.id;

  if (!bookingId) {
    responseHandler(res, 400, "Booking ID is required");
    return;
  }

  try {
    // Get booking details for the refund metadata
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        customer: true,
        paymentIntent: true
      }
    });

    if (!booking) {
      responseHandler(res, 404, "Booking not found");
      return;
    }

    const result = await PartialRefundService.processPartialRefund({
      bookingId,
      reason,
      adminUserId
    });

    responseHandler(res, 200, "Partial refund initiated successfully", result);
  } catch (e) {
    console.error("Error processing partial refund:", e);
    handleError(res, e as Error);
  }
};

const getBookingRefundInfo = async (req: express.Request, res: express.Response) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    responseHandler(res, 400, "Booking ID is required");
    return;
  }

  try {
    const refundInfo = await PartialRefundService.getBookingRefundInfo(bookingId);
    responseHandler(res, 200, "Booking refund info retrieved successfully", refundInfo);
  } catch (e) {
    console.error("Error getting booking refund info:", e);
    handleError(res, e as Error);
  }
};

const getPaymentIntentBookings = async (req: express.Request, res: express.Response) => {
  const { id: paymentIntentId } = req.params;

  if (!paymentIntentId) {
    responseHandler(res, 400, "Payment Intent ID is required");  
    return;
  }

  try {
    const bookings = await PartialRefundService.getPaymentIntentBookings(paymentIntentId);
    responseHandler(res, 200, "Payment intent bookings retrieved successfully", bookings);
  } catch (e) {
    console.error("Error getting payment intent bookings:", e);
    handleError(res, e as Error);
  }
};

const processCustomPartialRefund = async (req: express.Request, res: express.Response) => {
  const { bookingId, refundAmount, reason, sendEmailToCustomer = true } = req.body;
  //@ts-ignore
  const adminUserId = req.user?.id;

  if (!bookingId || !refundAmount) {
    responseHandler(res, 400, "Booking ID and refund amount are required");
    return;
  }

  if (refundAmount <= 0) {
    responseHandler(res, 400, "Refund amount must be greater than 0");
    return;
  }

  try {
    // Get the booking with payment intent and room details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        paymentIntent: true,
        customer: true
      }
    });

    if (!booking) {
      responseHandler(res, 404, "Booking not found");
      return;
    }

    if (booking.status === 'REFUNDED') {
      responseHandler(res, 400, "Booking is already fully refunded");
      return;
    }

    if (!booking.paymentIntent) {
      responseHandler(res, 400, "No payment intent found for this booking");
      return;
    }

    if (!booking.paymentIntent.stripePaymentIntentId) {
      responseHandler(res, 400, "No Stripe payment intent ID found for this booking");
      return;
    }

    if (!booking.totalAmount) {
      responseHandler(res, 400, "No total amount found for this booking");
      return;
    }

    // Check if refund amount exceeds remaining refundable amount
    const currentRefundAmount = booking.refundAmount || 0;
    const remainingRefundable = booking.totalAmount - currentRefundAmount;

    if (refundAmount > remainingRefundable) {
      responseHandler(res, 400, `Refund amount (€${refundAmount}) exceeds remaining refundable amount (€${remainingRefundable})`);
      return;
    }

    // Handle different payment methods
    if (booking.paymentIntent.paymentMethod === 'CASH' || booking.paymentIntent.paymentMethod === 'BANK_TRANSFER') {
      // For manual payment methods, just update the database
      const updatedRefundAmount = currentRefundAmount + refundAmount;
      const newStatus = updatedRefundAmount >= booking.totalAmount ? 'REFUNDED' : booking.status;

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          refundAmount: updatedRefundAmount,
          status: newStatus
        }
      });

      // Send custom partial refund email if requested
      if (sendEmailToCustomer) {
        const emailTemplate = await prisma.emailTemplate.findUnique({
          //@ts-ignore
          where: { type: 'CUSTOM_PARTIAL_REFUND_CONFIRMATION' }
        });

        if (emailTemplate && booking.customer) {
          await EmailService.sendEmail({
            to: {
              email: booking.customer.guestEmail,
              name: `${booking.customer.guestFirstName} ${booking.customer.guestLastName}`
            },
            templateType: 'CUSTOM_PARTIAL_REFUND_CONFIRMATION',
            templateData: {
              customerName: `${booking.customer.guestFirstName} ${booking.customer.guestLastName}`,
              refundAmount: refundAmount,
              refundCurrency: booking.paymentIntent.currency || 'EUR',
              bookingId: booking.id,
              roomName: booking.room.name,
              refundReason: reason || 'Custom partial refund',
              refundDate: new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              remainingAmount: booking.totalAmount - updatedRefundAmount,
              originalAmount: booking.totalAmount,
              paymentMethod: booking.paymentIntent.paymentMethod
            }
          });
        }
      }

      responseHandler(res, 200, "Custom partial refund processed successfully", {
        success: true,
        bookingId: booking.id,
        refundAmount: refundAmount,
        totalRefunded: updatedRefundAmount,
        remainingAmount: booking.totalAmount - updatedRefundAmount,
        message: `Custom partial refund of €${refundAmount} processed for ${booking.room.name}`
      });
    } else {
      // For Stripe payments, create refund
      const refund = await stripe.refunds.create({
        payment_intent: booking.paymentIntent.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          bookingId: booking.id,
          roomName: booking.room.name,
          refundReason: reason || 'Custom partial refund',
          adminUserId: adminUserId || 'system',
          refundType: 'custom_partial_refund',
          sendEmailToCustomer: sendEmailToCustomer.toString()
        }
      });

      console.log(`Custom partial refund initiated for booking ${bookingId}: €${refundAmount}`);
      console.log(`Stripe refund ID: ${refund.id}`);

      // The webhook will handle updating our database and sending emails when Stripe confirms the refund
      responseHandler(res, 200, "Custom partial refund initiated successfully", {
        success: true,
        refundId: refund.id,
        bookingId: booking.id,
        refundAmount: refundAmount,
        message: `Custom partial refund of €${refundAmount} initiated for ${booking.room.name}`
      });
    }

  } catch (e) {
    console.error("Error processing custom partial refund:", e);
    handleError(res, e as Error);
  }
};

export { getNotificationAssignableUsers, getGeneralSettings, updateGeneralSettings,  login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, updateBooking, deleteBooking, createEnhancement, updateEnhancement, deleteEnhancement, getAllEnhancements, getAllRatePolicies, createRatePolicy, updateRatePolicy, deleteRatePolicy, bulkPoliciesUpdate, updateBasePrice, updateRoomPrice, createAdminPaymentLink, collectCash, createBankTransfer, refund, processFutureRefund, getAllPaymentIntent, deletePaymentIntent, getAllBankDetails, createBankDetails, updateBankDetails, deleteBankDetails, confirmBooking, resendBankTransferInstructions, confirmPaymentMethod, processPartialRefund, getBookingRefundInfo, getPaymentIntentBookings, processCustomPartialRefund };


