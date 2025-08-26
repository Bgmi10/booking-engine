import axios from 'axios';
import prisma from '../prisma';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';

dotenv.config();

// Register Handlebars helpers
Handlebars.registerHelper('gt', function(a: number, b: number) {
  return a > b;
});

interface EmailOptions {
  to: { email: string; name: string };
  subject?: string;
  templateType: string;
  templateData: Record<string, any>;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  content: string; // Base64 encoded content
  name: string;    // File name
  type?: string;   // MIME type
}

export class EmailService {
  private static async getTemplate(type: string) {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!template) {
      throw new Error(`No active template found for type: ${type}`);
    }

    return template;
  }

  private static compileTemplate(template: string, data: Record<string, any>) {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }

  /**
   * Fetch PDF from URL and convert to base64 for email attachment
   */
  private static async fetchPdfAsBase64(url: string): Promise<string> {
    try {
      console.log(`Fetching PDF from: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': 'application/pdf',
          'User-Agent': 'EmailService/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch PDF: HTTP ${response.status}`);
      }

      // Convert arraybuffer to base64
      const base64 = Buffer.from(response.data).toString('base64');
      console.log(`PDF fetched successfully, size: ${base64.length} chars`);
      
      return base64;
    } catch (error: any) {
      console.error('Error fetching PDF:', error.message);
      throw new Error(`Failed to fetch PDF from URL: ${error.message}`);
    }
  }

  public static async sendEmail({ to, templateType, templateData, attachments = [] }: EmailOptions) {
    try {
      const template = await this.getTemplate(templateType);

      // Compile subject and body
      const compiledSubject = this.compileTemplate(template.subject, templateData); 
      const compiledHtml = this.compileTemplate(template.html, templateData);

      // Prepare email payload
      const emailPayload: any = {
        sender: {
          name: 'La Torre sulla via Francigena',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [to],
        subject: compiledSubject,
        htmlContent: compiledHtml,
      };

      // Add attachments if provided
      if (attachments.length > 0) {
        emailPayload.attachment = attachments.map(att => ({
          content: att.content,
          name: att.name,
          type: att.type || 'application/pdf'
        }));
      }

      // Send email using Brevo
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        emailPayload,
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Email sent successfully to ${to.email} using template: ${templateType}`);
      return true;
    } catch (error: any) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Helper method to create PDF attachment from URL
   */
  public static async createPdfAttachment(url: string, filename: string): Promise<EmailAttachment> {
    const base64Content = await this.fetchPdfAsBase64(url);
    
    return {
      content: base64Content,
      name: filename,
      type: 'application/pdf'
    };
  }
}