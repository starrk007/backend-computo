import { z } from 'zod'

export const listRolesQuerySchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10)
})

export const roleIdParamSchema = z.object({
  id: z.string().min(1, 'El id es obligatorio')
})

export const createRoleSchema = z.object({
  id: z.string().optional(),
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z
    .string()
    .optional()
    .nullable(),
  permissions: z
    .array(z.string())
    .optional()
    .default([])
})

export const updateRoleSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  descripcion: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar'
})