"use client";

import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";

type View = "home" | "sessions" | "overview" | "players" | "matches" | "leaderboard" | "settings" | "editor";

function Line({ width = "100%", height = 14, className = "" }: { width?: string; height?: number; className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} style={{ width, height }} />;
}

function Header() {
  return <header className="site-header workspace-header"><Brand href="/home" /><Line width="44px" height={44} className="skeleton-avatar" /></header>;
}

function SessionHeading() {
  return <><div className="skeleton-breadcrumb"><Line width="200px" height={12} /></div><header className="session-workspace-head skeleton-session-head"><Line width="116px" height={11} /><Line width="min(70%, 440px)" height={52} /><Line width="min(55%, 340px)" height={13} /><Line width="170px" height={13} /><nav className="session-tabs" aria-label="Loading session navigation">{[0, 1, 2, 3].map((item) => <Line key={item} width="68px" height={15} />)}</nav></header></>;
}

function SessionList({ count = 3 }: { count?: number }) {
  return <div className="skeleton-session-list">{Array.from({ length: count }, (_, index) => <div className="skeleton-session-row" key={index}><div><Line width="min(60vw, 330px)" height={27} /><Line width="min(42vw, 220px)" height={12} /></div><Line width="84px" height={42} /></div>)}</div>;
}

function Body({ view }: { view: View }) {
  if (view === "home") return <><div className="skeleton-home-head"><div><Line width="150px" height={11} /><Line width="min(80vw, 470px)" height={58} /><Line width="min(65vw, 300px)" height={14} /></div></div><div className="skeleton-home-widgets">{[0, 1, 2, 3].map((item) => <Line key={item} width="100%" height={95} />)}</div><Line width="165px" height={48} /><section className="skeleton-section"><Line width="160px" height={11} /><Line width="min(65vw, 350px)" height={43} /><SessionList count={3} /></section><section className="skeleton-section skeleton-history"><Line width="85px" height={11} /><Line width="190px" height={43} /><SessionList count={3} /></section></>;
  if (view === "sessions") return <><div className="skeleton-breadcrumb"><Line width="65px" height={14} /></div><div className="skeleton-home-head"><div><Line width="118px" height={11} /><Line width="min(80vw, 490px)" height={83} /><Line width="min(65vw, 380px)" height={14} /></div><Line width="160px" height={48} /></div><section className="skeleton-section"><Line width="160px" height={11} /><Line width="min(65vw, 350px)" height={43} /><SessionList /></section></>;
  if (view === "settings") return <><div className="skeleton-breadcrumb"><Line width="120px" height={12} /></div><header className="settings-head skeleton-settings-head"><Line width="120px" height={11} /><Line width="min(75vw, 330px)" height={78} /><Line width="min(80vw, 300px)" height={14} /></header><div className="skeleton-settings"><div className="skeleton-settings-avatar"><Line width="76px" height={76} className="skeleton-avatar" /><div><Line width="130px" height={13} /><Line width="145px" height={44} /></div></div><Line width="100%" height={48} /><Line width="100%" height={48} /><Line width="150px" height={48} /></div></>;
  if (view === "editor") return <><div className="skeleton-breadcrumb"><Line width="200px" height={12} /></div><section className="session-editor skeleton-editor"><Line width="155px" height={11} /><Line width="min(80vw, 390px)" height={105} /><Line width="100%" height={48} /><Line width="100%" height={48} /><Line width="160px" height={48} /></section></>;
  return <><SessionHeading />{view === "overview" ? <section className="skeleton-overview"><div><Line width="min(50vw, 240px)" height={66} /><Line width="min(65vw, 360px)" height={38} /><Line width="min(70vw, 350px)" height={14} /><Line width="150px" height={48} /></div><div className="skeleton-metrics">{[0, 1, 2, 3, 4].map((item) => <div key={item}><Line width="60px" height={11} /><Line width="50px" height={48} /></div>)}</div></section> : null}
    {view === "players" && <section className="skeleton-content"><Line width="210px" height={55} /><div className="skeleton-actions"><Line width="150px" height={48} /><Line width="110px" height={48} /></div>{Array.from({ length: 6 }, (_, index) => <div className="skeleton-player-row" key={index}><Line width="min(55vw, 250px)" height={19} /><Line width="52px" height={20} /></div>)}<Line width="180px" height={48} /></section>}
    {view === "matches" && <section className="skeleton-content"><Line width="210px" height={53} /><Line width="120px" height={15} />{Array.from({ length: 3 }, (_, index) => <div className="skeleton-match" key={index}><Line width="105px" height={12} /><div><Line width="min(34vw, 170px)" height={45} /><Line width="84px" height={56} /><Line width="min(34vw, 170px)" height={45} /></div><Line width="140px" height={44} /></div>)}</section>}
    {view === "leaderboard" && <section className="skeleton-content"><div className="skeleton-switch"><Line width="150px" height={44} /><Line width="150px" height={44} /></div><Line width="min(60vw, 330px)" height={70} />{Array.from({ length: 5 }, (_, index) => <div className="skeleton-player-row" key={index}><Line width="min(38vw, 210px)" height={20} /><Line width="min(38vw, 230px)" height={18} /></div>)}</section>}</>;
}

export function WorkspaceSkeleton({ view }: { view: View }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <main className="site-shell workspace-page" aria-busy="true"><span className="sr-only" role="status">Loading {view}…</span><Header /><Body view={view} /></main>;
}
