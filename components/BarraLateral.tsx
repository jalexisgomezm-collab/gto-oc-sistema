"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

const gruposSolicitante = [
  {
    titulo: "Requerimientos",
    enlaces: [
      { href: "/solicitudes", label: "Solicitudes de mi área", exacto: true },
      { href: "/solicitudes/nueva", label: "Nueva solicitud" }
    ]
  }
];

const gruposCompras = [
  {
    titulo: "Solicitudes",
    enlaces: [
      { href: "/dashboard", label: "Dashboard por área", exacto: true },
      { href: "/solicitudes", label: "Solicitudes", exacto: true },
      { href: "/solicitudes/nueva", label: "Nueva solicitud" },
      { href: "/reportes", label: "Reporte de solicitudes" },
      { href: "/proyectos", label: "Proyectos / órdenes de trabajo" },
      { href: "/productos", label: "Catálogo de productos" }
    ]
  },
  {
    titulo: "Órdenes de compra",
    enlaces: [
      { href: "/ordenes", label: "Órdenes", exacto: true },
      { href: "/ordenes/nueva", label: "Nueva orden" },
      { href: "/proveedores", label: "Proveedores" },
      { href: "/compras-menores", label: "Compras menores" }
    ]
  },
  {
    titulo: "Administración",
    enlaces: [{ href: "/usuarios", label: "Usuarios y accesos" }]
  }
];


// Íconos de trazo (estilo de la guía del Sistema Integrado)
const ICONOS: Record<string, string> = {
  "/dashboard": "M4 20V11M10 20V5M16 20v-6M3 20h18",
  "/solicitudes": "M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4",
  "/solicitudes/nueva": "M12 5v14M5 12h14",
  "/reportes": "M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h4",
  "/proyectos": "M9 4h6v3H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4",
  "/productos": "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
  "/ordenes": "M2 4h3l2.5 11h11L21 7H6.2M9 20h.01M18 20h.01",
  "/ordenes/nueva": "M12 5v14M5 12h14",
  "/proveedores": "M3 7h18v13H3zM8 7V4h8v3M3 12h18",
  "/compras-menores": "M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0",
  "/usuarios": "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-4.9",
  correo: "M3 5h18v14H3zM3 7l9 6 9-6"
};
function Icono({ d }: { d?: string }) {
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="gto-log-ic">
      <path d={d} />
    </svg>
  );
}

function esActivo(href: string, exacto: boolean | undefined, pathname: string) {
  if (exacto) return pathname === href;
  return pathname.startsWith(href);
}

export default function BarraLateral({
  nombre,
  correo,
  esCompras,
  esMaestro = true,
  rolTexto
}: {
  nombre: string;
  correo: string;
  esCompras: boolean;
  esMaestro?: boolean;
  rolTexto: string;
}) {
  const pathname = usePathname();
  // Sin acceso al Maestro de Gestión: se oculta la gestión de OT/PI
  const grupos = esCompras
    ? esMaestro
      ? gruposCompras
      : gruposCompras
          .map((g) => ({ ...g, enlaces: g.enlaces.filter((e) => e.href !== "/proyectos" && e.href !== "/usuarios") }))
          .filter((g) => g.enlaces.length > 0)
    : gruposSolicitante;
  const base = nombre || correo || "";
  const iniciales =
    base
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <aside className="gto-log-side w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="gto-log-mod">
        <img src="https://sistema-integrado-gto.vercel.app/assets/icono-compras.png" alt="" />
        <strong>Logística y Compras</strong>
      </div>
      <nav className="flex-1 px-3 space-y-5">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="gto-log-grupo">{grupo.titulo}</p>
            <div className="space-y-1">
              {grupo.enlaces.map((e) => {
                const activo = esActivo(e.href, (e as any).exacto, pathname);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    className={`gto-log-link ${activo ? "on" : ""}`}
                  >
                    <Icono d={ICONOS[e.href]} />
                    <span>{e.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-3">
        <button
          type="button"
          data-directorio-gto
          className="gto-log-link w-full text-left"
        >
          <Icono d={ICONOS.correo} />
          <span>Directorio de correos</span>
        </button>
      </div>
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-verde text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{nombre || correo}</p>
            <p className="text-xs text-gray-400">{rolTexto}</p>
          </div>
        </div>
        <CerrarSesionBoton />
      </div>
    </aside>
  );
}
