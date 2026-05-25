import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  LinkOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { getNavItemByView, getPathForView } from '../../constants/navigation'
import { getAvailableViews } from '../../domain/permissions'
import { authService, type WorkwxConfig } from '../../services/authService'
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
  onRefreshCurrentUser,
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
  onRefreshCurrentUser: () => void | Promise<void>
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [bindingModalOpen, setBindingModalOpen] = useState(false)
  const [loadingWorkwxConfig, setLoadingWorkwxConfig] = useState(false)
  const [bindingWorkwx, setBindingWorkwx] = useState(false)
  const [workwxConfig, setWorkwxConfig] = useState<WorkwxConfig | null>(null)
  const [workwxLoginUrl, setWorkwxLoginUrl] = useState('')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const bindStateRef = useRef('')
  const handledCodeRef = useRef('')
  const { current, parent } = getNavItemByView(view)
  const defaultHomeView = getAvailableViews(role).includes('dashboard')
    ? 'dashboard'
    : getAvailableViews(role)[0]
  const isCourseDetailPage =
    location.pathname.startsWith('/courses/') && location.pathname !== '/courses'
  const courseListReturnSearch = useMemo(() => {
    if (!isCourseDetailPage) {
      return ''
    }

    const currentSearchParams = new URLSearchParams(location.search)
    const nextSearchParams = new URLSearchParams()
    const listPage = currentSearchParams.get('listPage')
    const listPageSize = currentSearchParams.get('listPageSize')

    if (listPage) {
      nextSearchParams.set('page', listPage)
    }

    if (listPageSize) {
      nextSearchParams.set('pageSize', listPageSize)
    }

    const nextSearch = nextSearchParams.toString()
    return nextSearch ? `?${nextSearch}` : ''
  }, [isCourseDetailPage, location.search])
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
                onClick={() => navigate(`${current.path as string}${courseListReturnSearch}`)}
              >
                {current.label}
              </button>
            )
          : (current?.label ?? '工作台'),
    },
    ...(isCourseDetailPage ? [{ title: '任务详情' }] : []),
  ]

  const redirectUri = useMemo(() => {
    const currentUrl = new URL(window.location.origin)
    currentUrl.pathname = location.pathname
    currentUrl.search = location.search
    currentUrl.hash = location.hash
    currentUrl.searchParams.delete('appid')
    currentUrl.searchParams.delete('code')
    currentUrl.searchParams.delete('state')
    return currentUrl.toString()
  }, [location.hash, location.pathname, location.search])

  const cleanedSearch = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    searchParams.delete('appid')
    searchParams.delete('code')
    searchParams.delete('state')

    const nextSearch = searchParams.toString()
    return nextSearch ? `?${nextSearch}` : ''
  }, [location.search])

  const workwxBound = useMemo(() => {
    if (!currentUser || !currentProject?.name) {
      return false
    }

    return (
      currentUser.projects.find((project) => project.name === currentProject.name)?.workwxBound ??
      false
    )
  }, [currentProject?.name, currentUser])

  const workwxBindButtonLabel = workwxBound ? '企业微信已绑定' : '绑定项目企业微信'

  async function handleOpenWorkwxBinding() {
    if (workwxBound) {
      return
    }

    setLoadingWorkwxConfig(true)

    try {
      const config = await authService.getWorkwxConfig()

      if (!config.can_bind_workwx) {
        message.warning('当前项目暂未开启企业微信绑定')
        return
      }

      const loginUrl = new URL('https://open.work.weixin.qq.com/wwopen/sso/qrConnect')
      loginUrl.searchParams.set('appid', config.corp_id)
      loginUrl.searchParams.set('agentid', config.agent_id)
      loginUrl.searchParams.set('redirect_uri', redirectUri)
      loginUrl.searchParams.set(
        'state',
        `workwx-bind:${currentProject?.id ?? 'unknown'}:${Date.now()}`,
      )
      loginUrl.searchParams.set('login_type', 'CorpApp')

      bindStateRef.current = loginUrl.searchParams.get('state') ?? ''
      handledCodeRef.current = ''
      setWorkwxConfig(config)
      setWorkwxLoginUrl(loginUrl.toString())
      setBindingModalOpen(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '企业微信配置加载失败')
    } finally {
      setLoadingWorkwxConfig(false)
    }
  }

  const handleBindWorkwx = useEffectEvent(async (code: string, state: string | null) => {
    if (!code || bindingWorkwx || handledCodeRef.current === code) {
      return
    }

    if (!state || !state.startsWith('workwx-bind:')) {
      return
    }

    if (bindStateRef.current && state !== bindStateRef.current) {
      return
    }

    handledCodeRef.current = code
    setBindingWorkwx(true)

    try {
      await authService.bindWorkwx(code, redirectUri)
      await onRefreshCurrentUser()
      message.success('企业微信绑定成功')
      setBindingModalOpen(false)
      setWorkwxLoginUrl('')
      navigate(`${location.pathname}${cleanedSearch}${location.hash}`, { replace: true })
    } catch (error) {
      handledCodeRef.current = ''
      message.error(error instanceof Error ? error.message : '企业微信绑定失败')
    } finally {
      setBindingWorkwx(false)
    }
  })

  useEffect(() => {
    const callbackSearchParams = new URLSearchParams(location.search)
    const callbackCode = callbackSearchParams.get('code')
    const callbackState = callbackSearchParams.get('state')

    if (callbackCode && callbackState?.startsWith('workwx-bind:')) {
      window.setTimeout(() => {
        void handleBindWorkwx(callbackCode, callbackState)
      }, 0)
      return
    }

    if (!bindingModalOpen || !workwxLoginUrl) {
      return
    }

    const timer = window.setInterval(() => {
      const iframeWindow = iframeRef.current?.contentWindow

      if (!iframeWindow) {
        return
      }

      try {
        const iframeUrl = iframeWindow.location.href

        if (!iframeUrl.startsWith(window.location.origin)) {
          return
        }

        const callbackUrl = new URL(iframeUrl)
        const code = callbackUrl.searchParams.get('code')

        if (!code) {
          return
        }

        void handleBindWorkwx(code, callbackUrl.searchParams.get('state'))
      } catch {
        // The QR login page is cross-origin before redirect; ignore until it returns.
      }
    }, 800)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    bindingModalOpen,
    location.search,
    redirectUri,
    workwxLoginUrl,
  ])

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
              <div>
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
              </div>
              {
                availableRoles.length>1 &&   <div>
                <span>角色：</span>
                {availableRoles.length > 1 ? (
                <Select
                  value={role}
                  size="small"
                  className="topbar-project-select"
                  options={availableRoles.map((item) => ({
                    label: item.name,
                    value: item.role,
                  }))}
                  onChange={onSwitchRole}
                />
              ) : null}
              </div>
              }
            </div>
         
           
          </div>
        </Space>
      </div>
      <div className="topbar-dropdown-actions">
        <Button
          type="text"
          icon={<LinkOutlined />}
          onClick={() => void handleOpenWorkwxBinding()}
          loading={loadingWorkwxConfig}
          disabled={workwxBound}
          block
        >
          {workwxBindButtonLabel}
        </Button>
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

      <Modal
        title="绑定项目企业微信"
        open={bindingModalOpen}
        onCancel={() => {
          if (bindingWorkwx) {
            return
          }

          setBindingModalOpen(false)
          setWorkwxLoginUrl('')
        }}
        footer={null}
        width={420}
        destroyOnHidden
      >
        <div className="topbar-workwx-modal">
          {workwxConfig ? (
            <Alert
              type="info"
              showIcon
              message={`扫码后将绑定到「${workwxConfig.corp_name}」当前项目`}
            />
          ) : null}
          <Typography.Paragraph className="topbar-workwx-hint">
            请使用企业微信扫码完成绑定，扫码确认后会自动关联当前账号。
          </Typography.Paragraph>
          <div className="topbar-workwx-qrcode-shell">
            {workwxLoginUrl ? (
              <iframe
                ref={iframeRef}
                src={workwxLoginUrl}
                className="topbar-workwx-qrcode-frame"
              />
            ) : (
              <div className="topbar-workwx-qrcode-placeholder">
                <Spin size="large" />
              </div>
            )}
            {bindingWorkwx ? (
              <div className="topbar-workwx-qrcode-mask">
                <Spin tip="正在完成绑定..." />
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
