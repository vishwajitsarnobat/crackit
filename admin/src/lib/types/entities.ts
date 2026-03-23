/**
 * Entity Type Definitions
 * TypeScript types for all domain entities: AppRole, Centre, Batch, Course,
 * Enrollment, TeacherAssignment, Exam, Student, etc.
 * Used by client components and API response typing.
 */
export type AppRole =
    | "ceo"
    | "centre_head"
    | "teacher"
    | "accountant"
    | "student";

export type Centre = {
    id: string;
    centre_code: string;
    centre_name: string;
    address: string;
    city: string | null;
    phone: string | null;
    is_active: boolean;
};

export type Batch = {
    id: string;
    centre_id: string;
    course_id: string;
    batch_code: string;
    batch_name: string;
    academic_year: string;
    is_active: boolean;
    course_name: string;
    centre_name: string;
};

export type Course = {
    id: string;
    course_name: string;
    target_exam: string | null;
    amount: number;
    is_active: boolean;
    created_at: string;
};

export type Enrollment = {
    id: string;
    student_id: string;
    student_name: string;
    student_code: string | null;
    centre_id: string | null;
    centre_name: string | null;
    batch_id: string | null;
    batch_name: string | null;
    course_id: string | null;
    course_name: string | null;
    enrollment_date: string;
    status: "active" | "completed" | "withdrawn";
};

export type TeacherAssignment = {
    teacher_id: string;
    teacher_name: string;
    assignment_id: string | null;
    batch_id: string | null;
    batch_name: string;
    centre_id: string | null;
    subject: string | null;
    status: "assigned" | "unassigned";
};

// ── Data Entry entities ──

export type AttendanceRecord = {
    id?: string;
    student_id: string;
    student_name: string;
    student_code: string | null;
    batch_id: string;
    attendance_date: string;
    status: "present" | "absent";
};

export type Exam = {
    id: string;
    batch_id: string;
    exam_name: string;
    subject: string | null;
    exam_date: string;
    total_marks: number;
    passing_marks: number | null;
    results_published: boolean;
    created_at: string;
};

export type StudentMark = {
    id?: string;
    student_id: string;
    student_name: string;
    student_code: string | null;
    exam_id: string;
    marks_obtained: number;
    is_absent: boolean;
};

export type ContentItem = {
    id: string;
    batch_id: string;
    title: string;
    content_url: string;
    content_type: "video" | "pdf" | "notes";
    uploaded_by: string | null;
    uploader_name?: string;
    is_published: boolean;
    created_at: string;
};

export type CentreExpense = {
    id?: string;
    centre_id: string;
    month_year: string;
    category: "rent" | "electricity_bill" | "stationery" | "internet_bill" | "miscellaneous";
    amount: number;
    description: string | null;
};

export type StaffSalary = {
    id?: string;
    user_id: string;
    staff_name: string;
    centre_id: string;
    month_year: string;
    amount_due: number;
    amount_paid: number;
    status: "paid" | "unpaid" | "partial";
    payment_date: string | null;
};

export type StudentInvoice = {
    id: string;
    student_id: string;
    student_name: string;
    student_code: string | null;
    batch_id: string;
    batch_name: string;
    month_year: string;
    monthly_fee: number;
    amount_due: number;
    amount_paid: number;
    amount_discount: number;
    payment_status: "pending" | "partial" | "paid" | "overdue";
};

export type FeeTransaction = {
    id: string;
    student_invoice_id: string;
    payment_date: string;
    amount: number;
    payment_mode: "cash" | "online";
    receipt_number: string;
    created_at: string;
};

export type StaffAttendanceRecord = {
    id?: string;
    user_id: string;
    staff_name: string;
    centre_id: string;
    attendance_date: string;
    status: "present" | "absent" | "partial";
    in_time: string | null;
    out_time: string | null;
};
