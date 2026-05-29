import type { ProjectOption, UserRole } from '../types'

type TaskListActionPermissionRule = {
  allowedRoles: UserRole[]
  projectCodes: string[]
  projectNames: string[]
}

type TaskListActionPermission = {
  allowedRoles: UserRole[]
}

const TASK_LIST_ACTION_PERMISSION_RULES: TaskListActionPermissionRule[] = [
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。
    allowedRoles: ['admin', 'planner', 'coordinator','presales','sales'],
    projectCodes: ['courseware_design'],
    projectNames: ['课件设计项目'],
  },
]

export function getTaskListActionPermission(
  project: Pick<ProjectOption, 'code' | 'name'> | null | undefined,
): TaskListActionPermission | null {
  if (!project) {
    return null
  }

  const matchedRule = TASK_LIST_ACTION_PERMISSION_RULES.find((rule) => (
    rule.projectCodes.includes(project.code) || rule.projectNames.includes(project.name)
  ))

  if (!matchedRule) {
    return null
  }

  return {
    allowedRoles: matchedRule.allowedRoles,
  }
}
