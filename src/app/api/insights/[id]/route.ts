import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    is_starred?: unknown
  }
  if (typeof body.is_starred !== 'boolean') {
    return NextResponse.json(
      { error: 'Body must include is_starred: boolean' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('insights')
    .update({ is_starred: body.is_starred })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id, is_starred: body.is_starred })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin
    .from('insights')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
