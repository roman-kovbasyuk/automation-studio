const STORE_VERSION = 1

function clone(value) {
  if (value === undefined) return undefined
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function ensureState(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Prototype state must be an object.')
  return value
}

export function createMemoryPrototypeStore({ value = {} } = {}) {
  let state = clone(ensureState(value))
  let closed = false
  const assets = new Map()
  function assertOpen() {
    if (closed) throw Object.assign(new Error('Prototype store is closed.'), { code: 'prototype_store_closed' })
  }
  return {
    async read() {
      assertOpen()
      return clone(state)
    },
    async update(mutator) {
      assertOpen()
      if (typeof mutator !== 'function') throw new TypeError('A state mutator is required.')
      const draft = clone(state)
      const result = await mutator(draft)
      state = clone(ensureState(draft))
      return clone(result)
    },
    async putAsset(id, blob) {
      assertOpen()
      if (!id || !(blob instanceof Blob)) throw new TypeError('An asset id and Blob are required.')
      assets.set(id, blob.slice(0, blob.size, blob.type))
      return id
    },
    async getAsset(id) {
      assertOpen()
      const blob = assets.get(id)
      return blob ? blob.slice(0, blob.size, blob.type) : null
    },
    async reset(next = {}) {
      assertOpen()
      state = clone(ensureState(next))
      assets.clear()
    },
    async close() {
      closed = true
      assets.clear()
    },
  }
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Prototype storage request failed.'))
  })
}

export async function openPrototypeStore({ name = 'banner-studio-prototype-v1', seed = {} } = {}) {
  if (!globalThis.indexedDB) {
    const store = createMemoryPrototypeStore({ value: seed })
    store.storage = 'memory'
    return store
  }
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name, STORE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state')
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Prototype storage is unavailable.'))
  })
  let closed = false
  let updateQueue = Promise.resolve()
  const assertOpen = () => {
    if (closed) throw Object.assign(new Error('Prototype store is closed.'), { code: 'prototype_store_closed' })
  }
  async function read() {
    assertOpen()
    const transaction = database.transaction('state', 'readonly')
    const value = await requestToPromise(transaction.objectStore('state').get('current'))
    return clone(value ?? seed)
  }
  async function update(mutator) {
    const operation = updateQueue.then(async () => {
      assertOpen()
      if (typeof mutator !== 'function') throw new TypeError('A state mutator is required.')
      // Read and mutate outside the active transaction. IndexedDB may commit a
      // transaction between awaited microtasks, so the final write gets its
      // own short transaction and all updates are serialized through a queue.
      const readTransaction = database.transaction('state', 'readonly')
      const current = await requestToPromise(readTransaction.objectStore('state').get('current'))
      const draft = clone(current ?? seed)
      const result = await mutator(draft)
      assertOpen()
      const writeTransaction = database.transaction('state', 'readwrite')
      writeTransaction.objectStore('state').put(clone(ensureState(draft)), 'current')
      await new Promise((resolve, reject) => {
        writeTransaction.oncomplete = resolve
        writeTransaction.onerror = () => reject(writeTransaction.error || new Error('Prototype storage transaction failed.'))
        writeTransaction.onabort = () => reject(writeTransaction.error || new Error('Prototype storage transaction aborted.'))
      })
      return clone(result)
    })
    updateQueue = operation.catch(() => {})
    return operation
  }
  async function putAsset(id, blob) {
    assertOpen()
    if (!id || !(blob instanceof Blob)) throw new TypeError('An asset id and Blob are required.')
    const transaction = database.transaction('assets', 'readwrite')
    transaction.objectStore('assets').put(blob, id)
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Prototype asset transaction failed.'))
      transaction.onabort = () => reject(transaction.error || new Error('Prototype asset transaction aborted.'))
    })
    return id
  }
  async function getAsset(id) {
    assertOpen()
    const transaction = database.transaction('assets', 'readonly')
    return (await requestToPromise(transaction.objectStore('assets').get(id))) ?? null
  }
  async function reset(next = {}) {
    assertOpen()
    const transaction = database.transaction(['state', 'assets'], 'readwrite')
    transaction.objectStore('state').put(clone(ensureState(next)), 'current')
    transaction.objectStore('assets').clear()
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Prototype reset failed.'))
      transaction.onabort = () => reject(transaction.error || new Error('Prototype reset aborted.'))
    })
  }
  return {
    read,
    update,
    putAsset,
    getAsset,
    reset,
    async close() {
      if (closed) return
      closed = true
      database.close()
    },
    storage: 'indexeddb',
  }
}

export { clone as clonePrototypeValue }
