import { z } from "zod";

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(150),

  website: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional(),

  industry: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

export const companyIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCompanyInput = z.infer<
  typeof createCompanySchema
>;