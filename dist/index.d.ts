type Selector<GlobalStore, Store> = (store: GlobalStore) => Store;
type UseStore<GlobalStore> = <Store>(selector: Selector<GlobalStore, Store>) => Store;
type StoreFactory<State> = (state: State) => State;

declare const createGlobalStore: <GlobalStore extends Record<string, any>>(stores: GlobalStore) => {
    useStore: UseStore<GlobalStore>;
};

declare const createStore: <S>(factory: StoreFactory<S>) => S;

declare const withDebug: <T extends Record<string, any>>(initializer: (s: T) => T) => (s: T) => T;

declare const IS_PROXY: unique symbol;
declare const RAW: unique symbol;
declare const SUBSCRIBE: unique symbol;

export { IS_PROXY, RAW, SUBSCRIBE, createGlobalStore, createStore, withDebug };
