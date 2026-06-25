import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import CommandPalette from './components/CommandPalette'
import ShortcutHint from './components/ShortcutHint'
import { PWAUpdatePrompt, PWAInstallPrompt } from './components/PWAPrompt'
import { OfflineBanner } from './hooks/useOfflineStatus.jsx'
import { useCommandPaletteShortcut } from './hooks/useCommandPalette'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import LoginPage from './pages/LoginPage'
import WorkspaceListPage from './pages/WorkspaceListPage'
import WorkspacePage from './pages/WorkspacePage'
import ProjectPage from './pages/ProjectPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AutomationPage from './pages/AutomationPage'
import SprintPage from './pages/SprintPage'
import CalendarPage from './pages/CalendarPage'
import MembersPage from './pages/MembersPage'
import PresentationPage from './pages/PresentationPage'
import ProjectSettingsPage from './pages/ProjectSettingsPage'
import DashboardPage from './pages/DashboardPage'
import DailyPlannerPage from './pages/DailyPlannerPage'
import WeeklyPlannerPage from './pages/WeeklyPlannerPage'

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

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe)
  useEffect(() => { fetchMe() }, [fetchMe])

  return (
    <BrowserRouter>
      <AppShell>
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
          <Route path="/present/:slug"                                          element={<PresentationPage />} />
          <Route path="*"                                                       element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
