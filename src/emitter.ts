type ChangeDetail = { path: Array<string | number | symbol>; ts: number }

const hasDOMEventTarget = typeof EventTarget !== 'undefined'
const hasCustomEvent = typeof CustomEvent !== 'undefined'

class FallbackEmitter {
  private listeners = new Set<(detail: ChangeDetail) => void>()

  subscribe(cb: (detail: ChangeDetail) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  emit(detail: ChangeDetail) {
    this.listeners.forEach((listener) => listener(detail))
  }
}

export class Emitter {
  private emitter: EventTarget | FallbackEmitter

  constructor() {
    this.emitter = hasDOMEventTarget && hasCustomEvent ? new EventTarget() : new FallbackEmitter()
  }

  subscribe(cb: (...arg: any[]) => void) {
    if (this.emitter instanceof FallbackEmitter) {
      return this.emitter.subscribe(cb)
    }

    const target = this.emitter as EventTarget
    target.addEventListener('change', cb)
    return () => target.removeEventListener('change', cb)
  }

  emitChange(path: Array<string | number | symbol>) {
    const detail: ChangeDetail = {
      path,
      ts: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    }

    if (this.emitter instanceof FallbackEmitter) {
      this.emitter.emit(detail)
      return
    }

    const evt = new CustomEvent('change', { detail })
    this.emitter.dispatchEvent(evt)
  }
}
