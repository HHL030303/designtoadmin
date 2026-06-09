import type { ReactElement } from 'react'
import { AccountManagementPage } from '../pages/AccountManagementPage'
import { AllTicketsPage } from '../pages/AllTicketsPage'
import { CourseTaskDetailPage } from '../pages/CourseTaskDetailPage'
import { CoursesPage } from '../pages/CoursesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { MyTasksPage } from '../pages/MyTasksPage'
import { ProjectManagementPage } from '../pages/ProjectManagementPage'
import { ProjectMembersPage } from '../pages/ProjectMembersPage'
import { ProjectSelectPage } from '../pages/ProjectSelectPage'
import { TaskStatisticsPage } from '../pages/TaskStatisticsPage'

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
    path: '/tickets/custom/:menuKey',
    element: <AllTicketsPage />,
  },
  {
    path: '/task-statistics',
    element: <TaskStatisticsPage />,
  },
  {
    path: '/task-statistics/custom/:menuKey',
    element: <TaskStatisticsPage />,
  },
  {
    path: '/my-tasks',
    element: <MyTasksPage />,
  },
  {
    path: '/courses',
    element: <CoursesPage />,
  },
  {
    path: '/courses/:taskId',
    element: <CourseTaskDetailPage />,
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
