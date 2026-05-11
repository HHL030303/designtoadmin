import { Avatar, Badge, Breadcrumb, Button, Dropdown, Select, Space, Tag, Typography } from 'antd'
import {
  BellOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { getNavItemByView } from '../../constants/navigation'
import type {
  AuthUser,
  AvailableProjectRole,
  ProjectOption,
  UserRole,
  ViewKey,
} from '../../types'
import { roleLabelMap } from '../../constants/roles'

export function Topbar({
  view,
  role,
  availableRoles,
  currentUser,
  currentProject,
  onSwitchRole,
  onLogout,
}: {
  view: ViewKey
  role: UserRole
  availableRoles: AvailableProjectRole[]
  currentUser: AuthUser | null
  currentProject: ProjectOption | null
  onSwitchRole: (role: UserRole) => void
  onLogout: () => void
}) {
  const { current, parent } = getNavItemByView(view)
  const breadcrumbItems = [
    {
      title: (
        <Space size={6}>
          <HomeOutlined />
          <span>首页</span>
        </Space>
      ),
    },
    ...(parent ? [{ title: parent.label }] : []),
    { title: current?.label ?? '工作台' },
  ]
  const dropdownContent = (
    <div className="topbar-dropdown-menu">
      <div className="topbar-dropdown-header">
        <Space size={12} align="center">
          <Avatar size={40} className="topbar-avatar" icon={<UserOutlined />} />
          <div className="topbar-user-meta">
            <Space size={8} wrap>
              <Typography.Text className="topbar-user-name">
                {currentUser?.name ?? '未登录'}
              </Typography.Text>
              <Tag className="topbar-role-tag">{roleLabelMap[role]}</Tag>
            </Space>
            <Typography.Text className="topbar-role-label">
              账号：{currentUser?.email ?? '-'}
            </Typography.Text>
            <Typography.Text className="topbar-role-label">
              项目：{currentProject?.name ?? '-'}
            </Typography.Text>
            {availableRoles.length > 1 ? (
              <Select
                value={role}
                size="small"
                className="topbar-role-select"
                options={availableRoles.map((item) => ({
                  label: item.name,
                  value: item.role,
                }))}
                onChange={onSwitchRole}
              />
            ) : null}
          </div>
        </Space>
      </div>
      <div className="topbar-dropdown-actions">
        <Button type="text" icon={<LogoutOutlined />} onClick={onLogout} block>
          退出登录
        </Button>
      </div>
    </div>
  )

  return (
    <div className="page-header">
      <Breadcrumb className="topbar-breadcrumb" items={breadcrumbItems} />

      <div className="topbar-actions">
        <Badge count={3} size="small" className="topbar-notice-badge">
          <button type="button" className="topbar-icon-button" aria-label="通知中心">
            <BellOutlined />
          </button>
        </Badge>
        <Dropdown popupRender={() => dropdownContent} trigger={['click']} placement="bottomRight">
          <button type="button" className="topbar-account-trigger">
            <Avatar size={36} className="topbar-avatar" icon={<UserOutlined />} />
            <div className="topbar-user-meta">
              <Typography.Text className="topbar-user-name">
                {currentUser?.name ?? '未登录'}
              </Typography.Text>
              <Typography.Text className="topbar-role-label">
                {roleLabelMap[role]} · {currentProject?.name ?? '未选项目'}
              </Typography.Text>
            </div>
            <DownOutlined className="topbar-trigger-icon" />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}
