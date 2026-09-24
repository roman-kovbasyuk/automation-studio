import { FigmaPairingDialog } from './FigmaPairingDialog.jsx'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  AlertCircle,
  Check,
  ChevronDown,
  CircleHelp,
  LayoutTemplate,
  LogOut,
  Menu,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shapes,
  Copy,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { createStudioApi } from './api.js'
import { useStudioAuth } from './auth.js'
import { HomeScreen } from './HomeScreen.jsx'
import { CampaignPage } from './campaign/CampaignPage.jsx'
import { useCampaignRuntime } from './campaign/useCampaignRuntime.js'
import { campaignModuleUrl, parseCampaignModule } from './campaign/campaignRoutes.js'
import { SettingsScreen } from './SettingsScreen.jsx'
import { AssetComingSoon, NewAssetScreen, ProjectTypeIcon, getProjectType } from './NewAssetScreen.jsx'
import { AdminApp } from './admin/AdminApp.jsx'
import { AtomsRoot as DesignSystemRoot, TextField, Skeleton, Heading } from 'brutalist-design-system'
import { SidebarPanel, AppButton, Menu as ActionMenu, Dialog, Drawer, Alert, AITaskStatus, StatusBadge } from "../components/design-system/compatibility.jsx"
import { SidebarAccountMenu } from './SidebarAccountMenu.jsx'
import { Button, ErrorNotice } from './primitives.jsx'
import {
  editableStatuses,
  routeFromLocation,
  statusLabel,
} from './workflow.js'
import './studio.css'
import './campaign-layout.css'
import { forgetPendingUploads, readPendingUploads, rememberPendingUploads } from './campaign/pendingUploads.js'

const TemplateLibrary = lazy(() => import('./TemplateLibrary.jsx')
  .then(module => ({ default: module.TemplateLibrary })))
const BrandDesignSystemPage = lazy(() => import('./brand/BrandDesignSystemPage.jsx')
  .then(module => ({ default: module.BrandDesignSystemPage })))

const readRoute = () => ({ ...routeFromLocation(location.pathname, location.search),
  module: parseCampaignModule(location.search, location.hash) })

export function StudioApp() {
  const auth = useStudioAuth()
  const api = useMemo(
    () =>
      createStudioApi({ getToken: auth.getToken, getHeaders: auth.getHeaders }),
    [auth.user, auth.demo, auth.role],
  )
  if (auth.loading)
    return (
      <div className="bs-auth" role="status">
        <span className="bs-wordmark">Automation Studio</span>
        <p>Opening your workspace…</p>
      </div>
    )
  if (!auth.user)
    return (
      <DesignSystemRoot><div className="bs-auth">
        <span className="bs-wordmark">
          <Shapes size={24} />
          Automation Studio
        </span>
        <h1>
          Good ideas deserve
          <br />a great campaign.
        </h1>
        <p>Sign in to create, review and deliver with your team.</p>
        {auth.error && <p role="alert">{auth.error}</p>}
        <Button primary onClick={auth.signIn}>
          Continue with Google
          <ArrowUpRight size={18} />
        </Button>
        <a href="/docs/">Read the team documentation</a>
      </div></DesignSystemRoot>
    )
  return (
    <ConnectedStudio
      key={`${auth.demo ? auth.role : auth.user.uid}`}
      api={api}
      demo={auth.demo}
      authMethods={auth}
      onSignOut={auth.signOut}
    />
  )
}

