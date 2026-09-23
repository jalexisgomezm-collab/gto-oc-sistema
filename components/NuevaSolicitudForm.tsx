"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ItemSolicitud {
  productoId: string | null;
  descripcion: string;
  cantidad: string;
  um: string;
  observacion: string;
  sugerencias: { id: string; descripcion: string; um: string }[];
  mostrarSugerencias: boolean;
}

const AREAS = [
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "TALLER", label: "Taller" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "ADMINISTRACION", label: "Administración" }
];

const itemVacio: ItemSolicitud = {
  productoId: null,
  descripcion: "",
  cantidad: "1",
  um: "UND",
  observacion: "",
  sugerencias: [],
  mostrarSugerencias: false
};

export default function NuevaSolicitudForm() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState<ItemSolicitud[]>([{ ...itemVacio }]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizarItem(idx: number, cambios: Partial<ItemSolicitud>) {
    setItems((prev) => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], ...cambios };
      return copia;
    });
  }

  async function buscarSugerencias(idx: number, texto: string) {
    actualizarItem(idx, { descripcion: texto, productoId: null });
    if (texto.trim().length < 2) {
      actualizarItem(idx, { sugerencias: [], mostrarSugerencias: false });
      return;
    }
    try {
      const res = await fetch(`/api/productos?q=${encodeURIComponent(texto.trim())}`);
      const data = await res.json();
      actualizarItem(idx, { sugerencias: data.productos || [], mostrarSugerencias: true });
    } catch {
      // silencioso: si falla la búsqueda, el usuario igual puede escribir libremente
    }
  }

  function elegirSugerencia(idx: number, p: { id: string; descripcion: string; um: string }) {
    actualizarItem(idx, {
      productoId: p.id,
      descripcion: p.descripcion,
      um: p.um || "UND",
      sugerencias: [],
      mostrarSugerencias: false
    });
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...itemVacio }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!area) {
      setError("Selecciona el área que solicita");
      return;
    }
    if (items.some((it) => !it.descripcion.trim() || !it.cantidad)) {
      setError("Completa la descripción y la cantidad de todos los ítems");
      return;
    }

    setCargando(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          solicitante: solicitante || null,
          fecha_solicitud: fechaSolicitud,
          observaciones: observaciones || null,
          items: items.map((it) => ({
            producto_id: it.productoId,
            descripcion: it.descripcion.trim(),
            cantidad: Number(it.cantidad),
            um: it.um || "UND",
            observacion: it.observacion || null
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la solicitud");
      router.push(`/solicitudes/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-8 max-w-4xl pb-16">
      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-verde">Datos de la solicitud</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Área que solicita</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Selecciona un área...</option>
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Solicitante</label>
            <input
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              placeholder="Nombre de quien solicita"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de solicitud</label>
            <input
              type="date"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-verde">Productos solicitados</h2>
          <button type="button" onClick={agregarItem} className="text-xs text-verde hover:underline">
            + Agregar producto
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start border-b border-gray-100 pb-3">
              <div className="col-span-5 relative">
                <label className="block text-xs text-gray-500 mb-1">Producto</label>
                <input
                  value={it.descripcion}
                  onChange={(e) => buscarSugerencias(idx, e.target.value)}
                  onFocus={() => it.sugerencias.length > 0 && actualizarItem(idx, { mostrarSugerencias: true })}
                  onBlur={() => setTimeout(() => actualizarItem(idx, { mostrarSugerencias: false }), 150)}
                  placeholder="Escribe para buscar o crear un producto..."
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                {it.mostrarSugerencias && it.sugerencias.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                    {it.sugerencias.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => elegirSugerencia(idx, s)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          {s.descripcion} <span className="text-xs text-gray-400">({s.um})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {it.productoId && <p className="text-xs text-verde mt-0.5">Producto del catálogo</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="any"
                  value={it.cantidad}
                  onChange={(e) => actualizarItem(idx, { cantidad: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">U.M.</label>
                <input
                  value={it.um}
                  onChange={(e) => actualizarItem(idx, { um: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Observación</label>
                <input
                  value={it.observacion}
                  onChange={(e) => actualizarItem(idx, { observacion: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-1 text-right pt-5">
                {items.length > 1 && (
                  <button type="button" onClick={() => quitarItem(idx)} className="text-red-500 text-xs hover:underline">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-verde">Observaciones</h2>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Motivo del pedido, urgencia, proyecto relacionado, etc."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={cargando} className="bg-verde text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
        {cargando ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
