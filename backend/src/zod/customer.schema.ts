import z from "zod";

export const customerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  passportExpiry: z.string().optional().nullable(),
  anniversaryDate: z.string().optional().nullable(),
  vipStatus: z.boolean(),
  email: z.string().email(), 
  phone: z.string(),
  nationality: z.string(),
  totalNigthsStayed: z.number().optional().nullable(),
  favoriteItems: z.any().optional().nullable(),
  totalMoneySpent: z.number().optional().nullable(),
  city: z.string().optional().nullable(),
  placeOfBirth: z.string().optional().nullable(),
  passportIssuedCountry: z.string().optional().nullable(),
  receiveMarketingEmail: z.boolean().optional().nullable(),
  carNumberPlate: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHERS"]),
  adminNotes: z.string().optional().nullable()
});

export const updateCustomerSchema = customerSchema.partial();
