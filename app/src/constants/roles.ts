import type { RoleOption, UserRole, ViewKey } from '../types'

export const roleOptions: RoleOption[] = [
  { key: 'planner', label: '计划员', description: '创建主单、处理售后与迭代' },
  { key: 'researcher', label: '教研老师', description: '上传教研资料并确认教研完成' },
  { key: 'coordinator', label: '设计统筹', description: '派单、确认入库、调度流程' },
  { key: 'styleDesigner', label: '风格稿设计师', description: '上传风格稿成品' },
  { key: 'pageDesigner', label: '内页设计师', description: '上传内页成品' },
  { key: 'sales', label: '售前人员', description: '查看进度并发起售后' },
  { key: 'admin', label: '管理员', description: '拥有全部菜单与操作权限' },
  { key: 'designcooperation', label: '荆门商务（统筹）', description: '拥有全部菜单与操作权限' },
  { key: 'design', label: '设计师', description: '拥有全部菜单与操作权限' },
  { key: 'wuhan_design_cooperation', label: '武汉商务', description: '拥有全部菜单与操作权限' },
  { key: 'customer_planner', label: '商务', description: '拥有全部菜单与操作权限' },
  
]

const adminViewAccess: ViewKey[] = [
  'dashboard',
  'myTasks',
  'allTickets',
  'taskStatistics',
  'research',
  'courses',
  'dispatch',
  'designers',
  'projectManagement',
  'settingsUsers',
  'settingsProjectMembers',
]

const plannerAndCoordinatorViewAccess: ViewKey[] = [
  'dashboard',
  'allTickets',
  'taskStatistics',
  'courses',
]

const taskOnlyViewAccess: ViewKey[] = ['courses']

export const roleViewAccess: Record<UserRole, ViewKey[]> = {
  planner: plannerAndCoordinatorViewAccess,
  researcher: taskOnlyViewAccess,
  coordinator: plannerAndCoordinatorViewAccess,
  styleDesigner: taskOnlyViewAccess,
  pageDesigner: taskOnlyViewAccess,
  sales: taskOnlyViewAccess,
  admin: adminViewAccess,
  designcooperation:taskOnlyViewAccess,
  design:taskOnlyViewAccess,
  wuhan_design_cooperation:adminViewAccess,
  customer_planner:adminViewAccess,
  presales:adminViewAccess
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
  design_cooperation:'designcooperation',
  design:'design',
  wuhan_design_cooperation:'wuhan_design_cooperation',
  customer_planner:"customer_planner"
}
