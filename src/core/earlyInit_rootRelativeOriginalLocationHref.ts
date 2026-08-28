import { assert } from "../tools/tsafe/assert";
import { getSharedState } from "./sharedScope";

const store_moduleScoped: { rootRelativeOriginalLocationHref: string | undefined } = {
    rootRelativeOriginalLocationHref: undefined
};

// Shared across bundles when shared scope is enabled: only the bundle that ran the non memoized
// part of oidcEarlyInit sets this, the others read it through the shared store or the assert below
// would fire in their copy. Resolved at use time, a module scope capture would race against
// enabling shared scope.
const getStore = () =>
    getSharedState("rootRelativeOriginalLocationHref_earlyInit", store_moduleScoped);

export function getRootRelativeOriginalLocationHref_earlyInit() {
    const { rootRelativeOriginalLocationHref } = getStore();
    assert(rootRelativeOriginalLocationHref !== undefined, "033");
    return rootRelativeOriginalLocationHref;
}

export function setGetRootRelativeOriginalLocationHref_earlyInit(params: {
    rootRelativeOriginalLocationHref: string;
}) {
    const store = getStore();

    assert(store.rootRelativeOriginalLocationHref === undefined, "393");
    store.rootRelativeOriginalLocationHref = params.rootRelativeOriginalLocationHref;
}
