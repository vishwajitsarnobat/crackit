import {z} from "zod";

export const createCentreSchema = z.object({
    centre_code: z.string().min(1, "Centre code is required."),
    centre_name: z
        .string()
        .min(2, "Centre name must be at least 2 characters."),
    address: z.string().min(5, "Address must be at least 5 characters."),
    city: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
});

export const updateCentreSchema = z.object({
    id: z.uuid("Invalid centre ID."),
    centre_name: z.string().min(2).optional(),
    address: z.string().min(5).optional(),
    city: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
});

export const createBatchSchema = z.object({
    batch_code: z.string().min(1, "Batch code is required."),
    batch_name: z.string().min(2, "Batch name must be at least 2 characters."),
    course_id: z.uuid("Invalid course ID."),
    centre_id: z.uuid("Invalid centre ID."),
    academic_year: z.string().min(4, "Academic year is required."),
});

export const updateBatchSchema = z.object({
    id: z.uuid("Invalid batch ID."),
    batch_name: z.string().min(2).optional(),
    course_id: z.uuid("Invalid course ID.").optional(),
    academic_year: z.string().min(4).optional(),
    is_active: z.boolean().optional(),
});

export const createCourseSchema = z.object({
    course_name: z
        .string()
        .min(2, "Course name must be at least 2 characters."),
    target_exam: z.string().optional().nullable(),
});

export const updateCourseSchema = z.object({
    id: z.uuid("Invalid course ID."),
    course_name: z.string().min(2).optional(),
    target_exam: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
});

export const createEnrollmentSchema = z.object({
    student_id: z.uuid(),
    batch_id: z.uuid(),
    enrollment_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    monthly_fee: z
        .union([z.number(), z.string()])
        .transform((v) => parseFloat(v as string))
        .refine((n) => !isNaN(n) && n >= 0, "Invalid monthly fee"),
});

export const updateEnrollmentSchema = z.object({
    id: z.uuid(),
    status: z.enum(["active", "withdrawn"]),
});

export const assignTeacherSchema = z.object({
    user_id: z.uuid(),
    batch_id: z.uuid(),
    subject: z.string().nullable().optional(),
});

export const unassignTeacherSchema = z.object({
    id: z.uuid(),
    action: z.literal("unassign"),
});
