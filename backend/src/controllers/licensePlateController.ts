import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { responseHandler, handleError } from "../utils/helper";
import { LicensePlateType } from "@prisma/client";

const prisma = new PrismaClient();

// Get all license plate entries with pagination and filtering
export const getLicensePlateEntries = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "50",
      type,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};
    
    if (type && Object.values(LicensePlateType).includes(type as LicensePlateType)) {
      where.type = type;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    
    if (search) {
      where.OR = [
        { plateNo: { contains: search as string, mode: "insensitive" } },
        { ownerName: { contains: search as string, mode: "insensitive" } },
        { notes: { contains: search as string, mode: "insensitive" } }
      ];
    }

    // Get entries with user data
    const entries = await prisma.licensePlateEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder as "asc" | "desc"
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.licensePlateEntry.count({ where });
    const totalPages = Math.ceil(totalCount / limitNum);

    responseHandler(res, 200, "License plate entries retrieved successfully", {
      entries,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Get single license plate entry by ID
export const getLicensePlateEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entry = await prisma.licensePlateEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!entry) {
      return responseHandler(res, 404, "License plate entry not found");
    }

    responseHandler(res, 200, "License plate entry retrieved successfully", entry);
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Create new license plate entry
export const createLicensePlateEntry = async (req: Request, res: Response) => {
  try {
    const {
      plateNo,
      type = LicensePlateType.ALLOW_LIST,
      ownerName,
      validStartTime,
      validEndTime,
      userId,
      bookingId,
      notes
    } = req.body;

    const createdBy = (req as any).user?.id;

    // Check if plate number already exists
    const existingEntry = await prisma.licensePlateEntry.findUnique({
      where: { plateNo: plateNo.toUpperCase() }
    });

    if (existingEntry) {
      return responseHandler(res, 400, "License plate number already exists");
    }

    // Validate dates
    const startDate = new Date(validStartTime);
    const endDate = new Date(validEndTime);

    if (startDate >= endDate) {
      return responseHandler(res, 400, "Valid start time must be before valid end time");
    }

    // Create the entry
    const entry = await prisma.licensePlateEntry.create({
      data: {
        plateNo: plateNo.toUpperCase(),
        type,
        ownerName,
        validStartTime: startDate,
        validEndTime: endDate,
        userId: userId || null,
        bookingId: bookingId || null,
        notes: notes || null,
        createdBy
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    responseHandler(res, 201, "License plate entry created successfully", entry);
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Update existing license plate entry
export const updateLicensePlateEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      plateNo,
      type,
      ownerName,
      validStartTime,
      validEndTime,
      userId,
      notes,
      isActive
    } = req.body;

    // Check if entry exists
    const existingEntry = await prisma.licensePlateEntry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return responseHandler(res, 404, "License plate entry not found");
    }

    // If plateNo is being updated, check for conflicts
    if (plateNo && plateNo.toUpperCase() !== existingEntry.plateNo) {
      const conflictEntry = await prisma.licensePlateEntry.findUnique({
        where: { plateNo: plateNo.toUpperCase() }
      });

      if (conflictEntry) {
        return responseHandler(res, 400, "License plate number already exists");
      }
    }

    // Validate dates if provided
    if (validStartTime && validEndTime) {
      const startDate = new Date(validStartTime);
      const endDate = new Date(validEndTime);

      if (startDate >= endDate) {
        return responseHandler(res, 400, "Valid start time must be before valid end time");
      }
    }

    // Build update data
    const updateData: any = {};
    if (plateNo) updateData.plateNo = plateNo.toUpperCase();
    if (type) updateData.type = type;
    if (ownerName) updateData.ownerName = ownerName;
    if (validStartTime) updateData.validStartTime = new Date(validStartTime);
    if (validEndTime) updateData.validEndTime = new Date(validEndTime);
    if (userId !== undefined) updateData.userId = userId || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the entry
    const updatedEntry = await prisma.licensePlateEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    responseHandler(res, 200, "License plate entry updated successfully", updatedEntry);
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Delete license plate entry
export const deleteLicensePlateEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if entry exists
    const existingEntry = await prisma.licensePlateEntry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return responseHandler(res, 404, "License plate entry not found");
    }

    // Delete the entry
    await prisma.licensePlateEntry.delete({
      where: { id }
    });

    responseHandler(res, 200, "License plate entry deleted successfully");
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Bulk create license plate entries (for CSV import)
export const bulkCreateLicensePlateEntries = async (req: Request, res: Response) => {
  try {
    const { entries } = req.body;
    const createdBy = (req as any).user?.id;

    if (!Array.isArray(entries) || entries.length === 0) {
      return responseHandler(res, 400, "Entries array is required and cannot be empty");
    }

    const results = {
      created: 0,
      errors: [] as string[]
    };

    // Process each entry
    for (const entry of entries) {
      try {
        const {
          plateNo,
          type = LicensePlateType.ALLOW_LIST,
          ownerName,
          validStartTime,
          validEndTime,
          userId,
          notes
        } = entry;

        // Validate required fields
        if (!plateNo || !ownerName || !validStartTime || !validEndTime) {
          results.errors.push(`Entry with plate ${plateNo || 'unknown'}: Missing required fields`);
          continue;
        }

        // Check if plate already exists
        const existing = await prisma.licensePlateEntry.findUnique({
          where: { plateNo: plateNo.toUpperCase() }
        });

        if (existing) {
          results.errors.push(`Plate ${plateNo}: Already exists`);
          continue;
        }

        // Validate dates
        const startDate = new Date(validStartTime);
        const endDate = new Date(validEndTime);

        if (startDate >= endDate) {
          results.errors.push(`Plate ${plateNo}: Invalid date range`);
          continue;
        }

        // Create the entry
        await prisma.licensePlateEntry.create({
          data: {
            plateNo: plateNo.toUpperCase(),
            type,
            ownerName,
            validStartTime: startDate,
            validEndTime: endDate,
            userId: userId || null,
            notes: notes || null,
            createdBy
          }
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Plate ${entry.plateNo || 'unknown'}: ${error}`);
      }
    }

    responseHandler(res, 200, "Bulk import completed", results);
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Export license plate entries as CSV data
export const exportLicensePlateEntries = async (req: Request, res: Response) => {
  try {
    const {
      type,
      isActive = "true",
      includeExpired = "false"
    } = req.query;

    // Build where clause
    const where: any = {};
    
    if (type && Object.values(LicensePlateType).includes(type as LicensePlateType)) {
      where.type = type;
    }
    
    if (isActive !== "all") {
      where.isActive = isActive === "true";
    }

    // Exclude expired entries unless specifically requested
    if (includeExpired === "false") {
      where.validEndTime = {
        gte: new Date()
      };
    }

    // Get all entries for export
    const entries = await prisma.licensePlateEntry.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        plateNo: "asc"
      }
    });

    // Format data for CSV export
    const csvData = entries.map(entry => ({
      "Plate No.": entry.plateNo,
      "Type": entry.type,
      "Owner Name": entry.ownerName,
      "Valid Start Time": entry.validStartTime.toISOString(),
      "Valid End Time": entry.validEndTime.toISOString(),
      "User": entry.user ? `${entry.user.name} (${entry.user.email})` : "",
      "Notes": entry.notes || "",
      "Status": entry.isActive ? "Active" : "Inactive",
      "Created At": entry.createdAt.toISOString()
    }));

    responseHandler(res, 200, "License plate entries exported successfully", {
      data: csvData,
      totalCount: csvData.length,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    handleError(res, error as Error);
  }
};

// Get license plate statistics
export const getLicensePlateStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // Get counts by type and status
    const [
      totalCount,
      activeCount,
      allowListCount,
      blockListCount,
      expiredCount,
      expiringSoonCount
    ] = await Promise.all([
      prisma.licensePlateEntry.count(),
      prisma.licensePlateEntry.count({ where: { isActive: true } }),
      prisma.licensePlateEntry.count({ 
        where: { 
          type: LicensePlateType.ALLOW_LIST,
          isActive: true
        } 
      }),
      prisma.licensePlateEntry.count({ 
        where: { 
          type: LicensePlateType.BLOCK_LIST,
          isActive: true
        } 
      }),
      prisma.licensePlateEntry.count({
        where: {
          validEndTime: { lt: now },
          isActive: true
        }
      }),
      prisma.licensePlateEntry.count({
        where: {
          validEndTime: {
            gte: now,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          },
          isActive: true
        }
      })
    ]);

    const stats = {
      total: totalCount,
      active: activeCount,
      inactive: totalCount - activeCount,
      allowList: allowListCount,
      blockList: blockListCount,
      expired: expiredCount,
      expiringSoon: expiringSoonCount
    };

    responseHandler(res, 200, "License plate statistics retrieved successfully", stats);
  } catch (error) {
    handleError(res, error as Error);
  }
};