import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getPathForView, getViewForPath } from '../constants/navigation'
import { projectOptions } from '../constants/projects'
import { roleLabelMap } from '../constants/roles'
import {
  canAccessView,
  canAdvanceCourse,
  canCreateCourse as canCreateCourseByRole,
  canCreateTicket,
  canEditResearchTask,
  canManageDispatch,
  canUploadPageDraft,
  canUploadStyleDraft,
  getAvailableViews,
} from '../domain/permissions'
import { useCourseStore } from '../hooks/useCourseStore'
import { authService } from '../services/authService'
import { initialAdminAccounts, initialSystemRoles } from '../services/mockAdminData'
import type {
  AdminAccountRecord,
  AuthUser,
  CreateCoursePayload,
  CreateServiceTicketPayload,
  CreateTicketResult,
  CourseRecord,
  CourseStatus,
  DispatchPayload,
  ProjectOption,
  SaveAdminAccountPayload,
  SaveSystemRolePayload,
  SystemRoleRecord,
  UpdateResearchPayload,
  UploadPagePayload,
  UploadStylePayload,
  UserRole,
  ViewKey,
} from '../types'

type AppStateContextValue = {
  view: ViewKey
  role: UserRole
  currentUser: AuthUser | null
  currentProject: ProjectOption | null
  projects: ProjectOption[]
  isAuthenticated: boolean
  hasSelectedProject: boolean
  authenticating: boolean
  courses: CourseRecord[]
  accounts: AdminAccountRecord[]
  systemRoles: SystemRoleRecord[]
  selectedCourse?: CourseRecord
  selectedResearchCourse?: CourseRecord
  stats: ReturnType<typeof useCourseStore>['stats']
  loading: boolean
  mutating: boolean
  error: string | null
  search: string
  statusFilter: 'all' | CourseStatus
  canCreateCourse: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  selectProject: (projectKey: string) => void
  setSearch: (value: string) => void
  setStatusFilter: (value: 'all' | CourseStatus) => void
  navigateToView: (view: ViewKey) => void
  selectCourse: (courseId: string, nextView?: ViewKey) => void
  createCourse: (payload: CreateCoursePayload) => Promise<void>
  bulkCreateCourses: (payloads: CreateCoursePayload[]) => Promise<void>
  updateCourse: (courseId: string, payload: CreateCoursePayload) => Promise<void>
  advanceCourse: (courseId: string) => Promise<void>
  createTicket: (payload: CreateServiceTicketPayload, courseId?: string) => Promise<void>
  updateResearch: (courseId: string, payload: UpdateResearchPayload) => Promise<void>
  saveStyleDispatch: (courseId: string, payload: DispatchPayload) => Promise<void>
  savePageDispatch: (courseId: string, payload: DispatchPayload) => Promise<void>
  uploadStyle: (courseId: string, payload: UploadStylePayload) => Promise<void>
  uploadPage: (courseId: string, payload: UploadPagePayload) => Promise<void>
  saveAdminAccount: (payload: SaveAdminAccountPayload, accountId?: string) => void
  deleteAdminAccount: (accountId: string) => void
  saveSystemRole: (payload: SaveSystemRolePayload, roleId?: string) => void
  deleteSystemRole: (roleId: string) => void
  canAdvanceSelected: boolean
  canCreateAftersales: boolean
  canCreateIteration: boolean
  canEditResearchSelected: boolean
  canManageSelected: boolean
}

const AppStateContext = createContext<AppStateContextValue | null>(null)
const AUTH_STORAGE_KEY = 'design-delivery-auth-user'
const PROJECT_STORAGE_KEY = 'design-delivery-current-project'

