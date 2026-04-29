import { Navigate, Route, Routes } from 'react-router-dom'
import { getPathForView } from '../constants/navigation'
import { getAvailableViews } from '../domain/permissions'
import { useAppState } from '../context/AppStateContext'
import { AppLayout } from './AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { AllTicketsPage } from '../pages/AllTicketsPage'
import { ResearchWorkbenchPage } from '../pages/ResearchWorkbenchPage'
import { CoursesPage } from '../pages/CoursesPage'
import { DispatchPage } from '../pages/DispatchPage'
import { DesignersPage } from '../pages/DesignersPage'
import { ServicePage } from '../pages/ServicePage'
import { LoginPage } from '../pages/LoginPage'
import { AccountManagementPage } from '../pages/AccountManagementPage'
import { RoleManagementPage } from '../pages/RoleManagementPage'
import { ProjectSelectPage } from '../pages/ProjectSelectPage'

export function AppRouter() {
  const { role, isAuthenticated, hasSelectedProject } = useAppState()
  const fallbackPath = getPathForView(getAvailableViews(role)[0])

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={hasSelectedProject ? fallbackPath : '/project-select'} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/project-select"
        element={
          isAuthenticated ? (
            hasSelectedProject ? <Navigate to={fallbackPath} replace /> : <ProjectSelectPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? (hasSelectedProject ? fallbackPath : '/project-select') : '/login'}
            replace
          />
        }
      />
      <Route
        element={
          isAuthenticated && hasSelectedProject ? (
            <AppLayout />
          ) : (
            <Navigate to={isAuthenticated ? '/project-select' : '/login'} replace />
          )
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<AllTicketsPage />} />
        <Route path="/research" element={<ResearchWorkbenchPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/designers" element={<DesignersPage />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/settings/users" element={<AccountManagementPage />} />
        <Route path="/settings/roles" element={<RoleManagementPage />} />
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? (hasSelectedProject ? fallbackPath : '/project-select') : '/login'}
            replace
          />
        }
      />
    </Routes>
  )
}
