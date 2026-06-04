import type { ProjectOption, UserRole } from '../types'

type TaskListActionPermissionRule = {
  allowedRoles: UserRole[]
  projectCodes: string[]
  projectNames: string[]
  deleteRoles?: UserRole[]
}

type TaskListActionPermission = {
  allowedRoles: UserRole[]
  deleteRoles:  UserRole[]
}

const TASK_LIST_ACTION_PERMISSION_RULES: TaskListActionPermissionRule[] = [
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。编辑按钮
    allowedRoles: ['admin', 'planner', 'coordinator','sales','wuhan_design_cooperation'],
    projectCodes: ['courseware_design'],
    projectNames: ['课件设计项目'],
  },
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。编辑按钮
    allowedRoles: ['admin', 'planner', 'coordinator','wuhan_design_cooperation'],
    projectCodes: ['PRJ20260507075B41A26A'],
    projectNames: ['医护设计项目'],
  },
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。编辑按钮
    allowedRoles: ['admin', 'planner', 'customer_planner'],
    projectCodes: ['PRJ20260507075B41A26A'],
    projectNames: ['教育线定制'],
  },
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。 编辑按钮
    allowedRoles: ['admin', 'planner', 'wuhan_design_cooperation','designcooperation'],
    deleteRoles:['admin','wuhan_design_cooperation','designcooperation'],
    projectCodes: ['PRJ20260507075B41A26A'],
    projectNames: ['素材生产'],
  },
  {
    // 仅对这里显式列出的项目收紧任务列表操作权限，避免波及其他项目。编辑按钮
    allowedRoles: ['admin', 'planner', 'wuhan_design_cooperation'],
    projectCodes: ['PRJ20260507075B41A26A'],
    projectNames: ['科研线'],
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
    deleteRoles: matchedRule?.deleteRoles ||[]
  }
}
