"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAllDevices, signOutOtherDevices } from "./device-actions";

export type DisplayDevice = {
  sessionId: string;
  deviceName: string;
  deviceType: string;
  lastActive: string;
  current: boolean;
};

export function DevicesPanel({ devices }: { devices: DisplayDevice[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const otherCount = devices.filter((device) => !device.current).length;

  function signOutOthers() {
    setError("");
    startTransition(async () => {
      const result = await signOutOtherDevices();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function signOutAll() {
    setError("");
    startTransition(async () => {
      const result = await signOutAllDevices();
      if (result.error) setError(result.error);
    });
  }

  return <section className="devices-section" aria-labelledby="devices-heading">
    <div className="devices-heading"><div><span className="panel-index">ACCOUNT SECURITY</span><h2 id="devices-heading">DEVICES.</h2></div><span>{devices.length} / 3 active</span></div>
    <p className="devices-intro">Stay signed in on your phone, laptop, and tablet.</p>
    <div className="device-list">{devices.map((device) => <div className="device-row" key={device.sessionId}>
      <div className="device-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="23" height="23"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8m-4-3v3" /></svg></div>
      <div className="device-description"><strong>{device.deviceName}</strong><span>{device.current ? "Current device" : `Last active ${device.lastActive}`} · {device.deviceType}</span></div>
    </div>)}</div>
    <div className="device-actions"><button type="button" disabled={pending || otherCount === 0} onClick={signOutOthers}>Sign out other devices</button><button type="button" disabled={pending} onClick={signOutAll}>Sign out all devices</button></div>
    {error && <p className="message error" role="alert">{error}</p>}
  </section>;
}
