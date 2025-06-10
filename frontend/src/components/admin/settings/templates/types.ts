
declare global {
  namespace ReactEmailEditor {
    interface Editor {
      loadHTML: (html: string) => void;
      setFonts: (fonts: Array<{ label: string; value: string }>) => void;
    }
  }
}

export interface Variable {
  name: string;
  type: string;
  description: string;
  example: any;
}

export interface Template {
  id?: string;
  name: string;
  type: string;
  subject: string;
  html: string;
  variables: Variable[];
  version: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  design?: string;
}

export interface TemplateFormData {
  name: string;
  type: string;
  subject: string;
  html: string;
  isActive: boolean;
}

export type TemplateType = 'BOOKING_CONFIRMATION' | 'ADMIN_NOTIFICATION' | 'PAYMENT_LINK';

export const TEMPLATE_TYPES: Record<TemplateType, { label: string; description: string }> = {
  BOOKING_CONFIRMATION: {
    label: 'Booking Confirmation',
    description: 'Sent to guests after successful booking',
  },
  ADMIN_NOTIFICATION: {
    label: 'Admin Notification',
    description: 'Sent to admins when new booking is made',
  },
  PAYMENT_LINK: {
    label: 'Payment Link',
    description: 'Sent to guests with payment link',
  },
}; 