// AppLoading owns the public-page overlay. The shared fallback must never
// introduce a full-screen loader while a workspace or auth route resolves.
export default function Loading() { return <div data-route-loading="true" />; }
