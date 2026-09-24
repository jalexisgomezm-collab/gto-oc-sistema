"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Adjunto {
  tipo: "imagen" | "enlace";
  url: string;
  nombre: string;
}

interface ItemSolicitud {
  productoId: string | null;
  descripcion: string;
  cantidad: string;
  um: string;
  observacion: string;
  sugerencias: { id: string; descripcion: string; um: string }[];
  mostrarSugerencias: boolean;
  adjuntos: Adjunto[];
  subiendoAdjunto: boolean;
  enlaceNuevo: string;
}

interface ProyectoOpcion {
  id: string;
  nombre: string;
  tipo: string;
  cliente: string | null;
}

const AREAS = [
  { value: "LABORATORIO", label: "Laboratorio" },
  { value: "TALLER", label: "Taller" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "ADMINISTRACION", label: "Administración" }
];

const PRIORIDADES = [
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Media" },
  { value: "BAJA", label: "Baja" }
];

const itemVacio: ItemSolicitud = {
  productoId: null,
  descripcion: "",
  cantidad: "1",
  um: "UND",
  observacion: "",
  sugerencias: [],
  mostrarSugerencias: false,
  adjuntos: [],
  subiendoAdjunto: false,
  enlaceNuevo: ""
};

async function subirImagenReferencia(file: File): Promise<string> {
  const supabase = createClient();
  const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ruta = `solicitudes/${crypto.randomUUID()}-${nombreSeguro}`;
  const { error } = await supabase.storage.from("adjuntos").upload(ruta, file, { upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  const { data } = supabase.storage.from("adjuntos").getPublicUrl(ruta);
  return data.publicUrl;
}

export default function NuevaSolicitudForm() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(new Date().toISOString().slice(0, 10));
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState<ItemSolicitud[]>([{ ...itemVacio }]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------- proyecto / abastecimiento
  const [perteneceProyecto, setPerteneceProyecto] = useState(false);
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [proyectoNombreElegido, setProyectoNombreElegido] = useState("");
  const [busquedaProyecto, setBusquedaProyecto] = useState("");
  const [sugerenciasProyecto, setSugerenciasProyecto] = useState<ProyectoOpcion[]>([]);
  const [mostrarSugerenciasProyecto, setMostrarSugerenciasProyecto] = useState(false);

  async function buscarProyectos(texto: string) {
    setBusquedaProyecto(texto);
    setProyectoId(null);
    setProyectoNombreElegido("");
    if (texto.trim().length < 2) {
      setSugerenciasProyecto([]);
      setMostrarSugerenciasProyecto(false);
      return;
    }
    try {
      const res = await fetch(`/api/proyectos?q=${encodeURIComponent(texto.trim())}`);
      const data = await res.json();
      setSugerenciasProyecto(data.proyectos || []);
      setMostrarSugerenciasProyecto(true);
    } catch {
      // silencioso
    }
  }

  function elegirProyecto(p: ProyectoOpcion) {
    setProyectoId(p.id);
    setProyectoNombreElegido(p.nombre);
    setBusquedaProyecto(p.nombre);
    setSugerenciasProyecto([]);
    setMostrarSugerenciasProyecto(false);
  }

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
    setItems((prev) => [...prev, { ...itemVacio, adjuntos: [] }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function subirFotosReferencia(idx: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    actualizarItem(idx, { subiendoAdjunto: true });
    setError(null);
    try {
      const nuevos: Adjunto[] = [];
      for (const file of Array.from(files)) {
        const url = await subirImagenReferencia(file);
        nuevos.push({ tipo: "imagen", url, nombre: file.name });
      }
      setItems((prev) => {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], adjuntos: [...copia[idx].adjuntos, ...nuevos] };
        return copia;
      });
    } catch (err: any) {
      setError(err.message || "No se pudo subir la imagen de referencia");
    } finally {
      actualizarItem(idx, { subiendoAdjunto: false });
    }
  }

  function agregarEnlace(idx: number) {
    const url = items[idx].enlaceNuevo.trim();
    if (!url) return;
    setItems((prev) => {
      const copia = [...prev];
      copia[idx] = {
        ...copia[idx],
        adjuntos: [...copia[idx].adjuntos, { tipo: "enlace", url, nombre: url }],
        enlaceNuevo: ""
      };
      return copia;
    });
  }

  function quitarAdjunto(idx: number, adjuntoIdx: number) {
    setItems((prev) => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], adjuntos: copia[idx].adjuntos.filter((_, i) => i !== adjuntoIdx) };
      return copia;
    });
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
    if (perteneceProyecto && !proyectoId) {
      setError("Selecciona un proyecto de la lista, o marca esta solicitud como abastecimiento");
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
          prioridad,
          proyecto_id: perteneceProyecto ? proyectoId : null,
          observaciones: observaciones || null,
          items: items.map((it) => ({
            producto_id: it.productoId,
            descripcion: it.descripcion.trim(),
            cantidad: Number(it.cantidad),
            um: it.um || "UND",
            observacion: it.observacion || null,
            adjuntos: it.adjuntos.map((a) => ({ tipo: a.tipo, url: a.url, nombre: a.nombre }))
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
        <div className="grid grid-cols-4 gap-4">
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {PRIORIDADES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-600 mb-2">¿A qué corresponde este pedido?</p>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={!perteneceProyecto} onChange={() => setPerteneceProyecto(false)} />
              Abastecimiento general (no está ligado a un proyecto)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="radio" checked={perteneceProyecto} onChange={() => setPerteneceProyecto(true)} />
              Proyecto / orden de trabajo
            </label>
          </div>
          {perteneceProyecto && (
            <div className="relative max-w-md">
              <input
                value={busquedaProyecto}
                onChange={(e) => buscarProyectos(e.target.value)}
                onFocus={() => sugerenciasProyecto.length > 0 && setMostrarSugerenciasProyecto(true)}
                onBlur={() => setTimeout(() => setMostrarSugerenciasProyecto(false), 150)}
                placeholder="Busca el proyecto por nombre..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              {mostrarSugerenciasProyecto && sugerenciasProyecto.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                  {sugerenciasProyecto.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={() => elegirProyecto(p)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        {p.nombre} <span className="text-xs text-gray-400">({p.cliente || p.tipo})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {proyectoId && <p className="text-xs text-verde mt-1">Enlazado a: {proyectoNombreElegido}</p>}
              {!proyectoId && busquedaProyecto.trim().length >= 2 && (
                <p className="text-xs text-gray-400 mt-1">
                  Si no aparece, créalo primero en{" "}
                  <a href="/proyectos" target="_blank" className="text-verde hover:underline">
                    Proyectos
                  </a>
                  .
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-verde">Productos solicitados</h2>
          <button type="button" onClick={agregarItem} className="text-xs text-verde hover:underline">
            + Agregar producto
          </button>
        </div>
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-4 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-start">
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

              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Referencias (fotos o enlaces, opcional)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => subirFotosReferencia(idx, e.target.files)}
                    disabled={it.subiendoAdjunto}
                    className="text-xs"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      value={it.enlaceNuevo}
                      onChange={(e) => actualizarItem(idx, { enlaceNuevo: e.target.value })}
                      placeholder="Pegar enlace de referencia..."
                      className="border border-gray-300 rounded-md px-2 py-1 text-xs w-56"
                    />
                    <button
                      type="button"
                      onClick={() => agregarEnlace(idx)}
                      className="text-xs text-verde hover:underline"
                    >
                      + Agregar enlace
                    </button>
                  </div>
                  {it.subiendoAdjunto && <span className="text-xs text-gray-400">Subiendo...</span>}
                </div>
                {it.adjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {it.adjuntos.map((a, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1">
                        {a.tipo === "imagen" ? (
                          <img src={a.url} alt="" className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-verde hover:underline max-w-[10rem] truncate">
                            {a.nombre}
                          </a>
                        )}
                        <button type="button" onClick={() => quitarAdjunto(idx, aIdx)} className="text-red-500 text-xs">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
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
