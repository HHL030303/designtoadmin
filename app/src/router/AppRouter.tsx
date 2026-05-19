import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LOGIN_REDIRECT_STORAGE_KEY } from '../constants/storage'
import { getPathForView, getViewForPath } from '../constants/navigation'
import { getAvailableViews } from '../domain/permissions'
import { canAccessView } from '../domain/permissions'
import { useAppState } from '../context/AppStateContext'
import { AppLayout } from './AppLayout'
import { privateRoutes, publicRoutes } from './routeConfig'

const DEFAULT_AUTHORIZED_PATH = '/courses'

function persistLoginRedirectPath(pathname: string): void {
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/project-select') ||
    pathname === '/'
  ) {
    return
  }

  window.sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, pathname)
}

export function AppRouter() {
  const { role, isAuthenticated, hasSelectedProject } = useAppState()
  const location = useLocation()
  const currentFullPath = `${location.pathname}${location.search}${location.hash}`
  const normalizedPathname =
    location.pathname === '/'
      ? '/'
      : location.pathname.replace(/\/+$/, '') || '/'
  const fallbackPath =
    getAvailableViews(role).includes('courses')
      ? DEFAULT_AUTHORIZED_PATH
      : getPathForView(getAvailableViews(role)[0])
  const matchedView = getViewForPath(normalizedPathname)
  const preservedPrivatePath =
    matchedView && canAccessView(role, matchedView) ? normalizedPathname : fallbackPath
  const loginRoute = publicRoutes.find((route) => route.path === '/login')
  const projectSelectRoute = publicRoutes.find((route) => route.path === '/project-select')

  return (
    <Routes>
      {location.pathname !== normalizedPathname ? (
        <Route path="*" element={<Navigate to={normalizedPathname} replace />} />
      ) : null}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={hasSelectedProject ? preservedPrivatePath : '/project-select'} replace />
          ) : (
            loginRoute?.element ?? <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/project-select"
        element={
          isAuthenticated ? (
            hasSelectedProject ? (
              <Navigate to={preservedPrivatePath} replace />
            ) : (
              projectSelectRoute?.element ?? <Navigate to="/login" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? (hasSelectedProject ? preservedPrivatePath : '/project-select')
                : '/login'
            }
            replace
          />
        }
      />
      <Route
        element={
          isAuthenticated && hasSelectedProject ? (
            <AppLayout />
          ) : (
            (() => {
              if (!isAuthenticated) {
                persistLoginRedirectPath(currentFullPath)
              }

              return (
                <Navigate
                  to={isAuthenticated ? '/project-select' : '/login'}
                  replace
                  state={isAuthenticated ? undefined : { from: currentFullPath }}
                />
              )
            })()
          )
        }
      >
        {privateRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? (hasSelectedProject ? preservedPrivatePath : '/project-select')
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
  )
}
