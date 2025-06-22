import express from "express";
import prisma from "../prisma";
import { calculateNights, handleError, responseHandler } from "../utils/helper";
import { comparePassword, hashPassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import { sendOtp } from "../services/sendotp";
import { s3 } from "../config/s3";
import { deleteImagefromS3 } from "../services/s3";
import { Prisma } from "@prisma/client";
import { sendConsolidatedBookingConfirmation, sendPaymentLinkEmail, sendRefundConfirmationEmail } from "../services/emailTemplate";
import { stripe } from "../config/stripe";
import { baseUrl } from "../utils/constants";

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
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 20 * 24 * 60 * 60 * 1000, domain: process.env.NODE_ENV === "production" ? "latorre.farm" : "localhost" });
      responseHandler(res, 200, "Login successful");
    } catch (e) {
        console.log(e);
        handleError(res, e as Error);
    }  
  
}

const logout = async (_req: express.Request, res: express.Response) => {
  res.clearCookie("token", { domain: "latorre.farm" });
  responseHandler(res, 200, "Logout successful");
}   

const createRoom = async (req: express.Request, res: express.Response) => {
  const { name, price, description, images, capacity, ratePolicyId, amenities } = req.body;
  try {
    const room = await prisma.room.create({
      data: { name, price, description, capacity, images: { create: (images || []).map((image: string) => ({ url: image })) }, RoomRate: { create: ratePolicyId.map((id: string) => ({ ratePolicyId: id })) }, amenities },
      include: {
        RoomRate: true,
      },
    });
    responseHandler(res, 200, "Room created successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRoom = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, price, description, capacity, ratePolicyId, amenities } = req.body;

  try {
    // Build base update data
    const updateData: Prisma.RoomUpdateInput = {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(description !== undefined && { description }),
      ...(capacity !== undefined && { capacity }),
      ...(amenities !== undefined && { amenities }),
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
  const { name, description, nightlyRate, isActive, refundable, prepayPercentage, fullPaymentDays, changeAllowedDays, rebookValidityDays, discountPercentage } = req.body;
  try {
    if (discountPercentage) {
      const ratePolicy = await prisma.ratePolicy.create({ data: { name, description, discountPercentage, isActive, } });
      responseHandler(res, 200, "Rate policy created successfully", ratePolicy);
    } else {
      const ratePolicy = await prisma.ratePolicy.create({ data: { name, description, nightlyRate, isActive, refundable, prepayPercentage, fullPaymentDays, changeAllowedDays, rebookValidityDays } });
      responseHandler(res, 200, "Rate policy created successfully", ratePolicy);
    }
  } catch (e) {
    handleError(res, e as Error);
  }
}

const updateRatePolicy = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { name, description, nightlyRate, isActive, refundable, prepayPercentage, fullPaymentDays, changeAllowedDays, rebookValidityDays, discountPercentage } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (nightlyRate !== undefined) updateData.nightlyRate = nightlyRate;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (refundable !== undefined) updateData.refundable = refundable;
  if (prepayPercentage !== undefined) updateData.prepayPercentage = prepayPercentage;
  if (fullPaymentDays !== undefined) updateData.fullPaymentDays = fullPaymentDays;
  if (changeAllowedDays !== undefined) updateData.changeAllowedDays = changeAllowedDays;
  if (rebookValidityDays !== undefined) updateData.rebookValidityDays = rebookValidityDays;
  if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage;

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
  const { minStayDays, id, taxPercentage } = req.body;

  if (!id || typeof minStayDays === 'undefined' && typeof taxPercentage === 'undefined') {
    responseHandler(res, 400, "Missing required fields: id and at least one of minStayDays or taxPercentage");
    return;
  }

  let updateData: { minStayDays?: number; taxPercentage?: number } = {};

  if (typeof minStayDays !== 'undefined') {
    updateData.minStayDays = minStayDays;
  }

  if (typeof taxPercentage !== 'undefined') {
    updateData.taxPercentage = taxPercentage;
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

// Helper function to find or create product/price
export const findOrCreatePrice = async (itemData: { 
    name?: string;
    description?: string;
    unitAmount: number;
    currency: string;
    images?: string[];
    dates?: {
        checkIn: string;
        checkOut: string;
    };
    rateOption?: {
        name: string;
        id: string;
    };
    bookingIndex?: number; // Add index to make each booking unique
}) => {
    const { name, description, unitAmount, currency, images, dates, rateOption, bookingIndex } = itemData;
    
    // Always create a new product and price for room bookings
    if (dates) {
        // Make the product name unique by including the booking index
        const uniqueProductName = `${name} - Booking ${bookingIndex || Date.now()}`;
        
        const product = await stripe.products.create({
            name: uniqueProductName,
            description,
            images,
            metadata: {
                checkIn: dates.checkIn,
                checkOut: dates.checkOut,
                rateOptionId: rateOption?.id || '',
                rateOptionName: rateOption?.name || '',
                bookingIndex: bookingIndex?.toString() || Date.now().toString()
            }
        });

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: unitAmount,
            currency,
        });

        return price.id;
    }

    // For non-room items (like enhancements), create unique prices per booking
    const uniqueProductName = `${name} - Booking ${bookingIndex || Date.now()}`;
    
    const product = await stripe.products.create({
        name: uniqueProductName,
        description,
        images,
        metadata: {
            bookingIndex: bookingIndex?.toString() || Date.now().toString()
        }
    });

    const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency,
    });

    return price.id;
};

const createAdminPaymentLink = async (req: express.Request, res: express.Response) => {
    const { 
        bookingItems, 
        customerDetails, 
        taxAmount, 
        totalAmount, 
        expiresInHours = 72,
        adminNotes 
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

        // Build line items
        const line_items: { price: string; quantity: number; }[] = [];
        
        await Promise.all(bookingItems.map(async (booking: any, index: number) => {
            const numberOfNights = calculateNights(booking.checkIn, booking.checkOut);
            const roomRatePerNight = booking.selectedRateOption?.price || booking.roomDetails.price;
            const totalRoomPrice = roomRatePerNight * numberOfNights;
            
            // Create room price with unique booking index
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

            // Handle enhancements
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

                    // Create enhancement price with unique booking and enhancement index
                    const enhancementPriceId = await findOrCreatePrice({
                        name: enhancement.title,
                        description: `€${enhancement.price} ${enhancement.pricingType === "PER_GUEST" ? "per guest" : enhancement.pricingType === "PER_ROOM" ? "per room" : enhancement.pricingType === "PER_NIGHT" ? "per night" : enhancement.pricingType === "PER_GUEST_PER_NIGHT" ? "per guest per night" : "per booking"} | ${enhancement.description} | Taxes included`,
                        unitAmount: Math.round(enhancement.price * 100),
                        currency: "eur",
                        images: enhancement.image ? [enhancement.image] : undefined,
                        bookingIndex: index * 1000 + enhancementIndex // Make sure enhancement index is unique
                    });

                    line_items.push({
                        price: enhancementPriceId,
                        quantity: enhancementQuantity,
                    });
                }));
            }
        }));

        // Create Payment Link with aggregated line items
        const paymentLink = await stripe.paymentLinks.create({
            line_items,
            metadata: {
              customerEmail: customerDetails.email,
              type: "admin_payment_link",
              taxAmount: taxAmount.toString(),
              totalAmount: totalAmount.toString(),
              paymentIntentId: paymentIntent.id
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
                checkout_session_id: "{CHECKOUT_SESSION_ID}" // Add this to ensure we can track the session ID
              }
            },
            // Make the payment link single-use
            allow_promotion_codes: false,
            // Set to inactive after one successful payment
            restrictions: {
                completed_sessions: { limit: 1 }
            }
        });

        // After successful payment link creation, update the payment intent status
        await prisma.paymentIntent.update({
            where: { id: paymentIntent.id },
            data: {
              status: "PAYMENT_LINK_SENT",
              stripePaymentLinkId: paymentLink.id // Store the payment link ID
            }
        });
        
        const route = `/payment-intent/${paymentIntent.id}/check-status`
        const paymentLinkUrl = process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL + route : process.env.FRONTEND_PROD_URL + route 
    
        await sendPaymentLinkEmail({
            email: customerDetails.email,
            name: `${customerDetails.firstName} ${customerDetails.lastName}`,
            paymentLink: paymentLinkUrl,
            bookingDetails: bookingItems,
            totalAmount,
            expiresAt
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


export const refund = async (req: express.Request, res: express.Response) => {
    const { paymentIntentId, reason, bookingData, customerDetails } = req.body;
  
    if (!paymentIntentId) {
      responseHandler(res, 400, "Payment Intent ID is required");
      return;
    }

    console.log("logged from adminController", customerDetails);
  
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
              payments: true
            }
        });
  
        if (!ourPaymentIntent) {
          responseHandler(res, 404, "Payment Intent not found");
          return;
        }
  
        if (
            (ourPaymentIntent.status === "CREATED" || 
             ourPaymentIntent.status === "PAYMENT_LINK_SENT" || 
             ourPaymentIntent.status === "PENDING")) {
            
            console.log("Canceling unpaid admin-created payment intent:", paymentIntentId);
            
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
            await prisma.$transaction(async (tx) => {
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
          await sendRefundConfirmationEmail(bookingData, customerDetails);
  
          responseHandler(res, 200, "Payment intent cancelled successfully", {
            type: "cancellation",
            paymentIntentId: paymentIntentId
          });
          return;
        }
  
        // Case 2: Payment has been completed - need to refund via Stripe
        if (ourPaymentIntent.status === "SUCCEEDED" && ourPaymentIntent.stripePaymentIntentId) {
  
            const stripePaymentIntent = await stripe.paymentIntents.retrieve(ourPaymentIntent.stripePaymentIntentId);
            
            if (stripePaymentIntent.status !== "succeeded") {
              responseHandler(res, 400, "Payment was not successful, cannot refund");
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
  
            const refund = await stripe.refunds.create({
                payment_intent: ourPaymentIntent.stripePaymentIntentId,
                reason: reason || "requested_by_customer",
                metadata: {
                  paymentIntentId: paymentIntentId,
                  refundReason: reason || "Admin initiated refund"
                }
            });
  
            responseHandler(res, 200, "Refund initiated successfully", {
                type: "refund",
                refundId: refund.id,
                paymentIntentId: paymentIntentId,
                amount: refund.amount / 100
            });
          return;
        }
  
      responseHandler(res, 400, `Cannot process refund/cancellation for payment intent with status: ${ourPaymentIntent.status}`);
  
    } catch (error) {
      console.error("Error processing refund:", error);
      responseHandler(res, 500, "Failed to process refund");
    }
};

export const getAllPaymentIntent = async (req: express.Request, res: express.Response) => {

  try {
    const paymentIntent = await prisma.paymentIntent.findMany({
      include: {
        bookings: {
          select: {
            id: true
          }
        }
      }
    });
    responseHandler(res, 200, "success", paymentIntent);
  } catch (e) {
    console.log(e);
  }
}

export const deletePaymentIntent = async (req: express.Request, res: express.Response) => {
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
    const receipt_url = `${baseUrl}/sessions/${paymentIntent.stripeSessionId}/receipt`;
    const bookingsWithPaymentIntent = paymentIntent.bookings.map(booking => ({
      ...booking,
      paymentIntent: {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        stripeSessionId: paymentIntent.stripeSessionId,
        taxAmount: paymentIntent.taxAmount
      }
    }));

    //@ts-ignore
    await sendConsolidatedBookingConfirmation(bookingsWithPaymentIntent, parsedCustomerDetails, receipt_url);
    responseHandler(res, 200, "Confimation email sent successfully");
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
export { getGeneralSettings, updateGeneralSettings,  login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, updateBooking, deleteBooking, createEnhancement, updateEnhancement, deleteEnhancement, getAllEnhancements, getAllRatePolicies, createRatePolicy, updateRatePolicy, deleteRatePolicy, bulkPoliciesUpdate, updateBasePrice, updateRoomPrice, createAdminPaymentLink };


