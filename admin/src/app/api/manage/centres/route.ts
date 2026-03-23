/**
 * Centre Management API
 * GET   — Returns all centres (CEO) or assigned centres (centre_head)
 * POST  — Creates a new centre with auto centre-head assignment
 * PATCH — Updates centre details or toggles is_active (CEO only)
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAuth, apiSuccess, apiError } from '@/lib/api/api-helpers'
import { createCentreSchema, updateCentreSchema } from '@/lib/validations/manage'

export const GET = withAuth(async (request, ctx) => {
    const supabase = await createClient()

    let query = supabase.from('centres').select('*').order('centre_name')

    if (ctx.profile.role === 'centre_head') {
        if (ctx.profile.centreIds.length === 0) return apiSuccess({ centres: [] })
        query = query.in('id', ctx.profile.centreIds)
    }

    const { data, error } = await query
    if (error) return apiError(error.message, 500)

    return apiSuccess({ centres: data ?? [] })
}, ['ceo', 'centre_head'])

export const POST = withAuth(async (request, ctx) => {
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

    if (ctx.profile.role === 'centre_head') {
        await adminClient.from('user_centre_assignments').insert({
            user_id: ctx.user.id,
            centre_id: data.id,
            is_active: true
        })
    }

    return apiSuccess({ centre: data })
}, ['ceo', 'centre_head'])

export const PATCH = withAuth(async (request, ctx) => {
    const body = await request.json()
    const parsed = updateCentreSchema.safeParse(body)

    if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { id, centre_name, address, city, phone, is_active } = parsed.data

    const supabase = await createClient()

    if (ctx.profile.role === 'centre_head') {
        const { data: assignment } = await supabase
            .from('user_centre_assignments')
            .select('id')
            .eq('user_id', ctx.user.id)
            .eq('centre_id', id)
            .eq('is_active', true)
            .single()
        
        if (!assignment) {
            return apiError('You are not authorized to edit this centre.', 403)
        }
    }

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
}, ['ceo', 'centre_head'])
