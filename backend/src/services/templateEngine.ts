import prisma from '../prisma';
import Handlebars from 'handlebars';

interface RenderOptions {
  templateType: string;
  data: any;
}

class TemplateEngine {
  private static instance: TemplateEngine;
  private templateCache: Map<string, any>;

  private constructor() {
    this.templateCache = new Map();
    this.registerHelpers();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  private registerHelpers() {
    // Register custom Handlebars helpers
    Handlebars.registerHelper('formatDate', function(date: string | Date) {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    Handlebars.registerHelper('formatCurrency', function(amount: number, currency: string) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });

    Handlebars.registerHelper('or', function(...args: any[]) {
      return args.slice(0, -1).some(Boolean);
    });

    Handlebars.registerHelper('and', function(...args: any[]) {
      return args.slice(0, -1).every(Boolean);
    });

    Handlebars.registerHelper('toUpperCase', function(str: string) {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('toLowerCase', function(str: string) {
      return str.toLowerCase();
    });

    Handlebars.registerHelper('concat', function(...args: any[]) {
      return args.slice(0, -1).join('');
    });

    Handlebars.registerHelper('ternary', function(condition: boolean, yes: any, no: any) {
      return condition ? yes : no;
    });
  }

  private async getTemplate(type: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    const cachedTemplate = this.templateCache.get(type);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    // Get active template from database
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

    // Compile template and cache it
    const compiled = Handlebars.compile(template.html);
    this.templateCache.set(type, compiled);

    return compiled;
  }

  public async render({ templateType, data }: RenderOptions): Promise<{
    subject: string;
    html: string;
  }> {
    try {
      // Get template from database
      const template = await prisma.emailTemplate.findFirst({
        where: {
          type: templateType,
          isActive: true,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!template) {
        throw new Error(`No active template found for type: ${templateType}`);
      }

      // Compile and render subject
      const subjectTemplate = Handlebars.compile(template.subject);
      const subject = subjectTemplate(data);

      // Get or compile HTML template
      const htmlTemplate = await this.getTemplate(templateType);
      const html = htmlTemplate(data);

      return { subject, html };
    } catch (error) {
      console.error('Error rendering template:', error);
      throw error;
    }
  }

  public clearCache() {
    this.templateCache.clear();
  }
}

export default TemplateEngine.getInstance(); 