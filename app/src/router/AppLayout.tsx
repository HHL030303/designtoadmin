import { Layout } from 'antd'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppFeedback } from '../components/common/AppFeedback'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useAppState } from '../context/AppStateContext'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    view,
    role,
    availableRoles,
    currentUser,
    currentProject,
    projects,
    loading,
    error,
    logout,
    selectProject,
    switchRole,
  } = useAppState()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <Layout className="app-layout">
      <Sidebar
        view={location.pathname}
        role={role}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onChange={(nextPath) => navigate(nextPath)}
      />

      <Layout>
        <Layout.Content className="app-main">
          <div className="app-topbar">
            <Topbar
              view={view}
              role={role}
              availableRoles={availableRoles}
              currentUser={currentUser}
              currentProject={currentProject}
              projects={projects}
              onSwitchRole={switchRole}
              onSwitchProject={selectProject}
              onLogout={() => void logout()}
            />
          </div>
          <div className="app-content">
            <AppFeedback loading={loading} error={error} />
            <Outlet key={currentProject?.id ?? 'no-project'} />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
