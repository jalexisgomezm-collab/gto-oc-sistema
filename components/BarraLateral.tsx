"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

const enlaces = [
  { href: "/ordenes", label: "Órdenes" },
  { href: "/ordenes/nueva", label: "Nueva orden" },
  { href: "/proveedores", label: "Proveedores" }
];

function esActivo(href: string, pathname: string) {
  if (href === "/ordenes") return pathname === "/ordenes";
  return pathname.startsWith(href);
}

export default function BarraLateral({ nombre, correo }: { nombre: string; correo: string }) {
  const pathname = usePathname();
  const base = nombre || correo || "";
  const iniciales =
    base
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <img src="/logo-gto.png" alt="GTO" className="w-full h-auto" />
      </div>
      <p className="px-6 pb-2 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
        Órdenes de compra
      </p>
      <nav className="flex-1 px-3 space-y-1">
        {enlaces.map((e) => {
          const activo = esActivo(e.href, pathname);
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`block px-3 py-2 rounded-md text-sm ${
                activo ? "bg-verde-claro text-verde-oscuro font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {e.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-verde text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{nombre || correo}</p>
            <p className="text-xs text-gray-400">Usuario</p>
          </div>
        </div>
        <CerrarSesionBoton />
      </div>
    </aside>
  );
}
