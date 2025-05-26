import { Request, Response } from "express";
import prisma from "../prisma";
import { responseHandler } from "../utils/helper";

export const getEnhancements = async (req: Request, res: Response) => {
  const { days } = req.body;

  if (!days) {
    responseHandler(res, 400, "Days are required");
    return;
  }

  try {
    const enhancements = await prisma.enhancement.findMany({
      where: {
        availableDays: {
          hasSome: days,
        },
      },
      select: {
        id: true,
        availableDays: true,
        description: true,
        image: true,
        price: true,
        pricingType: true,
        title: true,
      }
    });

    responseHandler(res, 200, "Fetched enhancements successfully", enhancements);
  } catch (error) {
    console.log(error);
    responseHandler(res, 500, "Internal server error");
  }
};

