import { useEffect, useState } from 'react'

let firebaseAuth
async function loadFirebase() {
  if (!firebaseAuth) firebaseAuth = (async () => {
    const [{ initializeApp }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')])
    let runtimeConfig
    try {
      const response = await fetch('/api/v1/runtime-config', { cache: 'no-store' })
      if (response.ok) runtimeConfig = (await response.json()).firebase
    } catch { /* Local Vite development may run without the API process. */ }
    const config = {
      apiKey: runtimeConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: runtimeConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: runtimeConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: runtimeConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID,
    }
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) throw new Error('Sign-in is not configured for this deployment. Contact your workspace administrator.')
    return { ...auth, instance: auth.getAuth(initializeApp(config, 'banner-studio-web')) }
  })()
  return firebaseAuth
}

export function useStudioAuth() {
  const [state, setState] = useState({ loading: true, user: null, demo: false, error: '' })
  const [role, setRole] = useState(() => {
    const requested = import.meta.env.DEV ? new URLSearchParams(location.search).get('demoRole') : null
    return ['marketer', 'designer', 'admin'].includes(requested) ? requested : (sessionStorage.getItem('studio-demo-role') || 'marketer')
  })
  useEffect(() => {
    let active = true
    let unsubscribe
    async function initialize() {
      try {
        if (import.meta.env.DEV && ['127.0.0.1','localhost','[::1]'].includes(location.hostname)) {
          const response = await fetch('/api/v1/dev/session-info')
          if (response.ok && (await response.json()).demo === true) {
            if (active) {
              sessionStorage.setItem('studio-demo-role', role)
              setState({ loading:false, user:{demo:true}, demo:true, error:'' })
            }
            return
          }
        }
        const firebase = await loadFirebase()
        if (!active) return
        unsubscribe = firebase.onAuthStateChanged(firebase.instance, (user) => setState({loading:false, user, demo:false, error:''}))
      } catch (error) {
        if (active) setState({ loading:false, user:null, demo:false, error:error.message })
      }
    }
    initialize()
    return () => { active = false; unsubscribe?.() }
  }, [])
  const signIn = async () => {
    setState((previous) => ({...previous,error:''}))
    try {
      const firebase = await loadFirebase()
      await firebase.signInWithPopup(firebase.instance, new firebase.GoogleAuthProvider())
    } catch (error) {
      setState((previous) => ({...previous,error:error.code === 'auth/popup-closed-by-user' ? 'Sign-in was closed. You can try again.' : 'Could not sign in. Check that your account has an invitation and try again.'}))
    }
  }
  const signOut = async () => { const firebase = await loadFirebase(); await firebase.signOut(firebase.instance) }
  const requestEmailChange = async (newEmail) => {
    if (state.demo) throw new Error('Email changes are unavailable in the local demo')
    if (typeof newEmail !== 'string' || !newEmail.includes('@')) throw new Error('Enter a valid email address')
    const firebase = await loadFirebase()
    const current = firebase.instance.currentUser
    if (!current) throw new Error('Sign in again before changing your email')
    await firebase.verifyBeforeUpdateEmail(current, newEmail.trim().toLowerCase(), {
      url: `${location.origin}/mvp/settings`,
      handleCodeInApp: true,
    })
  }
  const setupPassword = async (password) => {
    if (state.demo) throw new Error('Password setup is unavailable in the local demo')
    if (typeof password !== 'string' || password.length < 8) throw new Error('Choose a password with at least 8 characters')
    const firebase = await loadFirebase()
    const current = firebase.instance.currentUser
    if (!current?.email) throw new Error('Sign in again before setting a password')
    await firebase.linkWithCredential(current, firebase.EmailAuthProvider.credential(current.email, password))
    await firebase.signInWithEmailAndPassword(firebase.instance, current.email, password)
    await firebase.instance.currentUser?.getIdToken(true)
  }
  const disconnectGoogle = async (password) => {
    if (state.demo) throw new Error('Google disconnect is unavailable in the local demo')
    if (typeof password !== 'string' || password.length < 8) throw new Error('Enter your password to confirm this change')
    const firebase = await loadFirebase()
    const current = firebase.instance.currentUser
    if (!current?.email) throw new Error('Sign in again before changing login methods')
    const google = new firebase.GoogleAuthProvider()
    const reauthenticated = await firebase.reauthenticateWithPopup(current, google)
    const accessToken = reauthenticated?.credential?.accessToken
    await firebase.unlink(current, 'google.com')
    if (accessToken) {
      try { await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(accessToken)}`, { method: 'GET', mode: 'no-cors' }) } catch { /* Firebase unlink remains authoritative if revocation is unavailable. */ }
    }
    await firebase.signInWithEmailAndPassword(firebase.instance, current.email, password)
    await firebase.instance.currentUser?.getIdToken(true)
  }
  return { ...state, role, setRole(value) { if (!['marketer','designer','admin'].includes(value)) return; sessionStorage.setItem('studio-demo-role',value); setRole(value) }, signIn, signOut,
    requestEmailChange, setupPassword, disconnectGoogle,
    getToken: async () => state.demo ? null : state.user?.getIdToken(),
    getHeaders: async () => state.demo ? {'X-Studio-Demo-Role':role} : {},
  }
}
