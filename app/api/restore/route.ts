import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateBackupData } from '@/lib/backup'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện khôi phục dữ liệu nha! (◕‿◕✿)' },
        { status: 401 }
      )
    }

    const payload = await req.json()
    const validation = validateBackupData(payload)

    if (!validation.valid || !validation.parsed) {
      return NextResponse.json(
        { error: validation.error || 'Dữ liệu sao lưu không hợp lệ.' },
        { status: 400 }
      )
    }

    // Call transactional restore RPC
    const { data, error } = await supabase.rpc('restore_user_data', {
      p_user_id: user.id,
      p_backup_data: validation.parsed.data,
    })

    if (error) {
      console.error('[Restore RPC Error]:', error)
      return NextResponse.json(
        { error: 'Khôi phục dữ liệu thất bại: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Khôi phục toàn bộ dữ liệu thành công! 🐱🎉',
      result: data,
    })
  } catch (err: any) {
    console.error('[Restore API Error]:', err)
    return NextResponse.json(
      { error: 'Có lỗi bất ngờ khi khôi phục dữ liệu, Mochi đang kiểm tra lại nhé!' },
      { status: 500 }
    )
  }
}
