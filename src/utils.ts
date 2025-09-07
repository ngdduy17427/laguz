export const joinPath = (basePath: string, key: PropertyKey) => {
  const keySymbol = typeof key === 'symbol' ? key.toString() : String(key)
  if (!basePath) return keySymbol
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(keySymbol)
    ? `${basePath}.${keySymbol}`
    : `${basePath}[${JSON.stringify(keySymbol)}]`
}

export const isParent = (parent: string, child: string) => {
  return parent === '' || child === parent || child.startsWith(parent + '.')
}

export const isObjectLike = (value: unknown): value is Record<string, any> => {
  return value !== null && typeof value === 'object'
}
