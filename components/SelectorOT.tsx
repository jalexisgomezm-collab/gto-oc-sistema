"use client";

import { useRef, useState } from "react";

export interface OTOpcion {
  id: string;
  nombre: string;
  tipo?: string | null;
  cliente: string | null;
  numero_orden_trabajo: string | null;
  numero_oc_cliente?: string | null;
}

export function etiquetaOT(p: OTOpcion) {
  return [p.numero_orden_trabajo, p.nombre, p.cliente].filter(Boolean).join(" · ");
}

/**
 * Lista desplegable de órdenes de trabajo (servicios del Maestro de Gestión).
 * Al enfocar muestra las OT activas más recientes; se puede buscar por N° de OT,
 * nombre del servicio, cliente u OC del cliente.
 */
export default function SelectorOT({
  valorId,
  valorEtiqueta,
  onElegir,
  placeholder = "Busca por N° de OT, servicio o cliente..."
}: {
  valorId: string | null;
  valorEtiqueta: string;
  onElegir: (p: OTOpcion | null) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valorEtiqueta);
  const [opciones, setOpciones] = useState<OTOpcion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const pedido = useRef(0);

  async function cargar(q: string) {
    const n = ++pedido.current;
    setCargando(true);
    try {
      const res = await fetch(`/api/proyectos?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (n === pedido.current) setOpciones(data.proyectos || []);
    } catch {
      // silencioso
    } finally {
      if (n === pedido.current) setCargando(false);
    }
  }

  function escribir(v: string) {
    setTexto(v);
    if (valorId) onElegir(null);
    setAbierto(true);
    cargar(v);
  }

  function elegir(p: OTOpcion) {
    setTexto(etiquetaOT(p));
    setAbierto(false);
    onElegir(p);
  }

  return (
    <div className="relative">
      <input
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        onFocus={() => {
          setAbierto(true);
          cargar(valorId ? "" : texto);
        }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
      {abierto && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
          {opciones.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => elegir(p)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${p.id === valorId ? "bg-gray-50" : ""}`}
              >
                <span className="font-mono font-medium">{p.numero_orden_trabajo || "Sin OT"}</span>{" "}
                <span>{p.nombre}</span>
                <span className="block text-xs text-gray-400">
                  {[p.cliente, p.numero_oc_cliente ? `OC ${p.numero_oc_cliente}` : null].filter(Boolean).join(" · ") || p.tipo}
                </span>
              </button>
            </li>
          ))}
          {!cargando && opciones.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-400">No se encontraron órdenes de trabajo activas.</li>
          )}
          {cargando && opciones.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">Buscando...</li>}
        </ul>
      )}
    </div>
  );
}
