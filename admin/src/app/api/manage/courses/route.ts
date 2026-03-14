import { createClient } from '@/lib/supabase/server'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createCourseSchema, updateCourseSchema } from '@/lib/validations/manage'

export const GET = withAuth(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase.from('courses').select('*').order('course_name')
    if (error) return apiError(error.message, 500)

    return apiSuccess({ courses: data ?? [] })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request) => {
    const body = await request.json()
    const parsed = createCourseSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { course_name, target_exam } = parsed.data

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('courses')
        .insert({ course_name: course_name.trim(), target_exam: target_exam?.trim() || null })
        .select()
        .single()

    if (error) return apiError(error.message, 400)
    return apiSuccess({ course: data })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request) => {
    const body = await request.json()
    const parsed = updateCourseSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, course_name, target_exam, is_active } = parsed.data

    const supabase = await createClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    if (course_name !== undefined) updates.course_name = course_name.trim()
    if (target_exam !== undefined) updates.target_exam = target_exam?.trim() || null
    if (is_active !== undefined) updates.is_active = is_active

    const { error } = await supabase.from('courses').update(updates).eq('id', id)
    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true })
}, ['ceo', 'centre_head'])
