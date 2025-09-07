import { IS_PROXY, RAW } from '.'
import { OnChangeFunc } from './types'
import { isObjectLike, joinPath } from './utils'

const proxyByTarget = new WeakMap<object, any>()
const targetByProxy = new WeakMap<object, object>()

const hasCtor = (name: string): boolean => {
  return typeof (globalThis as any)[name] === 'function'
}

const isInstance = (value: any, name: string): boolean => {
  return hasCtor(name) && value instanceof (globalThis as any)[name]
}

const isTypedArray = (value: any) => {
  return (
    typeof ArrayBuffer !== 'undefined' &&
    typeof ArrayBuffer.isView === 'function' &&
    ArrayBuffer.isView(value) &&
    !(typeof DataView !== 'undefined' && value instanceof DataView)
  )
}

const isOpaqueBuiltin = (value: any): boolean => {
  if (value == null || typeof value !== 'object') return false
  if (typeof value.then === 'function') return true

  if (value instanceof Error) return true
  if (value instanceof Date) return true
  if (value instanceof RegExp) return true

  if (isInstance(value, 'URL')) return true
  if (isInstance(value, 'URLSearchParams')) return true
  if (isInstance(value, 'DataView')) return true
  if (isInstance(value, 'Blob')) return true
  if (isInstance(value, 'File')) return true
  if (isInstance(value, 'FormData')) return true
  if (isInstance(value, 'WeakMap')) return true
  if (isInstance(value, 'WeakSet')) return true
  if (isInstance(value, 'Node')) return true
  if (isInstance(value, 'Element')) return true
  if (isInstance(value, 'Buffer')) return true
  if (isInstance(value, 'ArrayBuffer')) return true
  if (isInstance(value, 'SharedArrayBuffer')) return true
  if (isTypedArray(value)) return true

  return false
}

const isOurProxy = (value: any): boolean => {
  if (!isObjectLike(value)) return false
  if (targetByProxy.has(value)) return true
  try {
    return (value as any)[IS_PROXY] === true
  } catch {
    return false
  }
}

const isArrayShallowEqual = (a: any, b: any) => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((x, i) => Object.is(x, b[i]))
  )
}

export const createProxy = (value: any, onChange: OnChangeFunc, basePath = '') => {
  if (isOurProxy(value)) return value

  if (!isObjectLike(value) && !(value instanceof Map) && !(value instanceof Set)) return value
  if (isOpaqueBuiltin(value)) return value

  if (value instanceof Map) return proxyMap(value, onChange, basePath)
  if (value instanceof Set) return proxySet(value, onChange, basePath)

  return proxyObject(value, onChange, basePath)
}

