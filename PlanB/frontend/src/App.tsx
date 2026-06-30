import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import CommandPalette from './components/CommandPalette'
import ShortcutHint from './components/ShortcutHint'
import { PWAUpdatePrompt, PWAInstallPrompt } from './components/PWAPrompt'
import { OfflineBanner } from './hooks/useOfflineStatus.tsx'
import { useCommandPaletteShortcut } from './hooks/useCommandPalette'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import ErrorBoundary from './components/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const WorkspaceListPage = lazy(() => import('./pages/WorkspaceListPage'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const AutomationPage = lazy(() => import('./pages/AutomationPage'))
const SprintPage = lazy(() => import('./pages/SprintPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const MembersPage = lazy(() => import('./pages/MembersPage'))
const PresentationPage = lazy(() => import('./pages/PresentationPage'))
const ProjectSettingsPage = lazy(() => import('./pages/ProjectSettingsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DailyPlannerPage = lazy(() => import('./pages/DailyPlannerPage'))
const WeeklyPlannerPage = lazy(() => import('./pages/WeeklyPlannerPage'))
const AIChatPage = lazy(() => import('./pages/AIChatPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))

function AppShell({ children }) {
  useCommandPaletteShortcut()
  useKeyboardShortcuts()
  return (
    <>
      <OfflineBanner />
      {children}
      <CommandPalette />
      <ShortcutHint />
      <PWAUpdatePrompt />
      <PWAInstallPrompt />
    </>
  )
}

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)', color:'var(--text-muted)', fontSize:14 }}>
      로딩 중...
    </div>
  )
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function PageLoading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)', color:'var(--text-muted)', fontSize:14 }}>
      로딩 중...
    </div>
  )
}

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe)
  useEffect(() => { fetchMe() }, [fetchMe])

  return (
    <BrowserRouter>
      <AppShell>
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login"                                                  element={<LoginPage />} />
              <Route path="/"                                                       element={<PrivateRoute><WorkspaceListPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug"                                       element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/projects/:projectId"                   element={<PrivateRoute><ProjectPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/projects/:projectId/analytics"        element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/projects/:projectId/automation"       element={<PrivateRoute><AutomationPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/projects/:projectId/sprints"           element={<PrivateRoute><SprintPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/projects/:projectId/settings"          element={<PrivateRoute><ProjectSettingsPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/home"                                  element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/planner"                               element={<PrivateRoute><DailyPlannerPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/planner/week"                         element={<PrivateRoute><WeeklyPlannerPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/calendar"                              element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/members"                               element={<PrivateRoute><MembersPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/assistant"                             element={<PrivateRoute><AIChatPage /></PrivateRoute>} />
              <Route path="/workspaces/:slug/notes"                                element={<PrivateRoute><NotesPage /></PrivateRoute>} />
              <Route path="/present/:slug"                                          element={<PresentationPage />} />
              <Route path="*"                                                       element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </BrowserRouter>
  )
}
