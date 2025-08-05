import prisma from '../prisma';

interface LicensePlateExportData {
  plateNo: string;
  type: 'ALLOW_LIST' | 'BLOCK_LIST';
  ownerName: string;
  validStartTime: string;
  validEndTime: string;
}

export class LicensePlateExportService {
  /**
   * Get all license plate entries for export
   */
  static async getLicensePlateData(): Promise<LicensePlateExportData[]> {
    try {
      const entries = await prisma.licensePlateEntry.findMany({
        where: {
          isActive: true
        },
        select: {
          plateNo: true,
          type: true,
          ownerName: true,
          validStartTime: true,
          validEndTime: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Convert Date fields to string for LicensePlateExportData
      const formattedEntries = entries.map(entry => ({
        ...entry,
        validStartTime: entry.validStartTime ? entry.validStartTime.toISOString() : '',
        validEndTime: entry.validEndTime ? entry.validEndTime.toISOString() : ''
      }));

      return formattedEntries;
    } catch (error) {
      console.error('Failed to fetch license plate data for export:', error);
      return [];  
    }
  }

  /**
   * Convert license plate data to CSV format
   */
  static convertToCSV(data: LicensePlateExportData[]): string {
    if (!data.length) {
      return 'No license plate entries found\n';
    }

    // CSV headers
    const headers = ['Plate No.', 'Type', 'Owner Name', 'Valid Start Time(DD/MM/YYYY hh:mm)', 'Valid End Time(DD/MM/YYYY hh:mm)'];

    // Format dates to DD/MM/YYYY hh:mm format
    const formatDateForCSV = (dateString: string) => {
      if (!dateString) {
        return 'N/A';
      }

      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formatted = `${day}/${month}/${year} ${hours}:${minutes}`;
        return formatted;
      } catch (error) {
        return 'Error';
      }
    };

    // Helper function to escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    // Add data rows
    data.forEach((row) => {
      const plateNo = row.plateNo || '';
      const type = row.type === 'ALLOW_LIST' ? 'Allow List' : 'Block List';
      const ownerName = row.ownerName || '';
      const validStartTime = formatDateForCSV(row.validStartTime);
      const validEndTime = formatDateForCSV(row.validEndTime);

      const csvRow = [
        escapeCSV(plateNo),
        escapeCSV(type),
        escapeCSV(ownerName),
        escapeCSV(validStartTime),
        escapeCSV(validEndTime)
      ].join(',');

      csvContent += csvRow + '\n';
    });

    return csvContent;
  }

  /**
   * Create CSV attachment for email
   */
  static async createCSVAttachment(): Promise<{ content: string; name: string; type: string }> {
    try {
      const data = await this.getLicensePlateData();
      const csvContent = this.convertToCSV(data);
      
      // Convert to base64 for email attachment
      const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64');
      
      const today = new Date().toISOString().split('T')[0];
      const filename = `license_plates_${today}.csv`;

      return {
        content: base64Content,
        name: filename,
        type: 'text/csv'
      };
    } catch (error) {
      console.error('Failed to create CSV attachment:', error);
      throw new Error('Failed to create license plate export');
    }
  }

  /**
   * Delete expired license plates based on configurable expiry days
   */
  static async deleteExpiredLicensePlates(): Promise<void> {
    try {
      // Get settings to determine expiry days
      const settings = await prisma.generalSettings.findFirst();
      const expiryDays = settings?.licensePlateExpiryDays || 30;

      // Calculate the cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

      // Delete expired plates that are inactive and past the expiry period
      const deletedPlates = await prisma.licensePlateEntry.deleteMany({
        where: {
          validEndTime: {
            lt: cutoffDate
          },
          isActive: false // Only delete plates that are already inactive
        }
      });

      if (deletedPlates.count > 0) {
        console.log(`[License Plate Cleanup] Deleted ${deletedPlates.count} expired license plates older than ${expiryDays} days`);
      }
    } catch (error) {
      console.error('[License Plate Cleanup] Failed to delete expired license plates:', error);
    }
  }
}