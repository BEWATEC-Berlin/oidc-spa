const WINDOW_KEY = "__oidc_spa_shared__";

type SharedStore = {
    isEnabled: boolean;
    state: Record<string, unknown>;
};

// The store lives on window rather than in module scope because the whole point is to be reachable
// from another bundle's copy of oidc-spa, which has its own module scope.
function getStore(): SharedStore | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    return ((window as any)[WINDOW_KEY] ??= { isEnabled: false, state: {} }) as SharedStore;
}

/**
 * Opt into sharing oidc-spa's global state across bundles.
 *
 * In a micro-frontend setup each remote is a separate bundle with its own copy of oidc-spa, so
 * module scoped state is not shared. That breaks the parts of oidc-spa that are inherently global:
 * the auth callback in the url, the iframe message listener, and the instance cache.
 *
 * When enabled, that state lives on `window` instead, so every bundle sees the same one.
 * Only enable it in a trusted micro-frontend host, since it makes the state reachable by any
 * script on the page.
 */
export function enableSharedScope(): void {
    const store = getStore();

    if (store === undefined || store.isEnabled) {
        return;
    }

    store.isEnabled = true;

    console.warn(
        [
            "oidc-spa: Shared scope enabled.",
            "OIDC state is accessible to all scripts on this page.",
            "Only use this in trusted micro-frontend environments."
        ].join(" ")
    );
}

export function getIsSharedScopeEnabled(): boolean {
    return getStore()?.isEnabled ?? false;
}

/**
 * Returns the shared instance of `obj` if shared scope is enabled, otherwise `obj` itself.
 *
 * The first bundle to ask for a given key stores its object on `window`, every later bundle gets
 * that same object back and discards its own.
 */
export function getSharedState<T extends object>(key: string, obj: T): T {
    const store = getStore();

    if (store === undefined || !store.isEnabled) {
        return obj;
    }

    return (store.state[key] ??= obj) as T;
}
