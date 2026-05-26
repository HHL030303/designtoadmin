import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AUTH_STORAGE_KEY,
  LOGIN_REDIRECT_STORAGE_KEY,
  PROJECT_ROLE_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
} from '../constants/storage'
import { getPathForView, getViewForPath } from '../constants/navigation'
import { backendRoleMap, roleLabelMap } from '../constants/roles'
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
import type {
  AvailableProjectRole,
  AuthUser,
  CreateCoursePayload,
  CreateServiceTicketPayload,
  CreateTicketResult,
  CourseRecord,
  CourseStatus,
  DispatchPayload,
  ProjectOption,
  UpdateResearchPayload,
  UploadPagePayload,
  UploadStylePayload,
  UserRole,
  ViewKey,
} from '../types'

const DEFAULT_AUTHORIZED_VIEW: ViewKey = 'courses'

function getProjectRoles(project: ProjectOption | null) {
  if (!project || !Array.isArray(project.roles)) {
    return []
  }

  const uniqueRoles = new Map<UserRole, AvailableProjectRole>()

  project.roles.forEach((item) => {
    const mappedRole = backendRoleMap[item.code]

    if (!mappedRole || uniqueRoles.has(mappedRole)) {
      return
    }

    uniqueRoles.set(mappedRole, {
      code: item.code,
      name: item.name,
      role: mappedRole,
    })
  })

  return Array.from(uniqueRoles.values())
}

function getProjectRole(project: ProjectOption | null, fallbackRole: UserRole) {
  return getProjectRoles(project)[0]?.role ?? fallbackRole
}

function getStoredProjectRoleMap() {
  const raw = window.localStorage.getItem(PROJECT_ROLE_STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as Record<string, UserRole>
  } catch {
    window.localStorage.removeItem(PROJECT_ROLE_STORAGE_KEY)
    return {}
  }
}

function setStoredProjectRole(projectId: string, role: UserRole) {
  const current = getStoredProjectRoleMap()
  current[projectId] = role
  window.localStorage.setItem(PROJECT_ROLE_STORAGE_KEY, JSON.stringify(current))
}

function normalizeLoginRedirectPath(pathname?: string | null): string | null {
  if (!pathname || typeof pathname !== 'string') {
    return null
  }

  const trimmedPath = pathname.trim()

  if (!trimmedPath.startsWith('/')) {
    return null
  }

  if (trimmedPath.startsWith('/login') || trimmedPath.startsWith('/project-select')) {
    return null
  }

  return trimmedPath
}

function getStoredLoginRedirectPath(): string | null {
  const storedPath = window.sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)
  const normalizedPath = normalizeLoginRedirectPath(storedPath)

  if (!normalizedPath && storedPath) {
    console.error(111)
    window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
  }

  return normalizedPath
}

function setStoredLoginRedirectPath(pathname?: string | null): void {
  const normalizedPath = normalizeLoginRedirectPath(pathname)

  if (!normalizedPath) {
    window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, normalizedPath)
}

function shouldResetPathOnProjectSwitch(pathname: string): boolean {
  // 详情页地址通常带着旧项目下的实体 ID，切项目后继续停留大概率会落到不存在的数据。
  // 目前先把任务详情页收敛到列表页，避免新项目打开旧项目任务详情。
  return pathname.startsWith('/courses/') && pathname !== '/courses'
}

type AppStateContextValue = {
  view: ViewKey
  role: UserRole
  availableRoles: AvailableProjectRole[]
  currentUser: AuthUser | null
  currentProject: ProjectOption | null
  projects: ProjectOption[]
  isAuthenticated: boolean
  hasSelectedProject: boolean
  authenticating: boolean
  courses: CourseRecord[]
  selectedCourse?: CourseRecord
  selectedResearchCourse?: CourseRecord
  stats: ReturnType<typeof useCourseStore>['stats']
  loading: boolean
  mutating: boolean
  error: string | null
  search: string
  statusFilter: 'all' | CourseStatus
  canCreateCourse: boolean
  login: (email: string, password: string, redirectPath?: string | null) => Promise<void>
  logout: () => Promise<void>
  refreshCurrentUser: () => Promise<void>
  selectProject: (projectKey: string) => void
  switchRole: (role: UserRole) => void
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
  canAdvanceSelected: boolean
  canCreateAftersales: boolean
  canCreateIteration: boolean
  canEditResearchSelected: boolean
  canManageSelected: boolean
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>

    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.email !== 'string' ||
      typeof parsed?.name !== 'string' ||
      !Array.isArray(parsed?.projects)
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    return {
      ...parsed,
      projects: parsed.projects.map((project) => ({
        ...project,
        workwxBound: project.workwxBound ?? false,
      })),
      role: parsed.role ?? 'planner',
      status: parsed.status ?? 'enabled',
    } as AuthUser
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
    const parsed = JSON.parse(raw) as Partial<ProjectOption>

    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.key !== 'string' ||
      !Array.isArray(parsed?.roles)
    ) {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY)
      return null
    }

    return parsed as ProjectOption
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    return null
  }
}

