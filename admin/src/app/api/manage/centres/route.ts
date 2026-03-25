/**
 * Centre Management API
 * GET   — Returns all centres for CEO use
 * POST  — Creates a new centre
 * PATCH — Updates centre details or toggles is_active (CEO only)
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createCentreSchema, updateCentreSchema } from '@/lib/validations/manage'

export const GET = withAuth(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase.from('centres').select('*').order('centre_name')
    if (error) return apiError(error.message, 500)

    return apiSuccess({ centres: data ?? [] })
}, ['ceo'])

export const POST = withAuth(async (request) => {
    const body = await request.json()
    const parsed = createCentreSchema.safeParse(body)
    
    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { centre_code, centre_name, address, city, phone } = parsed.data

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('centres')
        .insert({
            centre_code: centre_code.trim(),
            centre_name: centre_name.trim(),
            address: address.trim(),
            city: city?.trim() || null,
            phone: phone?.trim() || null
        })
        .select()
        .single()

    if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('unique constraint') || msg.includes('duplicate key') || msg.includes('centres_centre_code_key')) {
            return apiError('A centre with this code already exists. Please use a different code.', 400)
        }
        return apiError(error.message, 400)
    }

    return apiSuccess({ centre: data })
}, ['ceo'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateCentreSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, centre_name, address, city, phone, is_active } = parsed.data

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (centre_name !== undefined) updates.centre_name = centre_name.trim()
    if (address !== undefined) updates.address = address.trim()
    if (city !== undefined) updates.city = city?.trim() || null
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (is_active !== undefined && ctx.profile.role === 'ceo') updates.is_active = is_active

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from('centres').update(updates).eq('id', id).select().single()
    
    if (error) return apiError(error.message, 400)

    return apiSuccess({ ok: true, centre: data })
}, ['ceo'])
