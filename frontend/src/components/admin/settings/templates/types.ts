export interface Variable {
  name: string
  type: "string" | "number" | "array" | "object" | "boolean"
  example: any
  description: string
  required?: boolean
}

export interface Template {
  id?: string
  name: string
  type: string
  subject: string
  html: string
  design?: EmailDesign
  variables: Record<string, Variable>
  version: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface EmailDesign {
  version: string
  body: {
    backgroundColor: string
    fontFamily: string
    fontSize: string
    lineHeight: string
    color: string
  }
  blocks: EmailBlock[]
}

export interface EmailBlock {
  id: string
  type: "text" | "image" | "button" | "divider" | "spacer" | "columns" | "variable"
  content: any
  styles: Record<string, any>
  children?: EmailBlock[]
}

export const TEMPLATE_TYPES = {
  BOOKING_CONFIRMATION: { label: "Booking Confirmation", value: "BOOKING_CONFIRMATION" },
  RECEIPT: { label: "Receipt", value: "RECEIPT" },
  CANCELLATION: { label: "Cancellation", value: "CANCELLATION" },
  REMINDER: { label: "Reminder", value: "REMINDER" },
  WELCOME: { label: "Welcome", value: "WELCOME" },
} as const


export const BLOCK_TYPES = [
  { type: "header", label: "Header", icon: "📰" },
  { type: "text", label: "Text", icon: "📝" },
  { type: "button", label: "Button", icon: "🔘" },
  { type: "image", label: "Image", icon: "🖼️" },
  { type: "divider", label: "Divider", icon: "➖" },
  { type: "spacer", label: "Spacer", icon: "⬜" },
  { type: "footer", label: "Footer", icon: "🦶" },
]
