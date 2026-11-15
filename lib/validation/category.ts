import { z } from "zod";
import { CATEGORY_KINDS, TAX_SECTIONS } from "@/types/models";
import { hexColorSchema } from "./common";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(50, "Keep it under 50 characters"),
  kind: z.enum(CATEGORY_KINDS).default("expense"),
  icon: z.string().trim().max(50).optional(),
  color: hexColorSchema.optional(),
  defaultTaxSection: z.enum(TAX_SECTIONS).default("none"),
});

export type CreateCategoryInput = z.output<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .partial()
  .extend({ isArchived: z.boolean().optional(), sortOrder: z.number().int().min(0).max(100000).optional() })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
