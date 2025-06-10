import axios from 'axios';
import prisma from '../prisma';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  to: { email: string; name: string };
  subject: string;
  templateType: string;
  templateData: Record<string, any>;
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

  public static async sendEmail({ to, templateType, templateData }: EmailOptions) {
    try {
      // Get template from database
      const template = await this.getTemplate(templateType);

      // Compile subject and body
      const compiledSubject = this.compileTemplate(template.subject, templateData);
      const compiledHtml = this.compileTemplate(template.html, templateData);

      // Send email using Brevo
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'La Torre sulla via Francigena',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [to],
          subject: compiledSubject,
          htmlContent: compiledHtml,
        },
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
} 