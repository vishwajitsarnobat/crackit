/**
 * Entity Type Definitions
 * TypeScript types for all domain entities: AppRole, Centre, Batch,
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
    batch_code: string;
    batch_name: string;
    academic_year: string;
    is_active: boolean;
    centre_name: string;
};

export type TaskBatchOption = {
    id: string;
    batch_name: string;
    batch_code: string;
    centre_name: string;
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
    enrollment_date: string;
    status: "active" | "completed" | "withdrawn";
};

export type StudentEnrollmentAssignment = {
    enrollment_id: string;
    batch_id: string;
    batch_name: string;
    centre_id: string | null;
    centre_name: string | null;
    enrollment_date: string;
    monthly_fee: number;
    status: "active" | "withdrawn";
};

export type StudentEnrollmentProfile = {
    student_id: string;
    student_name: string;
    student_code: string | null;
    phone: string | null;
    parent_name: string | null;
    parent_phone: string | null;
    class_level: number | null;
    centre_ids: string[];
    assignments: StudentEnrollmentAssignment[];
    total_monthly_fee: number;
    assignment_count: number;
    status: "assigned" | "unassigned";
};

export type TeacherAssignment = {
    teacher_id: string;
    teacher_name: string;
    assignment_id: string | null;
    batch_id: string | null;
    batch_name: string;
    centre_name: string | null;
    centre_id: string | null;
    subject: string | null;
    monthly_salary: number | null;
    assignment_start_date: string | null;
    assignment_end_date: string | null;
    status: "assigned" | "unassigned";
};

export type TeacherEnrollmentProfile = {
    teacher_id: string;
    teacher_name: string;
    phone: string | null;
    centre_ids: string[];
    assignments: TeacherAssignment[];
    total_monthly_salary: number;
    assignment_count: number;
    status: "assigned" | "unassigned";
};

export type RewardRuleCriteria =
    | { minimum_percentage: number }
    | { minimum_days: number }
    | { minimum_streak_days: number }
    | { minimum_percentage: number; subject?: string }
    | { due_day_of_month: number; require_full_payment_by_due_date: boolean };

export type RewardRule = {
    id: string;
    rule_name: string;
    description: string | null;
    trigger_type: "attendance" | "perfect_attendance" | "attendance_streak" | "performance" | "timely_fee_payment";
    award_frequency: "monthly";
    scope_type: "global" | "centre" | "batch";
    centre_id: string | null;
    batch_id: string | null;
    points_awarded: number;
    criteria: RewardRuleCriteria;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    executions?: RewardRuleExecution[];
};

export type RewardRuleExecution = {
    id: string;
    reward_rule_id: string;
    run_month: string;
    status: "running" | "success" | "partial" | "failed";
    eligible_count: number;
    awarded_count: number;
    skipped_count: number;
    failed_count: number;
    started_at: string;
    completed_at: string | null;
    triggered_by: string | null;
    error_message: string | null;
    metadata: Record<string, unknown>;
};

export type RewardLedgerEntry = {
    id: string;
    student_id: string;
    points: number;
    reason:
        | "rule_award"
        | "manual_adjustment"
        | "manual_deduction"
        | "redeemed"
        | "redeemed_reversal";
    description: string | null;
    reward_rule_id: string | null;
    reference_id: string | null;
    month_year: string | null;
    created_by: string | null;
    created_at: string;
};

export type RewardRuleAward = {
    id: string;
    reward_rule_id: string;
    student_id: string;
    points_transaction_id: string;
    award_key: string;
    source_month: string | null;
    source_reference_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
};

export type RewardStudentSummary = {
    student_id: string;
    student_name: string;
    student_code: string | null;
    current_points: number;
    batch_names: string[];
    centre_ids: string[];
};

// ── Task entities ──

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
    content_type: "video" | "document";
    remarks: string | null;
    uploaded_by: string | null;
    uploader_name?: string;
    is_published: boolean;
    created_at: string;
};

export type CentreExpense = {
    id: string;
    centre_id: string;
    month_year: string;
    category: "rent" | "electricity_bill" | "stationery" | "internet_bill" | "miscellaneous";
    amount: number;
    description: string | null;
    entered_by: string | null;
    entered_by_name?: string | null;
    created_at: string;
};

export type StaffSalary = {
    id: string;
    user_id: string;
    staff_name: string;
    centre_id: string;
    month_year: string;
    amount_due: number;
    amount_paid: number;
    status: "paid" | "unpaid" | "partial";
    payment_date: string | null;
    assignment_snapshot: Array<{
        assignment_id: string;
        batch_id: string;
        batch_name: string;
        subject: string | null;
        monthly_salary: number;
        assignment_start_date: string;
        assignment_end_date: string | null;
    }>;
};

export type StaffSalaryPayment = {
    id: string;
    staff_salary_id: string;
    payment_date: string;
    amount: number;
    description: string | null;
    recorded_by: string | null;
    recorded_by_name?: string | null;
    created_at: string;
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
    current_points: number;
    payable_amount: number;
    payment_status: "pending" | "partial" | "paid" | "overdue";
};

export type FeeTransaction = {
    id: string;
    student_invoice_id: string;
    payment_date: string;
    amount: number;
    payment_mode: "cash" | "online";
    collected_by?: string | null;
    collected_by_name?: string | null;
    receipt_number: string;
    created_at: string;
};

export type InvoiceRewardAllocation = {
    id: string;
    student_invoice_id: string;
    points_transaction_id: string | null;
    allocation_amount: number;
    created_by: string | null;
    created_by_name?: string | null;
    created_at: string;
    points_reason?: "rule_award" | "manual_adjustment" | "manual_deduction" | "redeemed" | "redeemed_reversal" | null;
    points_description?: string | null;
    points_month_year?: string | null;
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
