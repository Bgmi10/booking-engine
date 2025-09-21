import express from "express"
import prisma from "../../prisma";
import { generateRandomPassword, handleError, responseHandler } from "../../utils/helper";
import { generateToken } from "../../utils/jwt";
import { EmailService } from "../../services/emailService";

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
            password
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
  