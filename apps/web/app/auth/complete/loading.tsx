export default function Loading() {
  return <main className="center-shell workspace-opening" role="status" aria-label="Opening your workspace">
    <div className="workspace-opening-mark" aria-hidden="true"><span /><span /><span /></div>
    <span className="sr-only">Opening your workspace</span>
  </main>;
}
