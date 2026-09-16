import { useMemo, useRef, useState } from 'react'
import {
  OperationsLayout,
  OperationsNavigation,
  Drawer,
  Dialog,
} from '../../components/design-system/organisms/OperationsLayout.jsx'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { createAdminApi } from './adminApi.js'
import { AdminLink, RequestState } from './adminShared.jsx'
import { AdminOverview } from './AdminOverview.jsx'
import { AdminRecords, AdminProject, AdminModules } from './AdminRecords.jsx'
import { ProductRecipes } from './ProductRecipes.jsx'
import { RecipeEditor } from './RecipeEditor.jsx'
import { AtomsRoot as DesignSystemRoot } from 'brutalist-design-system'
import './admin.css'
const navigation = [
  ['overview', 'Overview'],
  ['users', 'Users'],
  ['projects', 'Projects'],
  ['assets', 'Assets'],
  ['recipes', 'Product recipes'],
  ['modules', 'Modules'],
  ['jobs', 'System work'],
  ['activity', 'Activity'],
]
export function AdminApp({
  api,
  actor,
  route,
  onNavigate,
  onDirtyChange,
  onBusyChange,
  loading = false,
  sessionError,
  leavePrompt = false,
  onLeaveCancel,
  onLeaveConfirm,
}) {
  const client = useMemo(() => createAdminApi(api), [api])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const cancelLeave = () => onLeaveCancel?.(menuButtonRef.current)
  const section =
    route.section === 'workflows' ? 'recipes' : route.section || 'overview'
  const navigate = (to) => {
    onNavigate(to)
    setMenuOpen(false)
  }
  const menu = (
    <OperationsNavigation aria-label="Administration" title="Studio admin">
      {navigation.map(([key, label]) => (
        <AdminLink
          key={key}
          to={key === 'overview' ? '/mvp/admin' : `/mvp/admin/${key}`}
          onNavigate={navigate}
          aria-current={section === key ? 'page' : undefined}
        >
          {label}
        </AdminLink>
      ))}
      <AdminLink
        className="v2-operations-navigation__back"
        to="/"
        onNavigate={navigate}
      >
        Back to Studio
      </AdminLink>
    </OperationsNavigation>
  )
  const allowed =
    actor?.role === 'admin' && !actor.disabled && !actor.disabledAt
  return (
    <DesignSystemRoot><div
      className={`admin-root${section === 'recipes' && route.id ? ' admin-root--recipe' : ''}`}
    >
      <a className="bs-skip" href="#admin-main">
        Skip to admin workspace
      </a>
      <OperationsLayout
        className="admin-shell"
        navigation={<div className="admin-desktop-navigation">{menu}</div>}
        header={
          <div className="admin-shell-header">
            <span className="admin-mobile-menu"><AppButton
              ref={menuButtonRef}
              onClick={() => setMenuOpen(true)}
            >
              Admin menu
            </AppButton></span>
            <span>Administration</span>
            <span>{actor?.displayName || actor?.email || ''}</span>
          </div>
        }
      >
        <Drawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title="Admin navigation"
          returnFocusRef={menuButtonRef}
          side="left"
        >
          {menu}
        </Drawer>
        <Dialog
          open={leavePrompt}
          onOpenChange={(open) => {
            if (!open) cancelLeave()
          }}
          title="Discard unsaved recipe changes?"
          description="Your changes have not been saved. Stay to keep editing or discard them and continue."
        >
          <div className="admin-dialog-actions">
            <AppButton onClick={cancelLeave}>Keep editing</AppButton>
            <AppButton variant="danger" onClick={onLeaveConfirm}>
              Discard and leave
            </AppButton>
          </div>
        </Dialog>
        <div id="admin-main" tabIndex={-1}>
          {loading ? (
            <div className="admin-page">
              <RequestState loading />
            </div>
          ) : !allowed ? (
            <section className="admin-page">
              <h1>Access denied</h1>
              <p>
                {sessionError?.message ||
                  'An enabled administrator account is required to open this workspace.'}
              </p>
              <AdminLink to="/" onNavigate={navigate}>
                Back to Studio
              </AdminLink>
            </section>
          ) : section === 'overview' ? (
            <AdminOverview client={client} onNavigate={navigate} />
          ) : section === 'recipes' ? (
            route.id ? (
              <RecipeEditor
                key={route.id}
                client={client}
                id={route.id}
                onNavigate={navigate}
                onDirtyChange={onDirtyChange}
                onBusyChange={onBusyChange}
              />
            ) : (
              <ProductRecipes
                client={client}
                onNavigate={navigate}
                compatibility={route.section === 'workflows'}
              />
            )
          ) : section === 'projects' && route.id ? (
            <AdminProject
              key={route.id}
              client={client}
              id={route.id}
              onNavigate={navigate}
            />
          ) : section === 'modules' ? (
            <AdminModules client={client} />
          ) : ['users', 'projects', 'assets', 'jobs', 'activity'].includes(
              section,
            ) ? (
            <AdminRecords
              key={`${section}:${route.search || ''}`}
              client={client}
              section={section}
              onNavigate={navigate}
              initialSearch={route.search}
            />
          ) : (
            <section className="admin-page">
              <h1>Page not found</h1>
              <AdminLink to="/mvp/admin" onNavigate={navigate}>
                Go to overview
              </AdminLink>
            </section>
          )}
        </div>
      </OperationsLayout>
    </div></DesignSystemRoot>
  )
}
