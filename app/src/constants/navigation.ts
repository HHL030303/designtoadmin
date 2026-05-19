import type { NavItem, ViewKey } from '../types'

export const navItems: NavItem[] = [
  { key: 'dashboard', viewKey: 'dashboard', label: '总览看板', hint: '指标与风险', path: '/dashboard' },
  { key: 'allTickets', viewKey: 'allTickets', label: '全部工单', hint: '展示与统计', path: '/tickets' },
  { key: 'taskStatistics', viewKey: 'taskStatistics', label: '任务明细', hint: '角色与工时统计', path: '/task-statistics' },
  { key: 'courses', viewKey: 'courses', label: '任务工单', hint: '主流程推进', path: '/courses' },
  // { key: 'dispatch', viewKey: 'dispatch', label: '派单中心', hint: '设计统筹视角', path: '/dispatch' },
  // { key: 'designers', viewKey: 'designers', label: '设计师任务台', hint: '上传与交付', path: '/designers' },
  {
    key: 'project-root',
    label: '项目管理',
    hint: '项目与成员维护',
    children: [
      {
        key: 'projectManagement',
        viewKey: 'projectManagement',
        label: '项目列表',
        hint: '维护项目与成员',
        path: '/project-management/projects',
      },
    ],
  },
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

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

export function getPathForView(view: ViewKey) {
  return viewPathMap[view]
}

export function getViewForPath(pathname: string) {
  const normalizedPath = normalizePath(pathname)
  const exactMatchedView = pathViewMap[normalizedPath]

  if (exactMatchedView) {
    return exactMatchedView
  }

  const prefixMatchedPath = Object.keys(pathViewMap)
    .sort((left, right) => right.length - left.length)
    .find((path) => normalizedPath.startsWith(`${path}/`))

  return prefixMatchedPath ? pathViewMap[prefixMatchedPath] : undefined
}

export function getNavItemByView(view: ViewKey) {
  const current = leafNavItems.find((item) => item.viewKey === view)
  if (!current) {
    return { current: undefined, parent: undefined }
  }

  const parent = navItems.find((item) => item.children?.some((child) => child.viewKey === view))
  return { current, parent }
}
