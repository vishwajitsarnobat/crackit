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
