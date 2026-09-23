"use client";

import { useState } from "react";

interface Producto {
  id: string;
  descripcion: string;
  um: string;
  codigo: string | null;
  activo: boolean;
}

export default function ProductosLista({ productos }: { productos: Producto[] }) {
  const [lista, setLista] = useState<Producto[]>(productos);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borradorEdicion, setBorradorEdicion] = useState<Producto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaUm, setNuevaUm] = useState("UND");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [creando, setCreando] = useState(false);

  function empezarEdicion(p: Producto) {
    setEditandoId(p.id);
    setBorradorEdicion({ ...p });
    setError(null);
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setBorradorEdicion(null);
  }

  async function guardarEdicion() {
    if (!borradorEdicion) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos/${borradorEdicion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: borradorEdicion.descripcion,
          um: borradorEdicion.um,
          codigo: borradorEdicion.codigo,
          activo: borradorEdicion.activo
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setLista((prev) => prev.map((p) => (p.id === data.producto.id ? data.producto : p)));
      setEditandoId(null);
      setBorradorEdicion(null);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setGuardando(false);
    }
  }

  async function crearProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaDescripcion.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: nuevaDescripcion, um: nuevaUm, codigo: nuevoCodigo || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el producto");
      setLista((prev) => {
        if (prev.some((p) => p.id === data.producto.id)) {
          return prev.map((p) => (p.id === data.producto.id ? data.producto : p));
        }
        return [...prev, data.producto].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
      });
      setNuevaDescripcion("");
      setNuevaUm("UND");
      setNuevoCodigo("");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={crearProducto} className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
        <h2 className="text-sm font-semibold text-verde">Nuevo producto</h2>
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-7">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <input
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              placeholder="Ej: Guantes de nitrilo talla M"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">U.M.</label>
            <input value={nuevaUm} onChange={(e) => setNuevaUm(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Código (opcional)</label>
            <input value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-1">
            <button
              type="submit"
              disabled={creando || !nuevaDescripcion.trim()}
              className="w-full bg-verde text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
            >
              {creando ? "..." : "+"}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Descripción</th>
              <th className="text-left px-4 py-2">U.M.</th>
              <th className="text-left px-4 py-2">Código</th>
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
                        value={borradorEdicion?.descripcion || ""}
                        onChange={(e) => setBorradorEdicion((d) => (d ? { ...d, descripcion: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    ) : (
                      p.descripcion
                    )}
                  </td>
                  <td className="px-4 py-2 w-24">
                    {editando ? (
                      <input
                        value={borradorEdicion?.um || ""}
                        onChange={(e) => setBorradorEdicion((d) => (d ? { ...d, um: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    ) : (
                      p.um
                    )}
                  </td>
                  <td className="px-4 py-2 w-32">
                    {editando ? (
                      <input
                        value={borradorEdicion?.codigo || ""}
                        onChange={(e) => setBorradorEdicion((d) => (d ? { ...d, codigo: e.target.value } : d))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    ) : (
                      p.codigo || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 w-28">
                    {editando ? (
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={borradorEdicion?.activo ?? true}
                          onChange={(e) => setBorradorEdicion((d) => (d ? { ...d, activo: e.target.checked } : d))}
                        />
                        Activo
                      </label>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? "bg-verde-claro text-verde-oscuro" : "bg-gray-100 text-gray-500"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aún no hay productos en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
