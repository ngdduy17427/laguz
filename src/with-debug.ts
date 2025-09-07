export const withDebug =
  process.env.NODE_ENV === 'production'
    ? <T extends Record<string, any>>(initializer: (s: T) => T) => initializer
    : <T extends Record<string, any>>(initializer: (s: T) => T) =>
        (state: T) => {
          {
            const proxyState = new Proxy(state, {
              set: (target, prop, newValue) => {
                const prev = { ...target }
                const result = Reflect.set(target, prop, newValue)
                const next = { ...target }

                console.groupCollapsed(
                  `%cState change: ${String(prop)}`,
                  'color: #4cafef; font-weight: bold;',
                )
                console.log('%cPrev:', 'color: gray', prev)
                console.log('%cNext:', 'color: green', next)
                console.groupEnd()

                return result
              },
            })

            const base = initializer(proxyState)
            const wrapped: T = {} as T

            for (const key in base) {
              const value = base[key]

              if (typeof value === 'function') {
                wrapped[key] = ((...args: any[]) => {
                  console.groupCollapsed(
                    `%c[authStore] Action: ${key}`,
                    'color: #f0e68c; font-weight: bold;',
                  )
                  console.log('%cArgs:', 'color: #4cafef', args)

                  const result = value.apply(base, args)

                  console.groupEnd()
                  return result
                }) as any
              } else {
                wrapped[key] = value
              }
            }

            return wrapped
          }
        }
