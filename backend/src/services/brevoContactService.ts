import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface ContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  attributes?: Record<string, any>;
}

export class BrevoContactService {
  private static readonly BREVO_API_URL = 'https://api.brevo.com/v3';
  private static readonly API_KEY = process.env.BREVO_API_KEY;
  
  public static async addOrUpdateContact(contactData: ContactData, listIds?: number[]): Promise<boolean> {
    try {
      const payload: any = {
        email: contactData.email,
        attributes: {
          FIRSTNAME: contactData.firstName || '',
          LASTNAME: contactData.lastName || '',
          ...(contactData.phone && { SMS: contactData.phone }),
          ...contactData.attributes,
        },
        updateEnabled: true, // Update if contact already exists
      };

      // Add to specific lists if provided
      if (listIds && listIds.length > 0) {
        payload.listIds = listIds;
      }

      await axios.post(
        `${this.BREVO_API_URL}/contacts`,
        payload,
        {
          headers: {
            'api-key': this.API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Contact ${contactData.email} added/updated successfully in Brevo`);
      return true;
    } catch (error: any) {
      // If contact already exists and updateEnabled is true, it's not an error
      if (error.response?.status === 400 && error.response?.data?.code === 'duplicate_parameter') {
        console.log(`Contact ${contactData.email} already exists in Brevo, updated successfully`);
        return true;
      }
      
      // Log detailed error information
      if (error.response?.data) {
        console.error('Brevo API Error Response:', {
          status: error.response.status,
          code: error.response.data.code,
          message: error.response.data.message,
          data: error.response.data
        });
      }
      
      console.error('Error adding/updating contact in Brevo:', error.response?.data || error.message);
      throw new Error(`Failed to add/update contact in Brevo: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a contact to marketing list for customers who opted in
   */
  public static async addToMarketingList(customerData: {
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    phone?: string;
    nationality?: string;
  }): Promise<boolean> {
    try {
      // Get marketing list ID from environment or use default
      const marketingListId = process.env.BREVO_MARKETING_LIST_ID 
        ? parseInt(process.env.BREVO_MARKETING_LIST_ID) 
        : undefined;

      const contactData: ContactData = {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
        attributes: {
          NATIONALITY: customerData.nationality || '',
          OPT_IN_DATE: new Date().toISOString(),
          SOURCE: 'Booking Engine',
        },
      };

      // Add middle name to full name if provided
      if (customerData.middleName) {
        contactData.attributes!.MIDDLENAME = customerData.middleName;
      }

      const listIds = marketingListId ? [marketingListId] : undefined;
      
      return await this.addOrUpdateContact(contactData, listIds);
    } catch (error) {
      console.error('Error adding contact to marketing list:', error);
      // Don't throw error to prevent booking failure if marketing signup fails
      return false;
    }
  }

}