export function ConnectedStudio({ api, demo = false, authMethods, onSignOut, prototypeMode = false }) {
  const [figmaPairingId,setFigmaPairingId]=useState(()=>new URLSearchParams(window.location.search).get('figmaPairing'))
  const [scrollbarActive, setScrollbarActive] = useState(false)
  const scrollbarTimer = useRef(null)
  useEffect(() => () => clearTimeout(scrollbarTimer.current), [])
  function showSidebarScrollbar() {
    setScrollbarActive(true)
    clearTimeout(scrollbarTimer.current)
    scrollbarTimer.current = setTimeout(() => setScrollbarActive(false), 900)
  }

  const [actor, setActor] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [templates, setTemplates] = useState([])
  const [workspace, setWorkspace] = useState(null)
  const [personalSettings, setPersonalSettings] = useState(null)
  const [generationReadiness, setGenerationReadiness] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [route, setRoute] = useState(readRoute)
  const [loading, setLoading] = useState(true)
  const [studioListsLoading, setStudioListsLoading] = useState(false)
  const studioListsDeferred = useRef(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState('')
  const [notice, setNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [pinnedIds, setPinnedIds] = useState([])
  const [openCampaignMenu, setOpenCampaignMenu] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef(null)
  const titleDraft = useRef('')
  const [requestedTemplate, setRequestedTemplate] = useState(null)
  const dirtyRef = useRef(false)
  const adminBusyRef = useRef(false)
  const [adminLeavePath, setAdminLeavePath] = useState(null)
  const adminLeaveFocus = useRef(null)
  const markAdminBusy = useCallback(value => { adminBusyRef.current = value }, [])
  const loadBrandSystems = useCallback(() => api.listBrandSystems ? api.listBrandSystems() : Promise.resolve({ brands: [] }), [api])
  const inFlight = useRef(false)
  const loadId = useRef(0)
  const mainRef = useRef(null)
  const deleteTriggerRef = useRef(null)
  const pendingSubmissions = useRef(new Map())
  // Re-renders after an interrupted-upload notice is dismissed.
  const [, setInterruptedUploadsVersion] = useState(0)
  const runtime = useCampaignRuntime({ api, actor, templates,
    workspace: route.view === 'campaign' && workspace?.campaign.id === route.id ? workspace : null,
    onCampaignChange: campaign => {
      setWorkspace(current => current?.campaign.id === campaign.id ? { ...current, campaign } : current)
      setCampaigns(items => items.map(item => item.id === campaign.id ? campaign : item))
    }, onError: setError })
  const runtimeRef = useRef(runtime)
  runtimeRef.current = runtime
  const acceptedLocation = useRef({ route, url: location.pathname + location.search + location.hash })
  useEffect(() => { acceptedLocation.current = { route, url: location.pathname + location.search + location.hash } }, [route])
  const hasUnsavedChanges = () => dirtyRef.current || runtimeRef.current?.hasDirty()
  const campaignBusy = () => adminBusyRef.current || inFlight.current || runtimeRef.current?.isBusy()
  const markDirty = useCallback((value) => {
    dirtyRef.current = value
  }, [])
  useEffect(() => {
    if (!actor?.id) return
    try {
      const saved = JSON.parse(localStorage.getItem(`studio:pins:${actor.id}`) ?? '[]')
      setPinnedIds(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [])
    } catch {
      setPinnedIds([])
    }
  }, [actor?.id])
  function togglePin(id) {
    const next = pinnedIds.includes(id) ? pinnedIds.filter((value) => value !== id) : [id, ...pinnedIds]
    setPinnedIds(next)
    setOpenCampaignMenu(null)
    try {
      localStorage.setItem(`studio:pins:${actor.id}`, JSON.stringify(next))
    } catch { /* Pins still work for this session when browser storage is unavailable. */ }
  }
  function closeDeleteConfirmation({ restoreFocus = true } = {}) {
    setDeleteConfirmation(null)
    if (restoreFocus) requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }
  function requestDeleteCampaign(campaign, trigger) {
    if (!editor || campaignBusy()) return
    deleteTriggerRef.current = trigger
    setOpenCampaignMenu(null)
    setDeleteConfirmation(campaign)
  }
  const focusSearchInput = useCallback(() => {
    requestAnimationFrame(() => {
      const scope = document.querySelector('[role="dialog"] .bs-mobile-navigation') ?? document.getElementById('sidebar-create')
      const input = scope?.querySelector('input[type="search"]')
      if (input) input.focus()
      else scope?.querySelector('button[aria-label="Search campaigns"]')?.click()
    })
  }, [])
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearch('')
  }, [])
  useEffect(() => {
    if (!editingTitle || !titleRef.current) return
    titleRef.current.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(titleRef.current)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [editingTitle])

  const loadLists = useCallback(async () => {
    // Keep Studio's existing load timing; administration does not depend on
    // the legacy campaign/template endpoints being available.
    if (readRoute().view === 'admin') {
      studioListsDeferred.current = true
      setActor(await api.getSession())
      return
    }
    const [session, campaignList, templateList] = await Promise.all([
      api.getSession(),
      api.listCampaigns(),
      api.listTemplates(),
    ])
    setActor(session)
    setCampaigns(campaignList.campaigns)
    setTemplates(templateList.templates)
    studioListsDeferred.current = false
  }, [api])
  useEffect(() => {
    let active = true
    loadLists()
      .catch((value) => {
        if (active) setError(value)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadLists])
  useEffect(() => {
    if (route.view === 'admin' || !studioListsDeferred.current) return
    let active = true
    setStudioListsLoading(true)
    Promise.all([api.listCampaigns(), api.listTemplates()]).then(([campaignList, templateList]) => {
      if (!active) return
      setCampaigns(campaignList.campaigns)
      setTemplates(templateList.templates)
      studioListsDeferred.current = false
    }).catch(value => {
      if (active) setError(value)
    }).finally(() => {
      if (active) setStudioListsLoading(false)
    })
    return () => { active = false }
  }, [api, route.view])
  const previousView = useRef(route.view)
  useEffect(() => {
    const enteringTemplates = route.view === 'templates' && previousView.current !== 'templates'
    previousView.current = route.view
    if (!enteringTemplates || studioListsDeferred.current) return
    let active = true
    api.listTemplates().then(value => {
      if (active) setTemplates(value.templates)
    }).catch(value => {
      if (active) setError(value)
    })
    return () => { active = false }
  }, [api, route.view])
  const loadWorkspace = useCallback(
    async (id) => {
      const ticket = ++loadId.current
      setWorkspaceLoading(true)
      try {
        const value = await api.getWorkspace(id)
        if (ticket === loadId.current) {
          setWorkspace(value)
          setCampaigns((items) =>
            items.map((item) => (item.id === id ? value.campaign : item)),
          )
        }
        return value
      } finally {
        if (ticket === loadId.current) setWorkspaceLoading(false)
      }
    },
    [api],
  )
  useEffect(() => {
    if (route.view === 'campaign' && route.id) {
      setWorkspace(null)
      setError(null)
      loadWorkspace(route.id).catch(setError)
    } else {
      ++loadId.current
      setWorkspaceLoading(false)
    }
  }, [route.view, route.id, loadWorkspace])
  const loadPersonalSettings = useCallback(async () => {
    setSettingsLoading(true)
    setError(null)
    try {
      const value = await api.getPersonalSettings()
      setPersonalSettings(value)
    } catch (value) {
      setPersonalSettings(null)
      setError(value)
    } finally {
      setSettingsLoading(false)
    }
  }, [api])
  const loadGenerationReadiness = useCallback(async () => {
    if (typeof api.getGenerationReadiness !== 'function') return
    try {
      setGenerationReadiness(await api.getGenerationReadiness())
    } catch (value) {
      setGenerationReadiness({
        state: 'unavailable', reasonCode: 'readiness_unavailable',
        message: 'AI readiness could not be checked. Open Settings before generating.',
        destination: null, textModel: null, imageModel: null, maskedCredential: null,
        spendingControl: 'external',
      })
    }
  }, [api])
  useEffect(() => {
    if (route.view !== 'settings') return
    setPersonalSettings(null)
    loadPersonalSettings()
  }, [loadPersonalSettings, route.view])
  useEffect(() => {
    if (!actor?.id || route.view === 'admin' || route.view === 'campaign') return
    loadGenerationReadiness()
  }, [actor?.id, loadGenerationReadiness, route.view])
  useEffect(() => {
    const pop = () => {
      const next = readRoute()
      const nextUrl = location.pathname + location.search + location.hash
      const previous = acceptedLocation.current
      const sameCampaign = next.view === 'campaign' && previous.route.view === 'campaign' && next.id === previous.route.id
      if (!sameCampaign) {
        if (previous.route.view === 'admin' && dirtyRef.current && !adminBusyRef.current) {
          history.pushState({}, '', previous.url)
          adminLeaveFocus.current = document.activeElement
          setAdminLeavePath(nextUrl)
          return
        }
        if (adminBusyRef.current || inFlight.current || runtimeRef.current?.isBusy() ||
          ((dirtyRef.current || runtimeRef.current?.hasDirty()) && !window.confirm('Discard your unsaved changes?'))) {
          history.pushState({}, '', previous.url)
          return
        }
        markDirty(false)
      }
      setRoute(next)
    }
    const unload = (event) => {
      if (dirtyRef.current || runtimeRef.current?.hasDirty()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('popstate', pop)
    window.addEventListener('hashchange', pop)
    window.addEventListener('beforeunload', unload)
    return () => {
      window.removeEventListener('popstate', pop)
      window.removeEventListener('hashchange', pop)
      window.removeEventListener('beforeunload', unload)
    }
  }, [markDirty])
  useEffect(() => {
    if (route.view === 'admin') return
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        focusSearchInput()
      }
      if (event.key === 'Escape') {
        setOpenCampaignMenu(null)
        setUserMenuOpen(false)
        if (searchOpen) closeSearch()
      }
    }
    const onPointerDown = (event) => {
      if (searchOpen && !event.target.closest?.('.bs-brand-row')) closeSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [closeSearch, focusSearchInput, searchOpen, route.view])
  useEffect(() => {
    if (!workspaceLoading) mainRef.current?.focus({ preventScroll: true })
  }, [route.view, route.id, workspaceLoading])
  function navigate(path, { discardAdmin = false } = {}) {
    if (campaignBusy()) return
    const target = new URL(path, location.origin)
    const next = routeFromLocation(target.pathname, target.search)
    if (route.view === 'campaign' && next.view === 'campaign' && route.id === next.id) {
      history.pushState({}, '', path)
      setRoute(readRoute())
      setSidebarOpen(false)
      return
    }
    if (route.view === 'admin' && hasUnsavedChanges() && !discardAdmin) {
      adminLeaveFocus.current = document.activeElement
      setAdminLeavePath(path)
      return
    }
    if (hasUnsavedChanges() && !discardAdmin && !window.confirm('Discard your unsaved changes?')) return
    markDirty(false)
    history.pushState({}, '', path)
    setRoute(readRoute())
    setSidebarOpen(false)
    setError(null)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function goModule(id) {
    const current = runtimeRef.current
    if (!current?.getSnapshot(id).access.canVisit || !route.id) return
    history.pushState({}, '', campaignModuleUrl(route.id, id))
    setRoute(readRoute())
    document.getElementById(`campaign-module-${id}`)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  }
  async function create(input) {
    if (campaignBusy()) return
    inFlight.current = true
    setPending('Create campaign')
    setError(null)
    try {
      const { sources = [], ...campaignInput } = input
      // Every project starts with the canonical AI briefing (D37); the marker lets a files-only brief be created.
      const campaign = await api.createCampaign({ ...campaignInput, projectType: campaignInput.projectType ?? 'banners',
        brief: { ...campaignInput.brief, briefing: { schemaVersion: 2 } } })
      markDirty(false)
      // The project opens at once; its files upload and its analysis runs in the Brief stage.
      pendingSubmissions.current.set(campaign.id, { sources })
      rememberPendingUploads(campaign.id, sources)
      setCampaigns(items => [campaign, ...items.filter(item => item.id !== campaign.id)])
      history.pushState({}, '', campaignModuleUrl(campaign.id, 'brief'))
      setRoute(readRoute())
      return { ok: true }
    } catch (failure) {
      const uncertain = failure.status === undefined || failure.status === 0 || failure.status >= 500
      const value = uncertain ? new Error('Creation may have completed. Check the campaign list before creating another campaign.') : failure
      // A transport failure leaves creation uncertain, so reconcile the list in
      // the background without adding a blocking notice below the new-brief form.
      // Known validation failures remain visible to the user.
      if (!uncertain) setError(value)
      if (uncertain) await loadLists().catch(() => {})
      return { ok: false, message: value.message, silent: uncertain }
    } finally {
      inFlight.current = false
      setPending('')
    }
  }
  async function duplicateCampaign(campaign) {
    if (!editor || campaignBusy()) return
    if (hasUnsavedChanges() && !window.confirm('Discard your unsaved changes?')) return
    inFlight.current = true
    setOpenCampaignMenu(null)
    setPending('Duplicate campaign')
    setError(null)
    try {
      const duplicated = await api.duplicateCampaign(campaign.id)
      await loadLists()
      markDirty(false)
      history.pushState({}, '', `/mvp/campaign/${encodeURIComponent(duplicated.id)}?step=0`)
      setRoute(readRoute())
      setWorkspace(null)
      setNotice('Campaign duplicated as a new draft')
    } catch (value) {
      setError(value)
    } finally {
      inFlight.current = false
      setPending('')
    }
  }
  async function deleteCampaign(campaign) {
    if (!editor || campaignBusy()) return
    inFlight.current = true
    setOpenCampaignMenu(null)
    setPending('Remove campaign')
    setError(null)
    try {
      await api.deleteCampaign(campaign.id, campaign.revision)
      await loadLists()
      markDirty(false)
      if (route.id === campaign.id) {
        history.pushState({}, '', '/')
        setRoute(readRoute())
        setWorkspace(null)
      }
      setNotice('Campaign removed from active campaigns')
    } catch (value) {
      setError(value)
    } finally {
      inFlight.current = false
      setPending('')
    }
  }
  async function saveCampaignTitle() {
    const title = titleDraft.current.trim()
    const current = workspace?.campaign
    setEditingTitle(false)
    if (!current || !title || title === current.title) {
      if (titleRef.current && current) titleRef.current.textContent = current.title
      return
    }
    const result = await runtimeRef.current?.execute('brief', 'rename', async ({ api, workspace: source }) => {
      await api.patchCampaign(source.campaign.id, { title }, source.campaign.revision)
    }, { intent: { title }, reconcile: ({ current: refreshed }) => refreshed.campaign.title === title ? 'applied' : 'unknown' })
    if (result?.ok === false) setError(result)

  }
  const visibleCampaigns = campaigns.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  )
  const editor = actor?.role === 'admin' || actor?.role === 'marketer'
  const canManageWorkflows = actor?.role === 'admin' && !actor.disabled && !actor.disabledAt
  const generationBlocked = workspace?.jobs.some((job) =>
    ['pending', 'unknown'].includes(job.status),
  )
  const readOnly =
    !editor ||
    !editableStatuses.has(workspace?.campaign.status) ||
    generationBlocked
  const navItems = [
    ['campaigns', 'Home', Shapes, '/'],
    ['templates', 'Templates', LayoutTemplate, '/mvp/templates'],
    ['system', 'Design system', Shapes, '/mvp/system'],
  ]
  if (canManageWorkflows) {
    navItems.push(['admin', 'Administration', Settings, '/mvp/admin'])
  }
  // Route anchors through the app so unsaved-change and busy guards stay authoritative.
  const onSidebarNavigate = event => {
    const link = event.target.closest('a[href]')
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    const url = new URL(link.href, window.location.href)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    navigate(`${url.pathname}${url.search}${url.hash}`)
  }
  const account = actor ? { label: actor.displayName, actions: [
    { id: 'new', label: 'New campaign', disabled: !editor },
    { id: 'settings', label: 'Settings' },
    { id: 'teams', label: 'Teams', disabled: true },
    { id: 'signout', label: 'Sign out' },
  ], onAction: action => {
    if (action === 'new') navigate('/mvp/new')
    if (action === 'settings') navigate('/mvp/settings')
    if (action === 'signout' && !campaignBusy() && (!hasUnsavedChanges() || window.confirm('Discard your unsaved changes?'))) onSignOut?.()
  } } : undefined
  const sidebar = <div className="bs-sidebar-shell"><SidebarPanel
    brand={{ label: 'Automation Studio', href: '/' }}
    primaryAction={{ label: 'Create new', icon: <Plus size={18} />, onClick: () => { if (editor && !pending) navigate('/mvp/new') } }}
    navigation={navItems.map(([id, label, Icon, href]) => ({ id, label, href, icon: <Icon size={18} />, current: route.view === id }))}
    projects={campaigns.map(campaign => ({ id: campaign.id, title: campaign.title,
      href: `/mvp/campaign/${encodeURIComponent(campaign.id)}`, pinned: pinnedIds.includes(campaign.id),
      actions: [
        { id: 'pin', label: pinnedIds.includes(campaign.id) ? 'Unpin' : 'Pin' },
        { id: 'duplicate', label: 'Duplicate', disabled: !editor },
        { id: 'delete', label: 'Delete', danger: true, disabled: !editor },
      ] }))}
    search={{ placeholder: 'Search campaigns' }}
    onProjectAction={(id, action) => {
      const campaign = campaigns.find(item => item.id === id)
      if (!campaign) return
      if (action === 'pin') togglePin(id)
      if (action === 'duplicate') duplicateCampaign(campaign)
      if (action === 'delete') requestDeleteCampaign(campaign, document.activeElement)
    }}
    />
    {account && <SidebarAccountMenu {...account} />}
  </div>

  if (route.view === 'admin') return <AdminApp api={api} actor={actor} route={route} onNavigate={navigate} onDirtyChange={markDirty} onBusyChange={markAdminBusy} loading={loading} sessionError={error} leavePrompt={adminLeavePath !== null} onLeaveCancel={fallback => { setAdminLeavePath(null); requestAnimationFrame(() => { const previous = adminLeaveFocus.current; const target = previous?.isConnected ? previous : fallback?.isConnected ? fallback : document.getElementById('admin-main'); target?.focus?.() }) }} onLeaveConfirm={() => { const path = adminLeavePath; setAdminLeavePath(null); navigate(path, { discardAdmin: true }) }}/>

  return (
    <DesignSystemRoot><div className="bs-root">
      {actor?.id && figmaPairingId && api.confirmFigmaPairing && <FigmaPairingDialog api={api} pairingId={figmaPairingId} onClose={()=>{setFigmaPairingId(null);const url=new URL(window.location.href);url.searchParams.delete('figmaPairing');window.history.replaceState(null,'',url)}}/>}
      <a className="bs-skip" href="#studio-main">
        Skip to workspace
      </a>
      <div id="sidebar-create" onClickCapture={onSidebarNavigate}>{sidebar}</div>
      {deleteConfirmation && <Dialog open onOpenChange={open => { if (!open) closeDeleteConfirmation() }}
        title={`Remove ${deleteConfirmation.title}?`} description="Its files and history will be retained.">
        <div className="bs-dialog-actions">
          <AppButton variant="secondary" onClick={() => closeDeleteConfirmation()}>Cancel</AppButton>
          <AppButton variant="danger" onClick={() => { const campaign = deleteConfirmation; closeDeleteConfirmation({ restoreFocus: false }); deleteCampaign(campaign) }}>Remove campaign</AppButton>
        </div>
      </Dialog>}
      <div className="bs-main">
        <header className="bs-topbar">
          <span className="bs-menu"><Drawer side="left" open={sidebarOpen} onOpenChange={setSidebarOpen}
            title="Navigation" closeLabel="Close navigation"
            trigger={<AppButton variant="icon" aria-label="Open navigation"><Menu size={20} /></AppButton>}>
            <div className="bs-mobile-navigation" onClickCapture={onSidebarNavigate}>{sidebar}</div>
          </Drawer></span>
          <div className="bs-breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>
              {route.view === 'campaign'
                ? (workspace?.campaign.title ?? 'Campaign')
                : route.view === 'templates'
                  ? 'Templates'
                : route.view === 'system'
                    ? 'Design system'
                    : route.view === 'admin'
                      ? 'Asset workflows'
                    : route.view === 'settings'
                      ? 'Settings'
                    : route.view === 'new' ? 'Create new' : 'Home'}
            </strong>
            {route.view === 'campaign' && workspace && (
              <StatusBadge tone={['in_review', 'changes_requested', 'ready'].includes(workspace.campaign.status) ? 'info' : 'neutral'}>
                {statusLabel(workspace.campaign.status)}
              </StatusBadge>
            )}
          </div>
          <div className="bs-topbar-right">
            <a href="/docs/" aria-label="Help and documentation">
              <CircleHelp size={19} />
            </a>
          </div>
        </header>
        <main
          id="studio-main"
          tabIndex={-1}
          ref={mainRef}
          className={`bs-content${route.view === 'new' ? ' bs-content--new' : ''}`}
        >
          <ErrorNotice
            error={error}
            onRetry={() => {
              setError(null)
              route.id
                ? (runtimeRef.current ? runtimeRef.current.refresh().catch(setError) : loadWorkspace(route.id).catch(setError))
                : loadLists().catch(setError)
            }}
          />
          {notice && (
            <div className="bs-feedback-space" role="status"><Alert tone="success" announce={false} title={notice} onDismiss={() => setNotice('')} /></div>
          )}
          {pending && (
            <div className="bs-feedback-space"><AITaskStatus status="running" label={`${pending}…`} /></div>
          )}
          {loading || studioListsLoading || workspaceLoading || (route.view === 'campaign' && workspace && !runtime) ? (
            <div
              className="bs-loading"
              role="status"
              aria-label="Loading workspace"
            >
              <Skeleton lines={3} />
            </div>
          ) : route.view === 'system' ? (
            <Suspense fallback={<div className="bs-loading" role="status" aria-label="Loading brand systems"><Skeleton lines={3} /></div>}>
              <BrandDesignSystemPage api={api} actor={actor} route={route} onNavigate={navigate} onDirtyChange={markDirty} />
            </Suspense>
          ) : route.view === 'settings' ? (
            personalSettings ? <SettingsScreen api={api} settings={personalSettings} auth={authMethods} readiness={generationReadiness} onReadinessRefresh={loadGenerationReadiness} /> : settingsLoading ? <div className="bs-loading" role="status" aria-label="Loading settings"><Skeleton lines={3} /></div> : <Alert tone="danger" title="Settings unavailable"><p>We couldn’t load your personal settings.</p><Button onClick={loadPersonalSettings}>Retry settings</Button></Alert>
          ) : route.view === 'templates' ? (
            <Suspense fallback={<div className="bs-loading" role="status" aria-label="Loading templates"><Skeleton lines={3} /></div>}>
              <TemplateLibrary
                templates={templates}
                loadBrandSystems={loadBrandSystems}
                canChoose={editor && !pending}
                onChoose={(id) => {
                  setRequestedTemplate(id)
                  if (workspace?.campaign.selectedDirectionId)
                    navigate(campaignModuleUrl(workspace.campaign.id, 'banners'))
                  else navigate('/mvp/new')
                }}
              />
            </Suspense>
          ) : route.view === 'new' && !route.asset ? (
            <NewAssetScreen templateCounts={{ banners: templates.length }} onChoose={(asset) => {
              if (asset === 'banners') navigate('/')
              else if (asset === 'presentations') navigate('/mvp/templates?category=presentations#presentation-templates')
              else navigate(`/mvp/new?asset=${encodeURIComponent(asset)}`)
            }} />
          ) : route.view === 'new' && route.asset ? (
            <AssetComingSoon asset={route.asset} onBack={() => navigate('/mvp/new')} />
          ) : route.view === 'campaign' && workspace ? (
            <CampaignPage key={workspace.campaign.id} runtime={runtime} activeModule={route.module}
              onNavigate={goModule} requestedTemplate={requestedTemplate}
              prototypeMode={prototypeMode}
              pendingSubmission={pendingSubmissions.current.get(workspace.campaign.id) ?? null}
              onSubmissionStarted={() => { pendingSubmissions.current.delete(workspace.campaign.id) }}
              onSubmissionSettled={() => { forgetPendingUploads(workspace.campaign.id) }}
              interruptedUploads={pendingSubmissions.current.has(workspace.campaign.id) ? [] : readPendingUploads(workspace.campaign.id)}
              onDismissInterruptedUploads={() => { forgetPendingUploads(workspace.campaign.id); setInterruptedUploadsVersion(value => value + 1) }}
              heading={<Heading level={1} variant="h3"
                    ref={titleRef}
                    contentEditable={editingTitle}
                    suppressContentEditableWarning
                    onClick={() => {
                      if (!editor || readOnly || pending) return
                      titleDraft.current = workspace.campaign.title
                      setEditingTitle(true)
                    }}
                    onInput={(event) => { titleDraft.current = event.currentTarget.textContent ?? '' }}
                    onBlur={saveCampaignTitle}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        titleDraft.current = workspace.campaign.title
                        event.currentTarget.textContent = workspace.campaign.title
                        setEditingTitle(false)
                        event.currentTarget.blur()
                      }
                    }}
                    data-editable={editor && !readOnly ? 'true' : undefined}
                  >
                    {workspace.campaign.title}
                  </Heading>} />
          ) : editor ? (
            <HomeScreen
              key="new-campaign"
              api={api}
              readiness={generationReadiness}
              pending={pending}
              onSave={create}
              onDirty={markDirty}
            />
          ) : (
            <section className="bs-review-queue">
              <h1>Ready for your review</h1>
              <p>
                Open a campaign to check the creative and leave a clear handoff.
              </p>
              {campaigns.filter((campaign) => campaign.status === 'in_review')
                .length === 0 && (
                <div className="bs-empty">
                  No campaigns are waiting for design review.
                </div>
              )}
              {campaigns
                .filter((campaign) => campaign.status === 'in_review')
                .map((campaign) => (
                  <Button
                    key={campaign.id}
                    onClick={() => navigate(`/mvp/campaign/${campaign.id}`)}
                  >
                    {campaign.title}
                    <ArrowUpRight size={16} />
                  </Button>
                ))}
            </section>
          )}
        </main>
      </div>
    </div></DesignSystemRoot>
  )
}
