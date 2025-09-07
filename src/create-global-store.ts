import React from 'react'
import { IS_PROXY, SUBSCRIBE } from '.'
import { Emitter } from './emitter'
import type { Selector, UseStore } from './types'
import { isObjectLike, isParent, joinPath } from './utils'

const normalize = <T>(value: T): T => {
  if (Array.isArray(value)) return value.slice() as T
  if (value instanceof Map) return new Map(value) as T
  if (value instanceof Set) return new Set(value) as T
  if (isObjectLike(value)) return { ...value }
  return value
}

const trackReads = <T extends object>(root: T, accessed: Set<string>, base = ''): T => {
  return new Proxy(root as any, {
    get: (target, key, receiver) => {
      const path = joinPath(base, key)
      accessed.add(path)

      const value = Reflect.get(target, key, receiver)

      // If it's one of *our* proxies, don't wrap again—return as-is.
      if (value && typeof value === 'object' && (value as any)[IS_PROXY] === true) {
        return value
      }

      // Recurse only into plain objects that are not already proxies.
      if (value && typeof value === 'object') {
        return trackReads(value, accessed, path)
      }

      return value
    },
  })
}

export const createGlobalStore = <GlobalStore extends Record<string, any>>(stores: GlobalStore) => {
  const emitter = new Emitter()

  // Forward store-level paths into global space, prefixed by store key
  for (const [key, store] of Object.entries(stores)) {
    if (typeof store[SUBSCRIBE] === 'function') {
      store[SUBSCRIBE]((evtOrDetail: any) => {
        const detail = evtOrDetail && 'detail' in evtOrDetail ? evtOrDetail.detail : evtOrDetail
        const paths = Array.isArray(detail?.path)
          ? (detail.path as Array<string | number | symbol>)
          : []
        const prefixed = paths.map((path) => {
          const keyPath = typeof path === 'symbol' ? path.toString() : String(path)
          return keyPath ? `${key}.${keyPath}` : key
        })
        emitter.emitChange(prefixed)
      })
    }
  }

  // Global subscribe that delivers string[] paths
  const subscribeGlobal = (onChange: (paths: string[]) => void) => {
    return emitter.subscribe((evtOrDetail) => {
      const detail = evtOrDetail && 'detail' in evtOrDetail ? evtOrDetail.detail : evtOrDetail
      const paths = Array.isArray(detail?.path) ? (detail.path as string[]) : []
      onChange(paths)
    })
  }

  const useStore: UseStore<GlobalStore> = <Store>(selector: Selector<GlobalStore, Store>) => {
    // Keep the latest selector
    const selectorRef = React.useRef<Selector<GlobalStore, Store>>(selector)
    selectorRef.current = selector

    // Versioned cache: bump only on relevant path changes
    const versionRef = React.useRef(0)
    const lastComputedVersionRef = React.useRef(-1)
    const accessedPathsRef = React.useRef<Set<string>>(new Set())
    const cachedSnapRef = React.useRef<Store | undefined>(undefined)

    // Subscribe and bump version only if changed paths intersect what we read
    const subscribe = (onStoreChange: () => void) => {
      return subscribeGlobal((changedPaths) => {
        const accessed = accessedPathsRef.current
        for (const changedPath of changedPaths) {
          for (const accessedPath of accessed) {
            if (isParent(accessedPath, changedPath) || isParent(changedPath, accessedPath)) {
              versionRef.current++
              onStoreChange()
              return
            }
          }
        }
      })
    }

    // Return cached snapshot unless a relevant change happened
    const getSnapshot = React.useCallback(() => {
      // If version unchanged, reuse cached snapshot to avoid loops
      if (
        lastComputedVersionRef.current === versionRef.current &&
        cachedSnapRef.current !== undefined
      ) {
        return cachedSnapRef.current
      }

      // Recompute once per (relevant) version
      const accessed = new Set<string>()
      const trackedStores = trackReads(stores, accessed, '')
      const selected = selectorRef.current(trackedStores as GlobalStore)
      const next = normalize(selected)

      accessedPathsRef.current = accessed
      lastComputedVersionRef.current = versionRef.current

      // Always publish a new ref per relevant version (so broad selectors re-render)
      cachedSnapRef.current = next
      return next
    }, [])

    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  }

  return { useStore }
}
