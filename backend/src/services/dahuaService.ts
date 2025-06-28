import axios from 'axios';
import prisma from '../prisma';

interface DahuaConfig {
  apiUrl: string;
  username: string;
  password: string;
  gateId: string;
}

interface LicensePlateData {
  plateNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestName: string;
  bookingId: string;
}

class DahuaService {
  private config: DahuaConfig | null = null;

  async initialize() {
    try {
      const settings = await prisma.generalSettings.findFirst();
      if (settings?.dahuaIsEnabled && settings.dahuaApiUrl && settings.dahuaUsername && settings.dahuaPassword) {
        this.config = {
          apiUrl: settings.dahuaApiUrl,
          username: settings.dahuaUsername,
          password: settings.dahuaPassword,
          gateId: settings.dahuaGateId || '1'
        };
        console.log('Dahua service initialized successfully');
      } else {
        console.log('Dahua integration is disabled or not configured');
      }
    } catch (error) {
      console.error('Failed to initialize Dahua service:', error);
    }
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    if (!this.config) {
      throw new Error('Dahua service not initialized');
    }

    try {
      const url = `${this.config.apiUrl}${endpoint}`;
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      
      const response = await axios({
        method,
        url,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        data,
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.error(`Dahua API request failed: ${endpoint}`, error.response?.data || error.message);
      throw new Error(`Dahua API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async addLicensePlate(licensePlateData: LicensePlateData): Promise<boolean> {
    try {
      if (!this.config) {
        console.log('Dahua integration disabled, skipping license plate addition');
        return false;
      }

      const payload = {
        plateNumber: licensePlateData.plateNumber.toUpperCase(),
        startTime: licensePlateData.checkInDate.toISOString(),
        endTime: licensePlateData.checkOutDate.toISOString(),
        guestName: licensePlateData.guestName,
        bookingId: licensePlateData.bookingId,
        gateId: this.config.gateId,
        action: 'allow'
      };

      await this.makeRequest('/api/license-plate/add', 'POST', payload);
      
      console.log(`License plate ${licensePlateData.plateNumber} added successfully for booking ${licensePlateData.bookingId}`);
      return true;
    } catch (error) {
      console.error('Failed to add license plate to Dahua camera:', error);
      return false;
    }
  }

  async removeLicensePlate(plateNumber: string, bookingId: string): Promise<boolean> {
    try {
      if (!this.config) {
        console.log('Dahua integration disabled, skipping license plate removal');
        return false;
      }

      const payload = {
        plateNumber: plateNumber.toUpperCase(),
        bookingId: bookingId,
        gateId: this.config.gateId,
        action: 'remove'
      };

      await this.makeRequest('/api/license-plate/remove', 'POST', payload);
      
      console.log(`License plate ${plateNumber} removed successfully for booking ${bookingId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove license plate from Dahua camera:', error);
      return false;
    }
  }

  async getLicensePlateStatus(plateNumber: string): Promise<any> {
    try {
      if (!this.config) {
        throw new Error('Dahua service not initialized');
      }

      const response = await this.makeRequest(`/api/license-plate/status?plate=${plateNumber.toUpperCase()}`);
      return response;
    } catch (error) {
      console.error('Failed to get license plate status:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) {
        return false;
      }

      await this.makeRequest('/api/system/status');
      return true;
    } catch (error) {
      console.error('Dahua connection test failed:', error);
      return false;
    }
  }
}

export const dahuaService = new DahuaService(); 