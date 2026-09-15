import { installPrototypeNetworkGuard } from './networkGuard.js'

// Install before rendering so prototype modules cannot accidentally initialize a live client.
installPrototypeNetworkGuard()

export function PrototypeApp() {
  return (
    <main aria-labelledby="prototype-title">
      <p>Banner Studio</p>
      <h1 id="prototype-title">Offline prototype</h1>
      <p>This local prototype runs with bundled data and does not require authentication or services.</p>
      <p role="status">Loading prototype workspace…</p>
    </main>
  )
}

export default PrototypeApp