/* -------------------- Map Proxy (deep, with safe method binding) -------------------- */
const proxyMap = <S extends Map<any, any>>(target: S, onChange: OnChangeFunc, path = ''): S => {
  const cached = proxyByTarget.get(target)
  if (cached) return cached

  const wrapValue = (value: any, key: any) => {
    if (isOurProxy(value)) return value
    if (isOpaqueBuiltin(value)) return value
    if (value instanceof Map || value instanceof Set) {
      return createProxy(value, onChange, joinPath(path, key))
    }
    if (isObjectLike(value)) {
      return createProxy(value, onChange, joinPath(path, key))
    }
    return value
  }

  const proxy = new Proxy(target, {
    get: (target, prop, receiver) => {
      if (prop === IS_PROXY) return true
      if (prop === RAW) return target

      // Iteration helpers that must yield wrapped values
      if (prop === Symbol.iterator) {
        return function* () {
          for (const [key, value] of target.entries()) yield [key, wrapValue(value, key)]
        }
      }
      if (prop === 'entries') {
        return function* () {
          for (const [key, value] of target.entries()) yield [key, wrapValue(value, key)]
        }
      }
      if (prop === 'values') {
        return function* () {
          for (const [key, value] of target.entries()) yield wrapValue(value, key)
        }
      }
      if (prop === 'forEach') {
        return (fn: (value: any, key: any, map: any) => void, thisArg?: any) =>
          target.forEach((value, key) => fn.call(thisArg, wrapValue(value, key), key, proxy))
      }

      // Accessors/mutators that need custom wrapping + notifications
      if (prop === 'get') {
        return (key: any) => wrapValue(target.get(key), key)
      }
      if (prop === 'set') {
        return (key: any, next: any) => {
          const wrapped = wrapValue(next, key)
          const prev = target.get(key)
          if (Object.is(prev, wrapped)) return proxy
          target.set(key, wrapped)
          onChange(joinPath(path, key))
          return proxy
        }
      }
      if (prop === 'delete') {
        return (key: any) => {
          const had = target.has(key)
          const ok = target.delete(key)
          if (ok && had) onChange(joinPath(path, key))
          return ok
        }
      }
      if (prop === 'clear') {
        return () => {
          if (target.size === 0) return
          target.clear()
          onChange(path)
        }
      }

      // 🔒 Safe default: bind any function to the raw target so `this` is correct
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  proxyByTarget.set(target, proxy)
  targetByProxy.set(proxy, target)
  return proxy
}

/* -------------------- Set Proxy (deep, with safe method binding) -------------------- */
const proxySet = <S extends Set<any>>(target: S, onChange: OnChangeFunc, path = ''): S => {
  const cached = proxyByTarget.get(target)
  if (cached) return cached

  const wrapValue = (value: any) => {
    if (isOurProxy(value)) return value
    if (isOpaqueBuiltin(value)) return value
    if (value instanceof Map || value instanceof Set) {
      return createProxy(value, onChange, path)
    }
    if (isObjectLike(value)) {
      return createProxy(value, onChange, path)
    }
    return value
  }

  const proxy = new Proxy(target, {
    get: (target, prop, receiver) => {
      if (prop === IS_PROXY) return true
      if (prop === RAW) return target

      // Iteration / forEach should yield wrapped values
      if (prop === Symbol.iterator) {
        return function* () {
          for (const v of target.values()) yield wrapValue(v)
        }
      }
      if (prop === 'forEach') {
        return (fn: (value: any, value2: any, set: any) => void, thisArg?: any) =>
          target.forEach((v) => fn.call(thisArg, wrapValue(v), wrapValue(v), proxy))
      }

      // Mutators with notifications
      if (prop === 'add') {
        return (value: any) => {
          const wrapped = wrapValue(value)
          if (target.has(wrapped)) return proxy
          target.add(wrapped)
          onChange(path)
          return proxy
        }
      }
      if (prop === 'delete') {
        return (value: any) => {
          const ok = target.delete(value)
          if (ok) onChange(path)
          return ok
        }
      }
      if (prop === 'clear') {
        return () => {
          if (target.size === 0) return
          target.clear()
          onChange(path)
        }
      }

      // 🔒 Safe default: bind any function to the raw target so `this` is correct
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  proxyByTarget.set(target, proxy)
  targetByProxy.set(proxy, target)
  return proxy
}

/* -------------------- Object / Array Proxy (deep) -------------------- */
const proxyObject = <S>(target: S, onChange: OnChangeFunc, path = ''): S => {
  if (!isObjectLike(target)) return target

  const cached = proxyByTarget.get(target)
  if (cached) return cached

  const proxy = new Proxy(target as any, {
    get: (target, key, receiver) => {
      if (key === IS_PROXY) return true
      if (key === RAW) return target

      const value = Reflect.get(target, key, receiver)

      if (isOurProxy(value)) return value
      const fullPath = joinPath(path, key)

      if (isOpaqueBuiltin(value)) return value
      if (value instanceof Map || value instanceof Set) {
        return createProxy(value, onChange, fullPath)
      }
      if (isObjectLike(value)) {
        return createProxy(value, onChange, fullPath)
      }
      return value
    },
    set: (target, key, value, receiver) => {
      const prevValue = Reflect.get(target, key, receiver)

      if (Object.is(prevValue, value)) return true
      if (isArrayShallowEqual(prevValue, value)) return true

      const fullPath = joinPath(path, key)
      const next = isOurProxy(value)
        ? value
        : value instanceof Map || value instanceof Set
          ? createProxy(value, onChange, fullPath)
          : isOpaqueBuiltin(value)
            ? value
            : isObjectLike(value)
              ? createProxy(value, onChange, fullPath)
              : value

      const ok = Reflect.set(target, key, next, receiver)
      if (ok) onChange(fullPath)
      return ok
    },
    defineProperty: (target, key, descriptor) => {
      const fullPath = joinPath(path, key)
      const desc = { ...descriptor }
      if ('value' in desc) {
        const prev = Reflect.getOwnPropertyDescriptor(target, key)?.value
        const next = desc.value

        if (Object.is(prev, next)) return true
        if (isArrayShallowEqual(prev, next)) return true

        desc.value = isOurProxy(next)
          ? next
          : next instanceof Map || next instanceof Set
            ? createProxy(next, onChange, fullPath)
            : isOpaqueBuiltin(next)
              ? next
              : isObjectLike(next)
                ? createProxy(next, onChange, fullPath)
                : next
      }
      const ok = Reflect.defineProperty(target, key, desc)
      if (ok) onChange(fullPath)
      return ok
    },
    deleteProperty: (target, key) => {
      const ok = Reflect.deleteProperty(target, key)
      if (ok) onChange(joinPath(path, key))
      return ok
    },
    has: (target, key) => Reflect.has(target, key),
    ownKeys: (target) => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (target, key) => Reflect.getOwnPropertyDescriptor(target, key),
  })

  proxyByTarget.set(target, proxy)
  targetByProxy.set(proxy, target)
  return proxy
}
