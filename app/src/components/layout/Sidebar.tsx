import {
  AppstoreOutlined,
  BarsOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Layout, Menu, Space, Typography } from 'antd'
import { navItems } from '../../constants/navigation'
import type { UserRole } from '../../types'
import { getAvailableViews } from '../../domain/permissions'

const iconMap = {
  dashboard: <AppstoreOutlined />,
  allTickets: <BarsOutlined />,
  research: <BookOutlined />,
  courses: <BarsOutlined />,
  dispatch: <DeploymentUnitOutlined />,
  designers: <TeamOutlined />,
  service: <ShoppingOutlined />,
  'settings-root': <SettingOutlined />,
  settingsUsers: <TeamOutlined />,
  settingsRoles: <SettingOutlined />,
}

export function Sidebar({
  view,
  role,
  onChange,
}: {
  view: string
  role: UserRole
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
    <Layout.Sider width={240} theme="dark" className="app-sider">
      <div className="app-brand">
        <Space direction="vertical" size={8}>
          <Typography.Title level={4} className="app-brand-title">
            设计交付后台
          </Typography.Title>
        </Space>
      </div>
      <Menu
        className="app-menu"
        mode="inline"
        selectedKeys={[view]}
        defaultOpenKeys={['settings-root']}
        items={menuItems}
        onClick={({ key }) => onChange(String(key))}
      />
    </Layout.Sider>
  )
}
