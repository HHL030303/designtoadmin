import type { RoleOption, UserRole, ViewKey } from '../types'

export const roleOptions: RoleOption[] = [
  { key: 'planner', label: '计划员', description: '创建主单、处理售后与迭代' },
  { key: 'researcher', label: '教研老师', description: '上传教研资料并确认教研完成' },
  { key: 'coordinator', label: '设计统筹', description: '派单、确认入库、调度流程' },
  { key: 'styleDesigner', label: '风格稿设计师', description: '上传风格稿成品' },
  { key: 'pageDesigner', label: '内页设计师', description: '上传内页成品' },
  { key: 'sales', label: '售前人员', description: '查看进度并发起售后' },
  { key: 'admin', label: '管理员', description: '拥有全部菜单与操作权限' },
]

export const roleViewAccess: Record<UserRole, ViewKey[]> = {
  planner: ['dashboard', 'courses', 'service'],
  researcher: ['dashboard', 'courses', 'research'],
  coordinator: ['dashboard', 'courses', 'dispatch'],
  styleDesigner: ['dashboard', 'courses', 'designers'],
  pageDesigner: ['dashboard', 'courses', 'designers'],
  sales: ['dashboard', 'courses', 'service'],
  admin: [
    'dashboard',
    'allTickets',
    'research',
    'courses',
    'dispatch',
    'designers',
    'service',
    'projectManagement',
    'settingsUsers',
    'settingsProjectMembers',
  ],
}

export const roleLabelMap: Record<UserRole, string> = Object.fromEntries(
  roleOptions.map((role) => [role.key, role.label]),
) as Record<UserRole, string>

export const backendRoleMap: Record<string, UserRole> = {
  planner: 'planner',
  researcher: 'researcher',
  design_coordinator: 'coordinator',
  style_designer: 'styleDesigner',
  page_designer: 'pageDesigner',
  presales: 'sales',
  project_admin: 'admin',
  super_admin: 'admin',
}
