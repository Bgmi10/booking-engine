import z from "zod";

export const createOrderItemScheme = z.object({
    name: z.string(),
    description: z.string(),
    price: z.number(),
    tax: z.number(),
    imageUrl: z.string().optional(),
    role: z.enum(["ANY", "KITCHEN", "WAITER"])
});

export const updateOrderItemsScheme = createOrderItemScheme.partial();