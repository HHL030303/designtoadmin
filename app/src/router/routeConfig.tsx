import type { ReactElement } from 'react'
import { AccountManagementPage } from '../pages/AccountManagementPage'
import { AllTicketsPage } from '../pages/AllTicketsPage'
import { CoursesPage } from '../pages/CoursesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DesignersPage } from '../pages/DesignersPage'
import { DispatchPage } from '../pages/DispatchPage'
import { LoginPage } from '../pages/LoginPage'
import { ProjectManagementPage } from '../pages/ProjectManagementPage'
import { ProjectMembersPage } from '../pages/ProjectMembersPage'
import { ProjectSelectPage } from '../pages/ProjectSelectPage'
import { ResearchWorkbenchPage } from '../pages/ResearchWorkbenchPage'
import { ServicePage } from '../pages/ServicePage'

export type AppRouteConfig = {
  path: string
  element: ReactElement
}

export const publicRoutes: AppRouteConfig[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/project-select',
    element: <ProjectSelectPage />,
  },
]

export const privateRoutes: AppRouteConfig[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/tickets',
    element: <AllTicketsPage />,
  },
  {
    path: '/research',
    element: <ResearchWorkbenchPage />,
  },
  {
    path: '/courses',
    element: <CoursesPage />,
  },
  {
    path: '/dispatch',
    element: <DispatchPage />,
  },
  {
    path: '/designers',
    element: <DesignersPage />,
  },
  {
    path: '/service',
    element: <ServicePage />,
  },
  {
    path: '/project-management/projects',
    element: <ProjectManagementPage />,
  },
  {
    path: '/settings/users',
    element: <AccountManagementPage />,
  },
  {
    path: '/settings/project-members',
    element: <ProjectMembersPage />,
  },
]
