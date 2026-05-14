import {
  AppstoreOutlined,
  BarsOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, Space, Typography } from 'antd'
import { navItems } from '../../constants/navigation'
import type { UserRole } from '../../types'
import { getAvailableViews } from '../../domain/permissions'

const iconMap = {
  dashboard: <AppstoreOutlined />,
  allTickets: <BarsOutlined />,
  research: <BookOutlined />,
  myTasks: <BarsOutlined />,
  courses: <BarsOutlined />,
  dispatch: <DeploymentUnitOutlined />,
  designers: <TeamOutlined />,
  service: <ShoppingOutlined />,
  'project-root': <DeploymentUnitOutlined />,
  projectManagement: <DeploymentUnitOutlined />,
  'settings-root': <SettingOutlined />,
  settingsUsers: <TeamOutlined />,
  settingsRoles: <SettingOutlined />,
  settingsProjectMembers: <TeamOutlined />,
}

export function Sidebar({
  view,
  role,
  collapsed,
  onToggleCollapsed,
  onChange,
}: {
  view: string
  role: UserRole
  collapsed: boolean
  onToggleCollapsed: () => void
  onChange: (path: string) => void
}) {
  const availableViews = getAvailableViews(role)
  const menuItems = navItems
    .map((item) => {
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
    .filter(Boolean)

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
        selectedKeys={[view]}
        defaultOpenKeys={['project-root', 'settings-root']}
        items={menuItems}
        onClick={({ key }) => onChange(String(key))}
      />
    </Layout.Sider>
  )
}
