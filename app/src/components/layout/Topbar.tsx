import { Avatar, Breadcrumb, Button, Dropdown, Select, Space, Tag, Typography } from 'antd'
import {
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { getNavItemByView, getPathForView } from '../../constants/navigation'
import { getAvailableViews } from '../../domain/permissions'
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
  projects,
  onSwitchRole,
  onSwitchProject,
  onLogout,
}: {
  view: ViewKey
  role: UserRole
  availableRoles: AvailableProjectRole[]
  currentUser: AuthUser | null
  currentProject: ProjectOption | null
  projects: ProjectOption[]
  onSwitchRole: (role: UserRole) => void
  onSwitchProject: (projectKey: string) => void
  onLogout: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { current, parent } = getNavItemByView(view)
  const defaultHomeView = getAvailableViews(role).includes('dashboard')
    ? 'dashboard'
    : getAvailableViews(role)[0]
  const isCourseDetailPage =
    location.pathname.startsWith('/courses/') && location.pathname !== '/courses'
  const breadcrumbItems = [
    {
      title: (
        <button
          type="button"
          className="topbar-breadcrumb-button"
          onClick={() => {
            if (defaultHomeView) {
              navigate(getPathForView(defaultHomeView))
            }
          }}
        >
          <Space size={6}>
          <HomeOutlined />
          <span>首页</span>
          </Space>
        </button>
      ),
    },
    ...(parent
      ? [
          {
            title: (
              <button
                type="button"
                className="topbar-breadcrumb-button"
                onClick={() => navigate(parent.path as string)}
              >
                {parent.label}
              </button>
            ),
          },
        ]
      : []),
    {
      title:
        isCourseDetailPage && current?.path
          ? (
              <button
                type="button"
                className="topbar-breadcrumb-button"
                onClick={() => navigate(current.path as string)}
              >
                {current.label}
              </button>
            )
          : (current?.label ?? '工作台'),
    },
    ...(isCourseDetailPage ? [{ title: '任务详情' }] : []),
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
            <div className='currentProject'>
              <span>项目：</span>
            <Select
              value={currentProject?.key}
              size="small"
              suffixIcon={<DownOutlined />}
              className="topbar-project-select"
              options={projects.map((project) => ({
                label: project.name,
                value: project.key,
              }))}
              onChange={onSwitchProject}
            />
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
        {/* <Badge count={3} size="small" className="topbar-notice-badge">
          <button type="button" className="topbar-icon-button" aria-label="通知中心">
            <BellOutlined />
          </button>
        </Badge> */}
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
