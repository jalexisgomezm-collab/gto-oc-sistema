"use client";

import { useState } from "react";

interface Proyecto {
  id: string;
  nombre: string;
  tipo: string;
  cliente: string | null;
  numero_oc_cliente: string | null;
  numero_orden_trabajo: string | null;
  estado: string;
}

const TIPOS = ["EVALUACION", "REPARACION", "MANTENIMIENTO", "VENTA", "OTRO"];
const TIPO_LABEL: Record<string, string> = {
  EVALUACION: "Evaluación",
  REPARACION: "Reparación",
  MANTENIMIENTO: "Mantenimiento",
  VENTA: "Venta",
  OTRO: "Otro"
};

const vacio = {
  nombre: "",
  tipo: "EVALUACION",
  cliente: "",
  numero_oc_cliente: "",
  numero_orden_trabajo: ""
};

export default function ProyectosLista({ proyectos }: { proyectos: Proyecto[] }) {
  const [lista, setLista] = useState<Proyecto[]>(proyectos);
  const [nuevo, setNuevo] = useState({ ...vacio });
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Proyecto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function empezarEdicion(p: Proyecto) {
    setEditandoId(p.id);
    setBorrador({ ...p });
    setError(null);
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setBorrador(null);
  }

  async function guardarEdicion() {
    if (!borrador) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/proyectos/${borrador.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrador)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setLista((prev) => prev.map((p) => (p.id === data.proyecto.id ? data.proyecto : p)));
      setEditandoId(null);
      setBorrador(null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setGuardando(false);
    }
  }

  async function crearProyecto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el proyecto");
      setLista((prev) => [data.proyecto, ...prev]);
      setNuevo({ ...vacio });
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={crearProyecto} className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
        <h2 className="text-sm font-semibold text-verde">Nuevo proyecto / orden de trabajo</h2>
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <label className="block text-xs text-gray-500 mb-1">Nombre / descripción</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              placeholder="Ej: Mantenimiento transformador cliente X"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo((n) => ({ ...n, tipo: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
            <input
              value={nuevo.cliente}
              onChange={(e) => setNuevo((n) => ({ ...n, cliente: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">N.° OC del cliente</label>
            <input
              value={nuevo.numero_oc_cliente}
              onChange={(e) => setNuevo((n) => ({ ...n, numero_oc_cliente: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-gray-500 mb-1">N.° orden de trabajo</label>
            <input
              value={nuevo.numero_orden_trabajo}
              onChange={(e) => setNuevo((n) => ({ ...n, numero_orden_trabajo: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-1">
            <button
              type="submit"
              disabled={creando || !nuevo.nombre.trim()}
              className="w-full bg-verde text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
            >
              {creando ? "..." : "+"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Usa el N.° de OC del cliente si el trabajo cuenta con una orden de compra externa, o el N.° de orden de
          trabajo interno si no la tiene.
        </p>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Tipo</th>
              <th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2">OC cliente / O.T.</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((p) => {
              const editando = editandoId === p.id;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    {editando ? (
                      <input
                        value={borrador?.nombre || ""}
                        onChange={(e) => setBorrador((d) => (d ? { ...d, nombre: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    ) : (
                      p.nombre
                    )}
                  </td>
                  <td className="px-4 py-2 w-36">
                    {editando ? (
                      <select
                        value={borrador?.tipo || "OTRO"}
                        onChange={(e) => setBorrador((d) => (d ? { ...d, tipo: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      >
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {TIPO_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      TIPO_LABEL[p.tipo] || p.tipo
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editando ? (
                      <input
                        value={borrador?.cliente || ""}
                        onChange={(e) => setBorrador((d) => (d ? { ...d, cliente: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    ) : (
                      p.cliente || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {editando ? (
                      <div className="flex gap-1">
                        <input
                          value={borrador?.numero_oc_cliente || ""}
                          onChange={(e) => setBorrador((d) => (d ? { ...d, numero_oc_cliente: e.target.value } : d))}
                          placeholder="OC cliente"
                          className="w-1/2 border border-gray-300 rounded-md px-2 py-1 text-xs"
                        />
                        <input
                          value={borrador?.numero_orden_trabajo || ""}
                          onChange={(e) => setBorrador((d) => (d ? { ...d, numero_orden_trabajo: e.target.value } : d))}
                          placeholder="O.T."
                          className="w-1/2 border border-gray-300 rounded-md px-2 py-1 text-xs"
                        />
                      </div>
                    ) : (
                      p.numero_oc_cliente || p.numero_orden_trabajo || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 w-28">
                    {editando ? (
                      <select
                        value={borrador?.estado || "activo"}
                        onChange={(e) => setBorrador((d) => (d ? { ...d, estado: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      >
                        <option value="activo">Activo</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.estado === "activo" ? "bg-verde-claro text-verde-oscuro" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.estado}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {editando ? (
                      <>
                        <button
                          type="button"
                          onClick={guardarEdicion}
                          disabled={guardando}
                          className="text-verde hover:underline text-sm mr-3 disabled:opacity-60"
                        >
                          Guardar
                        </button>
                        <button type="button" onClick={cancelarEdicion} className="text-gray-500 hover:underline text-sm">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => empezarEdicion(p)} className="text-verde hover:underline text-sm">
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aún no hay proyectos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
