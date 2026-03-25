/**
 * Task Validation Schemas (Zod)
 * Schemas for: saveAttendance, createExam, saveMarks, togglePublish,
 * createContent, updateContent, saveExpenses, saveSalaries,
 * createInvoice, recordPayment, updateDiscount, saveStaffAttendance
 */
import { z } from "zod";

// ── Attendance ──

export const saveAttendanceSchema = z.object({
    batch_id: z.string().uuid(),
    attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    records: z.array(
        z.object({
            student_id: z.string().uuid(),
            status: z.enum(["present", "absent"]),
        })
    ).min(1, "At least one record required."),
});

// ── Exams & Marks ──

export const createExamSchema = z.object({
    batch_id: z.string().uuid(),
    exam_name: z.string().min(2, "Exam name is required."),
    subject: z.string().optional().nullable(),
    exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    total_marks: z.coerce.number().positive("Total marks must be positive."),
    passing_marks: z.coerce.number().min(0).optional().nullable(),
});

export const saveMarksSchema = z.object({
    exam_id: z.string().uuid(),
    marks: z.array(
        z.object({
            student_id: z.string().uuid(),
            marks_obtained: z.coerce.number().min(0),
            is_absent: z.boolean().default(false),
        })
    ).min(1, "At least one mark entry required."),
});

export const togglePublishSchema = z.object({
    exam_id: z.string().uuid(),
    results_published: z.boolean(),
});

const contentUrlSchema = z.string().url("Must be a valid URL.").refine((value) => {
    try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return false
    }
}, "Only http and https links are allowed.")

// ── Content ──

export const createContentSchema = z.object({
    batch_id: z.string().uuid(),
    title: z.string().min(2, "Title is required."),
    content_url: contentUrlSchema,
    content_type: z.enum(["video", "document"]),
    remarks: z.string().optional().nullable(),
});

export const updateContentSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(2).optional(),
    content_url: contentUrlSchema.optional(),
    content_type: z.enum(["video", "document"]).optional(),
    remarks: z.string().optional().nullable(),
    is_published: z.boolean().optional(),
});

// ── Expenses ──

export const saveExpensesSchema = z.object({
    centre_id: z.string().uuid(),
    month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    expenses: z.array(
        z.object({
            category: z.enum(["rent", "electricity_bill", "stationery", "internet_bill", "miscellaneous"]),
            amount: z.coerce.number().refine((value) => value !== 0, "Amount cannot be zero."),
            description: z.string().optional().nullable(),
        })
    ).min(1, "At least one expense required."),
});

// ── Salaries ──

export const saveSalariesSchema = z.object({
    centre_id: z.string().uuid(),
    month_year: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    salaries: z.array(
        z.object({
            salary_id: z.string().uuid(),
            target_paid_amount: z.coerce.number().min(0),
            payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
            description: z.string().optional().nullable(),
        })
    ).min(1, "At least one salary record required."),
});

// ── Fee Management ──

export const recordPaymentSchema = z.object({
    student_invoice_id: z.string().uuid(),
    amount: z.coerce.number().positive("Payment amount must be positive."),
    payment_mode: z.enum(["cash", "online"]),
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").optional().nullable(),
});

export const updateDiscountSchema = z.object({
    student_id: z.string().uuid(),
    target_discount_total: z.coerce.number().int().min(0),
});

// ── Staff Attendance ──

export const saveStaffAttendanceSchema = z.object({
    centre_id: z.string().uuid(),
    attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
    records: z.array(
        z.object({
            user_id: z.string().uuid(),
            status: z.enum(["present", "absent", "partial"]),
            in_time: z.string().optional().nullable(),
            out_time: z.string().optional().nullable(),
        })
    ).min(1, "At least one record required."),
}).superRefine((value, ctx) => {
    for (const [index, record] of value.records.entries()) {
        if (record.status === 'partial' && (!record.in_time || !record.out_time)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['records', index],
                message: 'Partial staff attendance requires both in_time and out_time.',
            })
        }
    }
});
