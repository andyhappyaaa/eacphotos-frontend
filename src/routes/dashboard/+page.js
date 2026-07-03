// Dashboard requires auth — disable SSR to avoid 500s
// from $app/navigation and localStorage access
export const ssr = false;
