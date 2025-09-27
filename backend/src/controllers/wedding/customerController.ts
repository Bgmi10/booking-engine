import express from "express"
import prisma from "../../prisma";
import { generateOTP, generateRandomPassword, handleError, responseHandler } from "../../utils/helper";
import { generateToken, verifyToken } from "../../utils/jwt";
import { EmailService } from "../../services/emailService";
import { comparePassword, hashPassword } from "../../utils/bcrypt";
import { sendOtp } from "../../services/sendotp";

export const registerCustomer = async (req: express.Request, res: express.Response) => {
    const { 
      name1: partnerName1, 
      name2: partnerName2, 
      title1: partnerTitle1, 
      title2: partnerTitle2, 
      nights, 
      guestCount, 
      prefferedMonth, 
      prefferedYear, 
      email 
    } = req.body;
    
    try {
      const password = generateRandomPassword();
      const hashedPassword = await hashPassword(password);

      const existingCustomer = await prisma.customer.findUnique({
        where: { guestEmail: email }
      });
  
      if (existingCustomer) {
        // Update existing customer
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            partnerName1,
            partnerName2,
            partnerTitle1,
            partnerTitle2, 
            totalNights: nights,
            expectedGuests: guestCount,
            prefferedMonth,
            prefferedYear,
            password: hashedPassword
          }
        });
      } else {
        // Create new customer
        await prisma.customer.create({
          data: {
            partnerName1,
            partnerName2,
            partnerTitle1,
            partnerTitle2, 
            totalNights: nights,
            expectedGuests: guestCount,
            prefferedMonth,
            prefferedYear,
            guestEmail: email,
            password
          }
        });
      }
  
      const token = generateToken({ email });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        domain: process.env.NODE_ENV === "production" ? "latorre.farm" : "localhost" 
      });
  
      await EmailService.sendEmail({ 
        to: {
            email,
            name: partnerName1
        }, 
        templateType: "WEDDING_PORTAL_USER_SIGNUP_PASSWORD", 
        templateData: { email, password } 
      });
  
      responseHandler(res, 201, "Customer registered/updated successfully");
      
    } catch (e) {
      console.error(e);
      handleError(res, e as Error);
    }
};
  
export const profile = async (req: express.Request, res: express.Response) => {
  //@ts-ignore
  const { email } = req.user;
  

  try {
    const user = await prisma.customer.findUnique({
      where: { guestEmail: email }
    });

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


export const login = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    responseHandler(res, 400, "Token and password is required fields");
    return;
  }

  try {
    const existingUser = await prisma.customer.findUnique({
      where: { guestEmail: email }
    });

    if (!existingUser) {
      responseHandler(res, 404, "User not found");
      return;
    };

    const isValidPassword = await comparePassword(password, existingUser.password || "");

    if (!isValidPassword) {
      responseHandler(res, 400, "Invalid Passoword");
      return;
    }

    const token = generateToken({ email });
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      domain: process.env.NODE_ENV === "production" ? "latorre.farm" : "localhost" 
    });

    responseHandler(res, 200, "Logged In successfully");
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}

export const forgetPassword = async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  if (!email) {
    responseHandler(res, 400, "Email is required");
    return;
  }

  const user = await prisma.customer.findUnique({ where: { guestEmail: email } });

  if (!user) {
    responseHandler(res, 404, "User not found");
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
    const resetToken = generateToken({ email });
    const resetLink = process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL + `/auth/reset-password?token=${resetToken}` : process.env.FRONTEND_PROD_URL + `/auth/reset-password?token=${resetToken}`
    await sendOtp(email, "Password Reset Link", otp, resetLink);
    responseHandler(res, 200, "OTP sent to email");
  } catch (e) {
    handleError(res, e as Error);
  }
}

export const updatePassword =  async (req: express.Request, res: express.Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    responseHandler(res, 400, "Token and password is required fields");
    return;
  }

  const isValidToken = verifyToken(token);
  
  if (!isValidToken) {
    responseHandler(res, 400, "Invalid token");
    return;
  };

  const hashedPassword = await hashPassword(password)

  try {
    await prisma.customer.update({
      //@ts-ignore
      where: { guestEmail: isValidToken?.email },
      data: { password: hashedPassword }
    }) 

    responseHandler(res, 200, "Password Changed Successfully");
  } catch (e) {
    console.log(e);
  }
}

export const updateProfile = async (req: express.Request, res: express.Response) => {
  const { password, email: updateEmail, partnerName1, partnerName2, partnerTitle1, partnerTitle2 } = req.body;
  //@ts-ignore
  const { email } = req.user;

  const updateData = {
    password: "",
    email: "",
    partnerName1: "",
    partnerName2: "",
    partnerTitle1: "",
    partnerTitle2: ""
  };

  if (password !== "") {
    updateData.password = password
  }

  if (email !== "") {
    updateData.email = updateEmail
  }

  if (partnerName1 !== "") {
    updateData.partnerName1 = partnerName1
  }

  if (partnerName1 !== "") {
    updateData.partnerName2 = partnerName2
  }
  if (partnerName1 !== "") {
    updateData.partnerTitle1 = partnerTitle1
  }
  if (partnerName1 !== "") {
    updateData.partnerTitle2 = partnerTitle2
  }

  try {
    const user = await prisma.customer.update({
      where: { guestEmail: email },
      data: updateData
    });
    responseHandler(res, 200, "success", user);
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
}