/**
 * Manage Validation Schemas (Zod)
 * - createCentreSchema / updateCentreSchema   — centre CRUD validation
 * - createBatchSchema / updateBatchSchema     — batch CRUD validation
 * - createEnrollmentSchema / updateEnrollmentSchema — student enrollment validation
 * - assignTeacherSchema / unassignTeacherSchema     — teacher-batch assignment validation
 * - createRewardRuleSchema / updateRewardRuleSchema — reward rules and manual adjustments
 */
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
    centre_id: z.uuid("Invalid centre ID."),
    academic_year: z.string().min(4, "Academic year is required."),
});

export const updateBatchSchema = z.object({
    id: z.uuid("Invalid batch ID."),
    batch_name: z.string().min(2).optional(),
    academic_year: z.string().min(4).optional(),
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

export const modifyEnrollmentSchema = z.object({
    id: z.uuid(),
    action: z.literal("update"),
    monthly_fee: z
        .union([z.number(), z.string()])
        .transform((v) => parseFloat(v as string))
        .refine((n) => !isNaN(n) && n >= 0, "Invalid monthly fee"),
    enrollment_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.")
        .optional(),
});

export const updateStudentProfileSchema = z.object({
    student_id: z.uuid(),
    action: z.literal("update_profile"),
    full_name: z.string().min(2, "Student name must be at least 2 characters."),
    phone: z.string().trim().min(6).max(20).nullable().optional(),
    parent_name: z.string().trim().min(2).nullable().optional(),
    parent_phone: z.string().trim().min(6).max(20).nullable().optional(),
    class_level: z.coerce.number().int().min(1).max(12),
});

export const assignTeacherSchema = z.object({
    user_id: z.uuid(),
    batch_id: z.uuid(),
    subject: z.string().nullable().optional(),
    monthly_salary: z
        .union([z.number(), z.string()])
        .transform((v) => parseFloat(v as string))
        .refine((n) => !isNaN(n) && n >= 0, "Invalid monthly salary"),
    assignment_start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
});

export const unassignTeacherSchema = z.object({
    id: z.uuid(),
    action: z.literal("unassign"),
});

export const updateTeacherAssignmentSchema = z.object({
    id: z.uuid(),
    action: z.literal("update"),
    subject: z.string().nullable().optional(),
    monthly_salary: z
        .union([z.number(), z.string()])
        .transform((v) => parseFloat(v as string))
        .refine((n) => !isNaN(n) && n >= 0, "Invalid monthly salary"),
    assignment_start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.")
        .optional(),
});

export const updateTeacherProfileSchema = z.object({
    teacher_id: z.uuid(),
    action: z.literal("update_profile"),
    full_name: z.string().min(2, "Teacher name must be at least 2 characters."),
    phone: z.string().trim().min(6).max(20).nullable().optional(),
});

const attendanceRewardCriteriaSchema = z.object({
    minimum_percentage: z.coerce.number().int().min(1).max(100),
}).strict()

const perfectAttendanceRewardCriteriaSchema = z.object({
    minimum_days: z.coerce.number().int().min(1).max(31),
}).strict()

const attendanceStreakRewardCriteriaSchema = z.object({
    minimum_streak_days: z.coerce.number().int().min(2).max(31),
}).strict()

const performanceRewardCriteriaSchema = z.object({
    minimum_percentage: z.coerce.number().int().min(1).max(100),
    subject: z.string().trim().min(1).optional(),
}).strict()

const timelyFeeRewardCriteriaSchema = z.object({
    due_day_of_month: z.coerce.number().int().min(1).max(31),
    require_full_payment_by_due_date: z.boolean().default(true),
}).strict()

function parseRewardCriteria(
    triggerType: "attendance" | "perfect_attendance" | "attendance_streak" | "performance" | "timely_fee_payment",
    criteria: unknown,
) {
    if (triggerType === 'attendance') return attendanceRewardCriteriaSchema.safeParse(criteria)
    if (triggerType === 'perfect_attendance') return perfectAttendanceRewardCriteriaSchema.safeParse(criteria)
    if (triggerType === 'attendance_streak') return attendanceStreakRewardCriteriaSchema.safeParse(criteria)
    if (triggerType === 'performance') return performanceRewardCriteriaSchema.safeParse(criteria)
    return timelyFeeRewardCriteriaSchema.safeParse(criteria)
}

export const createRewardRuleSchema = z.object({
    rule_name: z.string().min(2, "Rule name must be at least 2 characters."),
    description: z.string().optional().nullable(),
    trigger_type: z.enum(["attendance", "perfect_attendance", "attendance_streak", "performance", "timely_fee_payment"]),
    award_frequency: z.literal("monthly").default("monthly"),
    scope_type: z.enum(["global", "centre", "batch"]),
    centre_id: z.uuid().optional().nullable(),
    batch_id: z.uuid().optional().nullable(),
    points_awarded: z.coerce.number().int().positive("Points must be greater than zero."),
    criteria: z.record(z.string(), z.unknown()).default({}),
    is_active: z.boolean().optional(),
}).superRefine((value, ctx) => {
    if (value.scope_type === 'global' && (value.centre_id || value.batch_id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Global rules cannot target a centre or batch.' })
    }

    if (value.scope_type === 'centre' && !value.centre_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Centre-scoped rules require a centre.' })
    }

    if (value.scope_type === 'batch' && !value.batch_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batch-scoped rules require a batch.' })
    }

    const parsedCriteria = parseRewardCriteria(value.trigger_type, value.criteria)
    if (!parsedCriteria.success) {
        for (const issue of parsedCriteria.error.issues) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: issue.message,
                path: ['criteria', ...(issue.path ?? [])],
            })
        }
    }
}).transform((value) => ({
    ...value,
    criteria: parseRewardCriteria(value.trigger_type, value.criteria).data,
}))

