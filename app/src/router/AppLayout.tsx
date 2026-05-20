import { Layout } from 'antd'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AppFeedback } from '../components/common/AppFeedback'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { getPathForView } from '../constants/navigation'
import { useAppState } from '../context/AppStateContext'

export function AppLayout() {
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
    refreshCurrentUser,
    selectProject,
    switchRole,
  } = useAppState()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <Layout className="app-layout">
      <Sidebar
        view={getPathForView(view)}
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
              onRefreshCurrentUser={() => void refreshCurrentUser()}
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
