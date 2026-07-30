import { SupabaseClient } from '@supabase/supabase-js'

export async function seedSampleDataForUser(
  supabase: SupabaseClient,
  userId: string,
  selectedLevel: string = 'HSK3',
  courseName?: string
) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // 1. Create Course based on level
  const actualCourseName = courseName || `${selectedLevel} - Giáo trình chuẩn`
  const { data: course, error: courseError } = await supabase
    .from('hsk_courses')
    .insert({
      user_id: userId,
      name: actualCourseName,
      level: selectedLevel,
      description: `Khóa học tiếng Trung cấp độ ${selectedLevel}`,
      total_lessons: 5,
      total_vocabulary: 15,
      total_grammar: 3,
      is_sample_data: true,
    })
    .select()
    .single()

  if (courseError || !course) {
    console.error('Failed to create sample course:', courseError)
    return
  }

  // Set active course in user profile
  await supabase
    .from('user_profiles')
    .update({ active_hsk_course_id: course.id })
    .eq('user_id', userId)

  // 2. Seed Sample Lessons
  const sampleLessons = [
    { lesson_number: 1, title: 'Bài 1: Chào hỏi & Làm quen', status: 'completed' },
    { lesson_number: 2, title: 'Bài 2: Hàng ngày & Thời gian', status: 'in_progress' },
    { lesson_number: 3, title: 'Bài 3: Mua sắm & Giá cả', status: 'not_started' },
  ]

  const insertedLessons = []
  for (const l of sampleLessons) {
    const { data: lesson } = await supabase
      .from('hsk_lessons')
      .insert({
        user_id: userId,
        course_id: course.id,
        lesson_number: l.lesson_number,
        title: l.title,
        status: l.status,
        progress_percent: l.status === 'completed' ? 100 : l.status === 'in_progress' ? 50 : 0,
        is_sample_data: true,
      })
      .select()
      .single()

    if (lesson) insertedLessons.push(lesson)
  }

  // 3. Seed Sample Vocabulary
  const lesson1Id = insertedLessons[0]?.id || null
  const sampleVocab = [
    { hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'xin chào', word_type: 'interjection', memory_level: 'mastered', lesson_id: lesson1Id },
    { hanzi: '谢谢', pinyin: 'xièxie', meaning: 'cảm ơn', word_type: 'verb', memory_level: 'learned', lesson_id: lesson1Id },
    { hanzi: '再见', pinyin: 'zàijiàn', meaning: 'tạm biệt', word_type: 'verb', memory_level: 'learning', lesson_id: lesson1Id },
    { hanzi: '苹果', pinyin: 'píngguǒ', meaning: 'quả táo', word_type: 'noun', memory_level: 'hard', lesson_id: insertedLessons[1]?.id },
    { hanzi: '学习', pinyin: 'xuéxí', meaning: 'học tập', word_type: 'verb', memory_level: 'learned', lesson_id: insertedLessons[1]?.id },
    { hanzi: '高兴', pinyin: 'gāoxìng', meaning: 'vui vẻ', word_type: 'adjective', memory_level: 'not_learned', lesson_id: lesson1Id },
    { hanzi: '看', pinyin: 'kàn', meaning: 'nhìn, xem', word_type: 'verb', memory_level: 'not_learned', lesson_id: insertedLessons[1]?.id },
  ]

  for (const v of sampleVocab) {
    await supabase.from('hsk_vocabulary').insert({
      user_id: userId,
      course_id: course.id,
      lesson_id: v.lesson_id,
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      meaning: v.meaning,
      word_type: v.word_type,
      memory_level: v.memory_level,
      is_sample_data: true,
    })
  }

  // 4. Seed Weight & Exercise Logs
  await supabase.from('weight_logs').insert([
    { user_id: userId, log_date: todayStr, weight: 62.5, note: 'Ghi cân nặng mẫu', is_sample_data: true },
  ]).select()

  await supabase.from('exercise_logs').insert([
    { user_id: userId, log_date: todayStr, exercise_type: 'running', duration_minutes: 30, calories_burned: 240, intensity: 'moderate', note: 'Chạy bộ mẫu', is_sample_data: true },
  ])

  // 5. Seed Daily Checklist
  await supabase.from('daily_checklists').insert([
    { user_id: userId, checklist_date: todayStr, item_text: 'Học 10 từ vựng tiếng Trung', is_completed: true, category: 'study' },
    { user_id: userId, checklist_date: todayStr, item_text: 'Uống 2 lít nước', is_completed: false, category: 'fitness' },
    { user_id: userId, checklist_date: todayStr, item_text: 'Ghi chép chi tiêu hôm nay', is_completed: false, category: 'expense' },
  ])
}
