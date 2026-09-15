import { spawn } from 'node:child_process'

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024
const KILL_GRACE_MS = 250

function commandError(message, { code = null, signal = null, stdout = '', stderr = '' } = {}) {
  return Object.assign(new Error(message), { code, signal, stdout, stderr })
}

function terminateTree(child, signal) {
  if (!child.pid) return
  if (process.platform !== 'win32') {
    try { process.kill(-child.pid, signal); return } catch (error) { if (error.code !== 'ESRCH') child.kill(signal) }
  } else child.kill(signal)
}

export function runCommand(file, args = [], { cwd, env, input, timeoutMs } = {}) {
  if (typeof file !== 'string' || !file) throw new TypeError('command file must be a non-empty string')
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) throw new TypeError('command arguments must be strings')
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) throw new TypeError('timeoutMs must be a positive integer')

  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let outputBytes = 0
    let timedOut = false
    let overflowed = false
    let forceKill
    let spawnError
    let inputError

    function collect(target, chunk) {
      const remaining = Math.max(0, MAX_OUTPUT_BYTES - outputBytes)
      const retained = chunk.subarray(0, remaining)
      outputBytes += retained.byteLength
      if (target === 'stdout') stdout += retained.toString('utf8')
      else stderr += retained.toString('utf8')
      if (retained.byteLength !== chunk.byteLength && !overflowed) {
        overflowed = true
        terminateTree(child, 'SIGTERM')
      }
    }

    child.stdout.on('data', (chunk) => collect('stdout', chunk))
    child.stderr.on('data', (chunk) => collect('stderr', chunk))
    child.on('error', (error) => { spawnError = error })
    child.stdin.on('error', (error) => { inputError = error })

    const timer = timeoutMs === undefined ? null : setTimeout(() => {
      timedOut = true
      terminateTree(child, 'SIGTERM')
      forceKill = setTimeout(() => terminateTree(child, 'SIGKILL'), KILL_GRACE_MS)
      forceKill.unref?.()
    }, timeoutMs)
    timer?.unref?.()

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      if (forceKill) clearTimeout(forceKill)
      if (timedOut) return reject(commandError(`Command timed out after ${timeoutMs}ms: ${file}`, { code, signal, stdout, stderr }))
      if (overflowed) return reject(commandError(`Command output exceeded ${MAX_OUTPUT_BYTES} bytes: ${file}`, { code, signal, stdout, stderr }))
      if (spawnError) return reject(Object.assign(spawnError, { stdout, stderr }))
      if (signal) return reject(commandError(`Command terminated by ${signal}: ${file}`, { code, signal, stdout, stderr }))
      if (code !== 0) return reject(commandError(`Command exited with code ${code}: ${file}`, { code, signal, stdout, stderr }))
      if (inputError) return reject(Object.assign(inputError, { stdout, stderr }))
      resolve({ stdout, stderr })
    })

    if (input === undefined) child.stdin.end()
    else child.stdin.end(input)
  })
}
