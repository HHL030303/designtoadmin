import {
  AppstoreOutlined,
  BarsOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TableOutlined,

  UsergroupAddOutlined,
  TeamOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { Button, Layout, Menu, Space, Typography, message } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { navItems } from '../../constants/navigation'
import type { ProjectPermission, UserRole } from '../../types'
import { getAvailableViews } from '../../domain/permissions'
import {
  dashboardService,
  type DashboardCustomMenuItem,
} from '../../services/dashboardService'

type SidebarLeafMenuItem = {
  children?: SidebarLeafMenuItem[]
  key: string
  icon?: ReactNode
  label: string
}

const iconMap = {
  dashboard: <AppstoreOutlined />,
  allTickets: <BarsOutlined />,
  research: <BookOutlined />,
  myTasks: <BarsOutlined />,
  courses: <BarsOutlined />,
  dispatch: <DeploymentUnitOutlined />,
  designers: <TeamOutlined />,
  service: <ShoppingOutlined />,
  'project-root': <TableOutlined />,
  projectManagement: <DeploymentUnitOutlined />,
  'settings-root': <SettingOutlined />,
  settingsUsers: <UsergroupAddOutlined />,
  settingsRoles: <SettingOutlined />,
  settingsProjectMembers: <TeamOutlined />,
  taskStatistics: <ProjectOutlined />,
  customMenu: <BarsOutlined />,
}

const customMenuRoles: UserRole[] = ['coordinator', 'planner', 'admin']
const TASK_STATISTICS_MENU_NAME = '内页设计师进度明细'

function buildCustomMenuPath(item: DashboardCustomMenuItem, index: number): string {
  const normalizedName = item.menuName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const key = normalizedName || `custom-menu-${index + 1}`
  const searchParams = new URLSearchParams({
    menu_name: item.menuName,
    request_url: item.requestUrl,
  })

  if (item.menuName === TASK_STATISTICS_MENU_NAME) {
    return `/task-statistics/custom/${encodeURIComponent(key)}?${searchParams.toString()}`
  }

  return `/tickets/custom/${encodeURIComponent(key)}?${searchParams.toString()}`
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

export function Sidebar({
  role,
  currentProjectId,
  permissions,
  collapsed,
  onToggleCollapsed,
  onChange,
}: {
  role: UserRole
  currentProjectId: string | null
  permissions: ProjectPermission[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onChange: (path: string) => void
}) {
  const location = useLocation()
  const availableViews = getAvailableViews(role, permissions)
  const [customMenuList, setCustomMenuList] = useState<DashboardCustomMenuItem[]>([])
  const canViewCustomMenus = customMenuRoles.includes(role)

  useEffect(() => {
    let mounted = true

    async function loadCustomMenus(): Promise<void> {
      if (!canViewCustomMenus) {
        setCustomMenuList([])
        return
      }

      try {
        const config = await dashboardService.getStatisticConfig()

        if (mounted) {
          setCustomMenuList(config.customMenuList)
        }
      } catch (error) {
        if (mounted) {
          setCustomMenuList([])
          message.error(error instanceof Error ? error.message : '自定义菜单加载失败')
        }
      }
    }

    void loadCustomMenus()

    return () => {
      mounted = false
    }
  }, [canViewCustomMenus, currentProjectId])

  const staticMenuItems = useMemo(() => navItems
    .map((item): SidebarLeafMenuItem | null => {
      if (item.children) {
        const visibleChildren = item.children.filter(
          (child) => child.viewKey && availableViews.includes(child.viewKey),
        )

        if (visibleChildren.length === 0) {
          return null
        }

        return {
          key: item.key,
          icon: iconMap[item.key as keyof typeof iconMap],
          label: item.label,
          children: visibleChildren.map((child) => ({
            key: child.path as string,
            icon: iconMap[child.key as keyof typeof iconMap],
            label: child.label,
          })),
        }
      }

      if (!item.viewKey || !availableViews.includes(item.viewKey)) {
        return null
      }

      return {
        key: item.path as string,
        icon: iconMap[item.key as keyof typeof iconMap],
        label: item.label,
      }
    })
    .filter((item): item is SidebarLeafMenuItem => item !== null), [availableViews])

  const customMenuItems = useMemo(
    () => customMenuList.map((item, index): SidebarLeafMenuItem => ({
      key: buildCustomMenuPath(item, index),
      icon: iconMap.customMenu,
      label: item.menuName,
    })),
    [customMenuList],
  )

  const menuItems = useMemo(
    () => [...staticMenuItems, ...customMenuItems],
    [customMenuItems, staticMenuItems],
  )

  const selectedKey = useMemo(() => {
    const normalizedPathname = normalizePath(location.pathname)
    const currentPathWithSearch = `${normalizedPathname}${location.search}`
    const availableKeys = menuItems
      .flatMap((item) => (Array.isArray(item.children) ? item.children : [item]))
      .map((item) => item.key)
      .sort((left, right) => right.length - left.length)

    return availableKeys.find((key) => (
      currentPathWithSearch === key ||
      normalizedPathname === key ||
      normalizedPathname.startsWith(`${key}/`)
    )) ?? currentPathWithSearch
  }, [location.pathname, location.search, menuItems])

  return (
    <Layout.Sider
      width={240}
      collapsedWidth={72}
      collapsible
      trigger={null}
      collapsed={collapsed}
      theme="dark"
      className="app-sider"
    >
      <div className="app-brand">
        <div className="app-brand-row">
          {!collapsed ? (
            <Space orientation="vertical" size={8}>
              <Typography.Title level={4} className="app-brand-title">
                设计交付后台
              </Typography.Title>
            </Space>
          ) : null}
          <Button
            type="text"
            className="app-sider-toggle"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          />
        </div>
      </div>
      <Menu
        className="app-menu"
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selectedKey]}
        defaultOpenKeys={['project-root', 'settings-root']}
        items={menuItems}
        onClick={({ key }) => onChange(String(key))}
      />
    </Layout.Sider>
  )
}
