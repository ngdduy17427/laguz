export type OnChangeFunc = (path: string) => void
export type Selector<GlobalStore, Store> = (store: GlobalStore) => Store
export type UseStore<GlobalStore> = <Store>(selector: Selector<GlobalStore, Store>) => Store
export type StoreFactory<State> = (state: State) => State