function getInitialActiveRole(
  currentProject: ProjectOption | null,
  currentUser: AuthUser | null,
): UserRole {
  if (!currentProject) {
    return currentUser?.role ?? 'planner'
  }

  const storedRole = getStoredProjectRoleMap()[currentProject.id]
  const availableRoles = getProjectRoles(currentProject)

  if (availableRoles.some((item) => item.role === storedRole)) {
    return storedRole
  }

  return getProjectRole(currentProject, currentUser?.role ?? 'planner')
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser())
  const [currentProject, setCurrentProject] = useState<ProjectOption | null>(() => getStoredProject())
  const [activeRole, setActiveRole] = useState<UserRole>(() =>
    getInitialActiveRole(getStoredProject(), getStoredUser()),
  )
  const [authenticating, setAuthenticating] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all')
  const location = useLocation()
  const navigate = useNavigate()
  const projects = currentUser?.projects ?? []
  const availableRoles = useMemo(() => getProjectRoles(currentProject), [currentProject])
  const storedProjectRole = useMemo(
    () => (currentProject ? getStoredProjectRoleMap()[currentProject.id] : undefined),
    [currentProject],
  )
  const role = useMemo(() => {
    if (availableRoles.some((item) => item.role === activeRole)) {
      return activeRole
    }

    if (availableRoles.some((item) => item.role === storedProjectRole)) {
      return storedProjectRole as UserRole
    }

    return getProjectRole(currentProject, currentUser?.role ?? 'planner')
  }, [activeRole, availableRoles, currentProject, currentUser?.role, storedProjectRole])
  const matchedView = useMemo(() => getViewForPath(location.pathname), [location.pathname])
  const view = useMemo<ViewKey>(() => {
    const availableViews = getAvailableViews(role)
    return matchedView ?? availableViews[0] ?? 'dashboard'
  }, [matchedView, role])
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

  useEffect(() => {
    if (!currentUser) {
      return
    }

    void refreshCurrentUser()
  }, [])

  useEffect(() => {
    if (!currentProject) {
      setActiveRole(currentUser?.role ?? 'planner')
      return
    }

    const matched = projects.find((item) => item.key === currentProject.key)
    if (matched) {
      if (
        matched.name !== currentProject.name ||
        matched.roles.length !== currentProject.roles.length
      ) {
        setCurrentProject(matched)
        window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(matched))
      }
      return
    }

    setCurrentProject(null)
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
  }, [currentProject, currentUser?.role, projects])

  useEffect(() => {
    if (!currentProject) {
      return
    }

    const storedRole = getStoredProjectRoleMap()[currentProject.id]
    const fallbackRole = getProjectRole(currentProject, currentUser?.role ?? 'planner')
    // 角色切换后要优先相信当前内存里的 activeRole，这样顶部角色选择器和左侧菜单
    // 才能立即跟着更新；localStorage 只作为项目切换/刷新后的兜底恢复值。
    const nextRole = availableRoles.some((item) => item.role === activeRole)
      ? activeRole
      : availableRoles.some((item) => item.role === storedRole)
        ? storedRole
        : fallbackRole

    if (nextRole !== activeRole) {
      setActiveRole(nextRole)
    }

    setStoredProjectRole(currentProject.id, nextRole)
  }, [activeRole, availableRoles, currentProject, currentUser?.role])

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
  const currentFullPath = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (!hasSelectedProject && location.pathname !== '/project-select') {
      navigate('/project-select', { replace: true })
      return
    }

    if (hasSelectedProject && location.pathname === '/project-select') {
      const redirectPath = getStoredLoginRedirectPath()

      if (redirectPath) {
        navigate(redirectPath, { replace: true })
        return
      }

      window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)

      const nextView = canAccessView(role, DEFAULT_AUTHORIZED_VIEW)
        ? DEFAULT_AUTHORIZED_VIEW
        : getAvailableViews(role)[0]
      if (nextView) {
        navigate(getPathForView(nextView), { replace: true })
      }
      return
    }

    const redirectPath = getStoredLoginRedirectPath()
    if (redirectPath && redirectPath === currentFullPath) {
      window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
    }

    if (matchedView && !canAccessView(role, matchedView)) {
      const nextView = canAccessView(role, DEFAULT_AUTHORIZED_VIEW)
        ? DEFAULT_AUTHORIZED_VIEW
        : getAvailableViews(role)[0]
      if (nextView) {
        navigate(getPathForView(nextView), { replace: true })
      }
    }
  }, [currentFullPath, hasSelectedProject, isAuthenticated, location.pathname, matchedView, navigate, role])

  function navigateToView(nextView: ViewKey) {
    navigate(getPathForView(nextView))
  }

  function selectCourse(courseId: string, nextView?: ViewKey) {
    setSelectedCourseId(courseId)
    if (nextView) {
      navigateToView(nextView)
    }
  }

  async function login(email: string, password: string, redirectPath?: string | null) {
    setAuthenticating(true)

    try {
      const user = await authService.login(email, password)
      setCurrentUser(user)
      setActiveRole(user.role)
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      window.localStorage.removeItem(PROJECT_STORAGE_KEY)
      setCurrentProject(null)
      if (redirectPath !== undefined) {
        if (redirectPath === null) {
          if (!getStoredLoginRedirectPath()) {
            setStoredLoginRedirectPath(null)
          }
        } else {
          setStoredLoginRedirectPath(redirectPath)
        }
      }
      navigate('/project-select', { replace: true })
    } finally {
      setAuthenticating(false)
    }
  }

  async function refreshCurrentUser() {
    const user = await authService.getCurrentUser()
    setCurrentUser(user)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  }

  function selectProject(projectKey: string) {
    if (currentProject?.key === projectKey) {
      return
    }

    const matched = projects.find((item) => item.key === projectKey)
    if (!matched) {
      return
    }

    setCurrentProject(matched)
    const storedRole = getStoredProjectRoleMap()[matched.id]
    const nextRole = getProjectRoles(matched).some((item) => item.role === storedRole)
      ? storedRole
      : getProjectRole(matched, currentUser?.role ?? 'planner')
    setActiveRole(nextRole)
    setStoredProjectRole(matched.id, nextRole)
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(matched))

    if (location.pathname === '/project-select') {
      return
    }

    if (shouldResetPathOnProjectSwitch(location.pathname)) {
      navigate('/courses', { replace: true })
      return
    }

    if (matchedView && canAccessView(nextRole, matchedView)) {
      return
    }

    const nextView = canAccessView(nextRole, DEFAULT_AUTHORIZED_VIEW)
      ? DEFAULT_AUTHORIZED_VIEW
      : getAvailableViews(nextRole)[0]
    if (nextView) {
      navigate(getPathForView(nextView), { replace: true })
    }
  }

  function switchRole(nextRole: UserRole) {
    if (!availableRoles.some((item) => item.role === nextRole)) {
      return
    }

    setActiveRole(nextRole)

    if (currentProject) {
      setStoredProjectRole(currentProject.id, nextRole)
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Keep local logout resilient even when the session is already invalid.
    }

    setCurrentUser(null)
    setCurrentProject(null)
    setActiveRole('planner')
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
    setSelectedCourseId('')
    setSearch('')
    setStatusFilter('all')
    navigate('/login', { replace: true })
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
      availableRoles,
      currentUser,
      currentProject,
      projects,
      isAuthenticated,
      hasSelectedProject,
      authenticating,
      courses,
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
      refreshCurrentUser,
      selectProject,
      switchRole,
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
      availableRoles,
      currentUser,
      currentProject,
      projects,
      isAuthenticated,
      hasSelectedProject,
      authenticating,
      courses,
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
      refreshCurrentUser,
      selectProject,
      switchRole,
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
