import { z } from "zod";

// Payment Structure enum validation
const PaymentStructureEnum = z.enum(["FULL_PAYMENT", "SPLIT_PAYMENT"]);

// Cancellation Policy enum validation
const CancellationPolicyEnum = z.enum(["FLEXIBLE", "MODERATE", "STRICT", "NON_REFUNDABLE"]);

export const createRatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  nightlyRate: z.number().min(0).optional(),
  isActive: z.boolean().optional().default(true),
  refundable: z.boolean().optional(),
  discountPercentage: z.number().min(0).optional(),
  prepayPercentage: z.number().min(0).optional(),
  fullPaymentDays: z.number().min(0).optional(),
  changeAllowedDays: z.number().min(0).optional(),
  rebookValidityDays: z.number().min(0).optional(),
  
  // New fields for flexible rate management
  paymentStructure: PaymentStructureEnum.optional().default("FULL_PAYMENT"),
  cancellationPolicy: CancellationPolicyEnum.optional().default("FLEXIBLE"),
}).refine((data) => {
  // Validate policy constraints within the schema
  const { paymentStructure, cancellationPolicy } = data;
  
  // All combinations are valid for now, but we can add restrictions here if needed
  const allowedCombinations = [
    { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "FLEXIBLE" },
    { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "MODERATE" },
    { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "STRICT" },
    { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "NON_REFUNDABLE" },
    { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "FLEXIBLE" },
    { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "MODERATE" },
    { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "STRICT" },
    { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "NON_REFUNDABLE" },
  ];
  
  return allowedCombinations.some(combo => 
    combo.paymentStructure === paymentStructure && 
    combo.cancellationPolicy === cancellationPolicy
  );
}, {
  message: "Invalid payment structure and cancellation policy combination",
});

export const updateRatePolicySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  nightlyRate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  refundable: z.boolean().optional(),
  prepayPercentage: z.number().min(0).optional(),
  fullPaymentDays: z.number().min(0).optional(),
  changeAllowedDays: z.number().min(0).optional(),
  rebookValidityDays: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).optional(),
  
  // New fields for flexible rate management
  paymentStructure: PaymentStructureEnum.optional(),
  cancellationPolicy: CancellationPolicyEnum.optional(),
}).refine((data) => {
  // Only validate if both fields are provided
  if (data.paymentStructure && data.cancellationPolicy) {
    const allowedCombinations = [
      { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "FLEXIBLE" },
      { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "MODERATE" },
      { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "STRICT" },
      { paymentStructure: "FULL_PAYMENT", cancellationPolicy: "NON_REFUNDABLE" },
      { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "FLEXIBLE" },
      { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "MODERATE" },
      { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "STRICT" },
      { paymentStructure: "SPLIT_PAYMENT", cancellationPolicy: "NON_REFUNDABLE" },
    ];
    
    return allowedCombinations.some(combo => 
      combo.paymentStructure === data.paymentStructure && 
      combo.cancellationPolicy === data.cancellationPolicy
    );
  }
  return true; // If not both fields provided, allow the update
}, {
  message: "Invalid payment structure and cancellation policy combination",
});

// Export the enum types for use in other files
export { PaymentStructureEnum, CancellationPolicyEnum };


