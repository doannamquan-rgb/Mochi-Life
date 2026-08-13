import type { MochiAIContext } from './types';

export type MochiInsight = {
  type: 'study' | 'fitness' | 'finance' | 'calendar' | 'motivation';
  icon: string;
  title: string;
  description: string;
  priority: number; // higher = more important
};

const EXPENSE_WARNING_THRESHOLD = 20;

export function generateDeterministicInsights(context: MochiAIContext): MochiInsight[] {
  const insights: MochiInsight[] = [];

  // Study
  if (context.study) {
    if (context.study.dueWords > 0) {
      insights.push({
        type: 'study',
        icon: '📚',
        title: 'Ôn tập từ vựng',
        description: `Bạn có ${context.study.dueWords} từ cần ôn tập hôm nay.`,
        priority: 80
      });
    }

    if (context.study.streak > 0) {
      if (context.study.todayStudyMinutes === 0) {
        insights.push({
          type: 'study',
          icon: '🔥',
          title: 'Bảo vệ chuỗi học',
          description: `Đừng để đứt chuỗi ${context.study.streak} ngày! Hãy dành ít phút học hôm nay nhé.`,
          priority: 90
        });
      } else {
        insights.push({
          type: 'study',
          icon: '🔥',
          title: 'Chuỗi học ấn tượng',
          description: `Bạn đang có chuỗi học ${context.study.streak} ngày liên tiếp!`,
          priority: 60
        });
      }
    }
  }

  // Fitness
  if (context.fitness) {
    if (context.fitness.weeklyWorkoutTarget !== null && context.fitness.workoutsThisWeek < context.fitness.weeklyWorkoutTarget) {
      insights.push({
        type: 'fitness',
        icon: '🏃',
        title: 'Mục tiêu tập luyện',
        description: `Bạn đã tập ${context.fitness.workoutsThisWeek}/${context.fitness.weeklyWorkoutTarget} buổi tuần này.`,
        priority: 75
      });
    }
    
    if (context.fitness.weightChange7d !== null) {
      const isLosing = context.fitness.weightChange7d < 0;
      const absChange = Math.abs(context.fitness.weightChange7d);
      if (absChange > 0) {
        insights.push({
          type: 'fitness',
          icon: '⚖️',
          title: 'Tiến độ cân nặng',
          description: `${isLosing ? 'Giảm' : 'Tăng'} ${absChange} kg trong 7 ngày qua.`,
          priority: 70
        });
      }
    }
  }

  // Finance
  if (context.finance) {
    if (context.finance.expenseChangePercent !== null && context.finance.expenseChangePercent > EXPENSE_WARNING_THRESHOLD) {
      insights.push({
        type: 'finance',
        icon: '💰',
        title: 'Cảnh báo chi tiêu',
        description: `Chi tiêu tăng ${context.finance.expenseChangePercent.toFixed(1)}% so với kỳ trước.`,
        priority: 85
      });
    }
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
