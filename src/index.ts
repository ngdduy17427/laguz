export const IS_PROXY = Symbol.for('@@laguz/is_proxy')
export const RAW = Symbol.for('@@laguz/raw')
export const SUBSCRIBE = Symbol.for('@@laguz/subscribe')

export { createGlobalStore } from './create-global-store'
export { createStore } from './create-store'
export { withDebug } from './with-debug'
