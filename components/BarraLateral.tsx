"use client";

import Link from "next/link";
import { useState } from "react";
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

function NavIcon({ href }: { href: string }) {
  const path = href.includes("nueva") ? "M12 5v14M5 12h14"
    : href === "/dashboard" ? "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
    : href === "/proveedores" || href === "/usuarios" ? "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87"
    : "M5 3h10l4 4v14H5zM14 3v5h5M9 12h6M9 16h6";
  return <svg className="log-nav-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
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
  const [menuAbierto, setMenuAbierto] = useState(false);
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
    <>
      <button type="button" className="log-mobile-menu" aria-controls="log-sidebar" aria-expanded={menuAbierto} onClick={() => setMenuAbierto(!menuAbierto)}>☰ Menú de Logística</button>
    <aside id="log-sidebar" className={`log-sidebar ${menuAbierto ? "log-open" : ""}`}>
      <div className="log-module"><img src="https://sistema-integrado-gto.vercel.app/assets/icono-compras.png" alt="" /><div><small>GESTIÓN DE ABASTECIMIENTO</small><strong>Logística y Compras</strong></div></div>
      <nav className="log-navigation flex-1 px-3 space-y-5" aria-label="Navegación de Logística">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">{grupo.titulo}</p>
            <div className="space-y-1">
              {grupo.enlaces.map((e) => {
                const activo = esActivo(e.href, (e as any).exacto, pathname);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={activo ? "page" : undefined}
                    onClick={() => setMenuAbierto(false)}
                    className={`block px-3 py-2 rounded-md text-sm ${
                      activo ? "bg-verde-claro text-verde-oscuro font-medium" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <NavIcon href={e.href} />{e.label}
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
          className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
        >
          ✉ Directorio de correos
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
    </>
  );
}

