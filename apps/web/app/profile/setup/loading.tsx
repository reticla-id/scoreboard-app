import { Brand } from "@/components/brand";

export default function Loading() {
  return <main className="setup-page" aria-busy="true"><span className="sr-only" role="status">Loading profile setup…</span><header className="site-header"><Brand /></header><section className="setup-panel skeleton-settings-head"><span className="skeleton" style={{ width: 135, height: 12 }} /><span className="skeleton" style={{ width: "min(80vw, 400px)", height: 115 }} /><span className="skeleton" style={{ width: "min(75vw, 320px)", height: 15 }} /><span className="skeleton" style={{ width: "100%", height: 48 }} /><span className="skeleton" style={{ width: "100%", height: 48 }} /><span className="skeleton" style={{ width: "100%", height: 48 }} /></section></main>;
}
