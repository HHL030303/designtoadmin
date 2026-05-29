import type { UserRole } from '../types'

type TaskListTabVisibilityConfig = {
  completedTabRoles: UserRole[]
}

export const taskListTabVisibilityConfig: TaskListTabVisibilityConfig = {
  // 需要在“我的任务”里显示“已完成”页签的角色统一收口在这里，后续只改配置。
  completedTabRoles: ['sales', 'coordinator'],
}

export function shouldShowCompletedTaskTab(role: UserRole): boolean {
  return taskListTabVisibilityConfig.completedTabRoles.includes(role)
}
