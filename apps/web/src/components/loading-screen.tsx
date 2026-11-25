export function LoadingScreen({ leaving = false }: { leaving?: boolean }) {
  return <div className={`hv-loading-screen${leaving ? " hv-loading-leaving" : ""}`} role="status" aria-live="polite" aria-label="Loading HEXVAULT">
    <div className="hv-loading-content"><p>Loading HEXVAULT</p><div className="hv-loading-track" aria-hidden="true"><span /></div></div>
  </div>;
}