function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function getStoredProject(): ProjectOption | null {
  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as ProjectOption
    return projectOptions.find((item) => item.key === parsed.key) ?? null
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    return null
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser())
  const [currentProject, setCurrentProject] = useState<ProjectOption | null>(() => getStoredProject())
  const [authenticating, setAuthenticating] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all')
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>(initialAdminAccounts)
  const [systemRoles, setSystemRoles] = useState<SystemRoleRecord[]>(initialSystemRoles)
  const location = useLocation()
  const navigate = useNavigate()
  const view = useMemo<ViewKey>(() => getViewForPath(location.pathname), [location.pathname])
  const role = currentUser?.role ?? 'planner'
  const courseStore = useCourseStore()

  const {
    courses,
    stats,
    loading,
    mutating,
    error,
    createCourse: createCourseRecord,
    bulkCreateCourses: bulkCreateCourseRecords,
    updateCourse: updateCourseRecord,
    advanceCourse: advanceCourseRecord,
    updateResearch: updateResearchTask,
    saveStyleDispatch: saveStyleDispatchRecord,
    savePageDispatch: savePageDispatchRecord,
    uploadPage: uploadPageDraft,
    uploadStyle: uploadStyleDraft,
    createTicket: createServiceTicket,
  } = courseStore

  useEffect(() => {
    if (!selectedCourseId && courses[0]) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? courses[0],
    [courses, selectedCourseId],
  )
  const selectedResearchCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === selectedCourseId && course.status === 'research',
      ) ?? courses.find((course) => course.status === 'research'),
    [courses, selectedCourseId],
  )
  const canCreateCourse = useMemo(() => canCreateCourseByRole(role), [role])
  const isAuthenticated = Boolean(currentUser)
  const hasSelectedProject = Boolean(currentProject)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (!hasSelectedProject && location.pathname !== '/project-select') {
      navigate('/project-select', { replace: true })
      return
    }

    if (hasSelectedProject && location.pathname === '/project-select') {
      const nextView = getAvailableViews(role)[0]
      if (nextView) {
        navigate(getPathForView(nextView), { replace: true })
      }
      return
    }

    if (!canAccessView(role, view)) {
      const nextView = getAvailableViews(role)[0]
      if (nextView) {
        navigate(getPathForView(nextView), { replace: true })
      }
    }
  }, [hasSelectedProject, isAuthenticated, location.pathname, navigate, role, view])

  function navigateToView(nextView: ViewKey) {
    navigate(getPathForView(nextView))
  }

  function selectCourse(courseId: string, nextView?: ViewKey) {
    setSelectedCourseId(courseId)
    if (nextView) {
      navigateToView(nextView)
    }
  }

  async function login(username: string, password: string) {
    setAuthenticating(true)

    try {
      const user = await authService.login(username, password)
      setCurrentUser(user)
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      navigate('/project-select', { replace: true })
    } finally {
      setAuthenticating(false)
    }
  }

  function selectProject(projectKey: string) {
    const matched = projectOptions.find((item) => item.key === projectKey)
    if (!matched) {
      return
    }

    setCurrentProject(matched)
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(matched))
    const nextView = getAvailableViews(role)[0]
    if (nextView) {
      navigate(getPathForView(nextView), { replace: true })
    }
  }

  function logout() {
    setCurrentUser(null)
    setCurrentProject(null)
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    setSelectedCourseId('')
    setSearch('')
    setStatusFilter('all')
    navigate('/login', { replace: true })
  }

  function saveAdminAccount(payload: SaveAdminAccountPayload, accountId?: string) {
    setAccounts((current) => {
      if (accountId) {
        const next = current.map((account) =>
          account.id === accountId
            ? {
                ...account,
                ...payload,
              }
            : account,
        )

        const updatedAccount = next.find((account) => account.id === accountId)
        if (updatedAccount && currentUser?.id === accountId) {
          const nextCurrentUser = {
            ...currentUser,
            username: updatedAccount.username,
            name: updatedAccount.name,
            role: updatedAccount.role,
          }
          setCurrentUser(nextCurrentUser)
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextCurrentUser))
        }

        return next
      }

      return [
        {
          id: `U-${String(current.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          lastLoginAt: '未登录',
          ...payload,
        },
        ...current,
      ]
    })
  }

  function deleteAdminAccount(accountId: string) {
    if (currentUser?.id === accountId) {
      return
    }

    setAccounts((current) => current.filter((account) => account.id !== accountId))
  }

  function saveSystemRole(payload: SaveSystemRolePayload, roleId?: string) {
    setSystemRoles((current) => {
      if (roleId) {
        return current.map((item) =>
          item.id === roleId
            ? {
                ...item,
                ...payload,
              }
            : item,
        )
      }

      return [
        {
          id: `R-${String(current.length + 1).padStart(3, '0')}`,
          memberCount: 0,
          ...payload,
        },
        ...current,
      ]
    })
  }

  function deleteSystemRole(roleId: string) {
    setSystemRoles((current) => current.filter((item) => item.id !== roleId))
  }

  async function createCourse(payload: CreateCoursePayload) {
    if (!canCreateCourse) {
      return
    }

    const created = await createCourseRecord(payload)
    setSelectedCourseId(created.id)
    navigateToView('courses')
  }

  async function bulkCreateCourses(payloads: CreateCoursePayload[]) {
    if (!canCreateCourse || payloads.length === 0) {
      return
    }

    const created = await bulkCreateCourseRecords(payloads)
    setSelectedCourseId(created[0]?.id ?? '')
    navigateToView('courses')
  }

  async function updateCourse(courseId: string, payload: CreateCoursePayload) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || current.status !== 'research' || !canCreateCourse) {
      return
    }

    const updated = await updateCourseRecord(courseId, payload)
    setSelectedCourseId(updated.id)
    navigateToView('courses')
  }

  async function advanceCourse(courseId: string) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || !canAdvanceCourse(role, current)) {
      return
    }

    const updated = await advanceCourseRecord(courseId)
    setSelectedCourseId(updated.id)
  }

  async function createTicket(payload: CreateServiceTicketPayload, courseId?: string) {
    const targetCourse =
      (courseId ? courses.find((course) => course.id === courseId) : undefined) ?? selectedCourse

    if (!targetCourse || !canCreateTicket(role, payload.type, targetCourse)) {
      return
    }

    const updated = await createServiceTicket(
      targetCourse.id,
      payload,
      `${roleLabelMap[role]} · ${currentUser?.name ?? '当前用户'}`,
    )
    setSelectedCourseId((updated as CreateTicketResult).created.id)
  }

  async function updateResearch(courseId: string, payload: UpdateResearchPayload) {
    const updated = await updateResearchTask(courseId, payload)
    setSelectedCourseId(updated.id)
  }

  async function saveStyleDispatch(courseId: string, payload: DispatchPayload) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || !canManageDispatch(role, current)) {
      return
    }

    const updated = await saveStyleDispatchRecord(courseId, payload)
    setSelectedCourseId(updated.id)

    if (current.status === 'pendingStyleDispatch') {
      const progressed = await advanceCourseRecord(courseId)
      setSelectedCourseId(progressed.id)
    }
  }

  async function savePageDispatch(courseId: string, payload: DispatchPayload) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || !canManageDispatch(role, current)) {
      return
    }

    const updated = await savePageDispatchRecord(courseId, payload)
    setSelectedCourseId(updated.id)

    if (current.status === 'pendingPageDispatch') {
      const progressed = await advanceCourseRecord(courseId)
      setSelectedCourseId(progressed.id)
    }
  }

  async function uploadStyle(courseId: string, payload: UploadStylePayload) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || !canUploadStyleDraft(role, current)) {
      return
    }

    const updated = await uploadStyleDraft(courseId, payload)
    setSelectedCourseId(updated.id)
  }

  async function uploadPage(courseId: string, payload: UploadPagePayload) {
    const current = courses.find((course) => course.id === courseId)
    if (!current || !canUploadPageDraft(role, current)) {
      return
    }

    const updated = await uploadPageDraft(courseId, payload)
    setSelectedCourseId(updated.id)
  }

  const value = useMemo<AppStateContextValue>(
    () => ({
      view,
      role,
      currentUser,
      currentProject,
      projects: projectOptions,
      isAuthenticated,
      hasSelectedProject,
      authenticating,
      courses,
      accounts,
      systemRoles,
      selectedCourse,
      selectedResearchCourse,
      stats,
      loading,
      mutating,
      error,
      search,
      statusFilter,
      canCreateCourse,
      login,
      logout,
      selectProject,
      setSearch,
      setStatusFilter,
      navigateToView,
      selectCourse,
      createCourse,
      bulkCreateCourses,
      updateCourse,
      advanceCourse,
      createTicket,
      updateResearch,
      saveStyleDispatch,
      savePageDispatch,
      uploadStyle,
      uploadPage,
      saveAdminAccount,
      deleteAdminAccount,
      saveSystemRole,
      deleteSystemRole,
      canAdvanceSelected: selectedCourse ? canAdvanceCourse(role, selectedCourse) : false,
      canCreateAftersales: selectedCourse ? canCreateTicket(role, '售后', selectedCourse) : false,
      canCreateIteration: selectedCourse ? canCreateTicket(role, '迭代', selectedCourse) : false,
      canEditResearchSelected: selectedResearchCourse
        ? canEditResearchTask(role, selectedResearchCourse)
        : false,
      canManageSelected: selectedCourse ? canManageDispatch(role, selectedCourse) : false,
    }),
    [
      view,
      role,
      currentUser,
      currentProject,
      isAuthenticated,
      hasSelectedProject,
      authenticating,
      courses,
      accounts,
      systemRoles,
      selectedCourse,
      selectedResearchCourse,
      stats,
      loading,
      mutating,
      error,
      search,
      statusFilter,
      canCreateCourse,
      login,
      logout,
      selectProject,
      navigateToView,
      selectCourse,
      createCourse,
      bulkCreateCourses,
      updateCourse,
      advanceCourse,
      createTicket,
      updateResearch,
      saveStyleDispatch,
      savePageDispatch,
      uploadStyle,
      uploadPage,
      saveAdminAccount,
      deleteAdminAccount,
      saveSystemRole,
      deleteSystemRole,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return context
}
