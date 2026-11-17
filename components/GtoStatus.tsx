"use client";
import { useEffect, useRef } from "react";

type Source = { list(): Promise<unknown[]>; read(id: string): Promise<void> };
type API = { mount(host: HTMLElement, opts: { module: string; source?: Source }): { dispose(): void }; otSource(client: unknown): Source };
declare global { interface Window { GTOStatus?: API } }

// This URL is replaced by the shared review deployment before committing integrations.
const ASSET_BASE = "https://sistema-integrado-gto.vercel.app/";
export default function GtoStatus({ module, source }: { module: string; source?: Source }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let mounted: { dispose(): void } | undefined;
    const start = () => { if (!disposed && host.current && window.GTOStatus) mounted = window.GTOStatus.mount(host.current, { module, source }); };
    const script = document.createElement("script");
    script.src = ASSET_BASE + "gto-status.js";
    script.async = true;
    script.onload = start;
    script.onerror = () => { if (!disposed && host.current) host.current.textContent = "Hora y avisos temporalmente no disponibles."; };
    if (window.GTOStatus) start(); else document.head.appendChild(script);
    return () => { disposed = true; mounted?.dispose(); script.onload = script.onerror = null; script.remove(); };
  }, [module, source]);
  return <div ref={host} />;
}
