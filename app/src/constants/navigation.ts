import type { NavItem, ViewKey } from '../types'

export const navItems: NavItem[] = [
  { key: 'dashboard', viewKey: 'dashboard', label: '总览看板', hint: '指标与风险', path: '/dashboard' },
  { key: 'allTickets', viewKey: 'allTickets', label: '全部工单', hint: '管理员全量查看', path: '/tickets' },
  { key: 'research', viewKey: 'research', label: '教研任务台', hint: '我的教研任务', path: '/research' },
  { key: 'courses', viewKey: 'courses', label: '任务工单', hint: '主流程推进', path: '/courses' },
  { key: 'dispatch', viewKey: 'dispatch', label: '派单中心', hint: '设计统筹视角', path: '/dispatch' },
  { key: 'designers', viewKey: 'designers', label: '设计师任务台', hint: '上传与交付', path: '/designers' },
  { key: 'service', viewKey: 'service', label: '售后与迭代', hint: '版本衍生任务', path: '/service' },
  {
    key: 'settings-root',
    label: '系统设置',
    hint: '账号与权限配置',
    children: [
      {
        key: 'settingsUsers',
        viewKey: 'settingsUsers',
        label: '账号管理',
        hint: '维护登录账号',
        path: '/settings/users',
      },
      {
        key: 'settingsRoles',
        viewKey: 'settingsRoles',
        label: '角色管理',
        hint: '维护角色权限',
        path: '/settings/roles',
      },
    ],
  },
]

export const flatNavItems = navItems.flatMap((item) => item.children ?? [item])
export const leafNavItems = flatNavItems.filter((item) => item.viewKey && item.path)

export const viewPathMap = Object.fromEntries(
  leafNavItems.map((item) => [item.viewKey, item.path]),
) as Record<ViewKey, string>

export const pathViewMap = Object.fromEntries(
  leafNavItems.map((item) => [item.path, item.viewKey]),
) as Record<string, ViewKey>

export function getPathForView(view: ViewKey) {
  return viewPathMap[view]
}

export function getViewForPath(pathname: string) {
  return pathViewMap[pathname] ?? 'dashboard'
}

export function getNavItemByView(view: ViewKey) {
  const current = leafNavItems.find((item) => item.viewKey === view)
  if (!current) {
    return { current: undefined, parent: undefined }
  }

  const parent = navItems.find((item) => item.children?.some((child) => child.viewKey === view))
  return { current, parent }
}
