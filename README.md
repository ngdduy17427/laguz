<p align="center">
  <img src="imgs/laguz-thumb.png" />
</p>

A lightweight, **proxy-based state management library** for React.

---

## ✨ Features

- 🔍 **Deep observability** — nested objects, arrays, Maps, and Sets are proxied automatically.
- ⚡ **Path-based subscriptions** — only components that depend on changed paths re-render.
- 🧩 **Composable stores** — create multiple stores and combine them into a global store.
- ⚙️ **Batched updates** — changes are queued and flushed in a microtask.
- 🎯 **React integration** — `useStore` hook for selecting slices of state.

---

## 📦 Installation

```bash
npm install github:ngdduy17427/laguz
# or
yarn add github:ngdduy17427/laguz
```

## ⚡During Optimization

_This library is still being optimized._

- Path tracking and subscription filtering are designed to minimize unnecessary re-renders, but
  selector design (narrow vs broad) has a big impact.
- Shallow comparisons are used internally for performance. You can extend selectors with custom
  equality checks (e.g., tuples or deep equality) where needed.
- Map and Set path semantics are unified with object paths, but fine-grained optimizations (like
  batching array methods or eagerizing children) are evolving.
- Expect small breaking changes while APIs are refined for performance and ergonomics.

## 🚀 Quick usage

```tsx
import { createStore, createGlobalStore } from '@ngdduy17427/laguz'

// 1. Define a counter store
const counterStore = createStore((state) => ({
  count: 0,
  increment: () => {
    state.count++
  },
  reset: () => {
    state.count = 0
  },
}))

// 2. Combine into a global store
export const { useStore } = createGlobalStore({ counterStore })

// 3. Use in a React component
function Counter() {
  const { count, increment, reset } = useStore((s) => s.counterStore)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

## 📄 License

MIT © 2025
