import { z } from "zod";
type WithoutDefault<T extends z.ZodType> =
  T extends z.ZodDefault<infer U extends z.ZodType> ? U : T;
// Zod 4 applies defaults inside optional fields. PATCH must preserve omitted keys.
export const patchObject = <T extends Record<string, z.ZodType>>(
  schema: z.ZodObject<T>,
) => {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      z.optional(field instanceof z.ZodDefault ? field.removeDefault() : field),
    ]),
  ) as { [K in keyof T]: z.ZodOptional<WithoutDefault<T[K]>> };
  return z.object(shape);
};
