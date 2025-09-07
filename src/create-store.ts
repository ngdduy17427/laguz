import { SUBSCRIBE } from '.'
import { createProxy } from './create-proxy'
import { Emitter } from './emitter'
import type { StoreFactory } from './types'
import { isObjectLike, isParent } from './utils'

const addPath = (pendingPaths: Set<string>, path: string) => {
  for (const pendingPath of pendingPaths) {
    if (isParent(pendingPath, path)) return
  }
  for (const pendingPath of Array.from(pendingPaths)) {
    if (isParent(path, pendingPath)) pendingPaths.delete(pendingPath)
  }
  pendingPaths.add(path)
}

const queue = (cb: () => void) => {
  return typeof queueMicrotask === 'function' ? queueMicrotask(cb) : Promise.resolve().then(cb)
}

export const createStore = <S>(factory: StoreFactory<S>): S => {
  const emitter = new Emitter()

  let queued = false
  const pendingPaths = new Set<string>()

  const flush = () => {
    if (!queued) return
    queued = false
    if (pendingPaths.size === 0) return
    emitter.emitChange(Array.from(pendingPaths))
    pendingPaths.clear()
  }

  const schedule = (path: string) => {
    addPath(pendingPaths, path)
    if (queued) return
    queued = true
    queue(flush)
  }

  const initial = {} as S
  const store = createProxy(initial, schedule)

  Object.defineProperties(store, {
    [SUBSCRIBE]: {
      value: (onChange: (paths: string[]) => void) => emitter.subscribe(onChange),
      enumerable: false,
      configurable: false,
      writable: false,
    },
  })

  const state = factory(store)

  if (!isObjectLike(state) || Array.isArray(state)) {
    throw new Error('createStore(factory) must return an object')
  }

  return Object.assign(store as object, state)
}