export const updateRewardRuleSchema = z.object({
    id: z.uuid(),
    rule_name: z.string().min(2, "Rule name must be at least 2 characters.").optional(),
    description: z.string().optional().nullable(),
    trigger_type: z.enum(["attendance", "perfect_attendance", "attendance_streak", "performance", "timely_fee_payment"]).optional(),
    award_frequency: z.literal("monthly").optional(),
    scope_type: z.enum(["global", "centre", "batch"]).optional(),
    centre_id: z.uuid().optional().nullable(),
    batch_id: z.uuid().optional().nullable(),
    points_awarded: z.coerce.number().int().positive("Points must be greater than zero.").optional(),
    criteria: z.record(z.string(), z.unknown()).optional(),
    is_active: z.boolean().optional(),
}).superRefine((value, ctx) => {
    if (value.scope_type === 'global' && (value.centre_id || value.batch_id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Global rules cannot target a centre or batch.' })
    }

    if (value.scope_type === 'centre' && !value.centre_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Centre-scoped rules require a centre.' })
    }

    if (value.scope_type === 'batch' && !value.batch_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batch-scoped rules require a batch.' })
    }

    if ((value.trigger_type && !value.criteria) || (!value.trigger_type && value.criteria)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Updating reward criteria requires trigger_type and criteria together.',
        })
    }

    if (value.trigger_type && value.criteria) {
        const parsedCriteria = parseRewardCriteria(value.trigger_type, value.criteria)
        if (!parsedCriteria.success) {
            for (const issue of parsedCriteria.error.issues) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: issue.message,
                    path: ['criteria', ...(issue.path ?? [])],
                })
            }
        }
    }
}).transform((value) => ({
    ...value,
    criteria: value.trigger_type && value.criteria
        ? parseRewardCriteria(value.trigger_type, value.criteria).data
        : value.criteria,
}))

export const executeRewardRuleSchema = z.object({
    rule_id: z.uuid(),
    month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
})

export const previewRewardRuleSchema = z.object({
    rule_id: z.uuid(),
    month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    limit: z.coerce.number().int().min(1).max(25).optional(),
})

export const rewardExecutionQuerySchema = z.object({
    rule_id: z.uuid().optional(),
    status: z.enum(["running", "success", "partial", "failed"]).optional(),
    month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const manualRewardAdjustmentSchema = z.object({
    student_id: z.uuid(),
    points_delta: z.coerce.number().int().refine((value) => value !== 0, 'Points delta cannot be zero.'),
    description: z.string().min(3, 'Description is required.'),
})
