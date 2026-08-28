const WINDOW_KEY = "__oidc_spa_shared__";

// Bumped when the shape of the donated objects changes incompatibly. Bundles refuse to adopt a
// store with a different format and fall back to their own module scope, which degrades to the
// unshared behaviour instead of corrupting another bundle's state.
const FORMAT_VERSION = 1;

type SharedStore = {
    formatVersion: number;
    isEnabled: boolean;
    state: Record<string, unknown>;
};

// The store lives on window rather than in module scope because the whole point is to be reachable
// from another bundle's copy of oidc-spa, which has its own module scope.
// Reading never creates the store: a consumer that does not opt in must not leave globals behind.
function peekStore(): SharedStore | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    const store = (window as any)[WINDOW_KEY] as SharedStore | undefined;

    if (store !== undefined && store.formatVersion !== FORMAT_VERSION) {
        console.warn(
            [
                "oidc-spa: Another bundle on this page shares oidc state with format",
                `${store.formatVersion}, this bundle expects ${FORMAT_VERSION}.`,
                "Falling back to module scoped state for this bundle,",
                "align the oidc-spa versions across your micro-frontends."
            ].join(" ")
        );
        return undefined;
    }

    return store;
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
    if (typeof window === "undefined") {
        return;
    }

    const store = ((window as any)[WINDOW_KEY] ??= {
        formatVersion: FORMAT_VERSION,
        isEnabled: false,
        state: {}
    }) as SharedStore;

    if (store.formatVersion !== FORMAT_VERSION || store.isEnabled) {
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
    return peekStore()?.isEnabled ?? false;
}

/**
 * Returns the shared instance of `obj` if shared scope is enabled, otherwise `obj` itself.
 *
 * The first bundle to ask for a given key stores its object on `window`, every later bundle gets
 * that same object back and discards its own. Call it at use time, not at module scope: shared
 * scope is enabled by oidcEarlyInit, and a capture during module evaluation races against it.
 */
export function getSharedState<T extends object>(key: string, obj: T): T {
    const store = peekStore();

    if (store === undefined || !store.isEnabled) {
        return obj;
    }

    return (store.state[key] ??= obj) as T;
}
