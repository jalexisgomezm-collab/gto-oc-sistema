"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { estadoItem, fmtCant, textoAtencion, type AtencionItem } from "@/lib/solicitudes";
import { fechaLima } from "@/lib/fechas";
import AtencionSolicitud, { type AvisoFraccionamiento, type CompraMenor, type ModoAtencion } from "@/components/AtencionSolicitud";

interface Adjunto {
  id: string;
  tipo: string;
  url: string;
  nombre: string | null;
}

export interface ItemSolicitud {
  id: string;
  posicion: number;
  descripcion: string;
  cantidad: number;
  um: string | null;
  observacion: string | null;
  solicitud_item_adjuntos?: Adjunto[];
}

export default function ItemsSolicitud({
  solicitudId,
  estado,
  esCompras,
  items,
  atenciones,
  limite,
  compras,
  avisos,
  totalAreaMes
}: {
  solicitudId: string;
  estado: string;
  esCompras: boolean;
  items: ItemSolicitud[];
  atenciones: AtencionItem[];
  limite: number;
  compras: CompraMenor[];
  avisos: AvisoFraccionamiento[];
  totalAreaMes: number;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, string>>({});
  const [modo, setModo] = useState<ModoAtencion>("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrada = estado === "anulada" || estado === "atendida";

  const filas = useMemo(
    () =>
      items.map((it, idx) => {
        const ats = atenciones.filter((a) => a.item_id === it.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { it, idx, ats, est: estadoItem(Number(it.cantidad), ats) };
      }),
    [items, atenciones]
  );

  const pendientes = filas.filter((f) => f.est.pendiente > 0 && f.est.clave !== "anulado");
  const resueltos = filas.filter((f) => f.est.pendiente <= 0).length;
  const porEntregar = atenciones.filter((a) => !a.orden_anulada && !a.entregado && (a.tipo === "ORDEN" || a.tipo === "COMPRA_MENOR"));
  const puedeAtender = esCompras && !cerrada;

  const seleccion = filas
    .filter((f) => sel[f.it.id] !== undefined)
    .map((f) => {
      const cant = Number(sel[f.it.id]);
      return {
        item_id: f.it.id,
        cantidad: cant,
        valida: cant > 0 && cant <= f.est.pendiente + 0.0001,
        etiqueta: `${f.idx + 1}. ${f.it.descripcion} — ${fmtCant(cant)} ${f.it.um || "UND"}${
          cant < f.est.pendiente ? ` (de ${fmtCant(f.est.pendiente)} pendientes)` : ""
        }`
      };
    });
  const seleccionValida = seleccion.length > 0 && seleccion.every((s) => s.valida);

  function alternar(id: string, pendiente: number) {
    setError(null);
    setSel((prev) => {
      const n = { ...prev };
      if (n[id] !== undefined) delete n[id];
      else n[id] = fmtCant(pendiente);
      return n;
    });
  }

  function todosPendientes() {
    const n: Record<string, string> = {};
    pendientes.forEach((f) => (n[f.it.id] = fmtCant(f.est.pendiente)));
    setSel(n);
  }

  function hrefOrden(tipo: "COMPRA" | "SERVICIO") {
    const lista = seleccion.map((s) => `${s.item_id}:${s.cantidad}`).join(",");
    return `/ordenes/nueva?solicitud=${solicitudId}&tipo=${tipo}&items=${encodeURIComponent(lista)}`;
  }

  function elegirModo(m: ModoAtencion) {
    if (!seleccionValida) return setError("Revisa las cantidades: deben ser mayores a cero y no superar lo pendiente");
    setError(null);
    setModo(modo === m ? "" : m);
  }

  async function rpc(nombre: string, args: Record<string, unknown>) {
    setError(null);
    setTrabajando(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc(nombre, args);
    setTrabajando(false);
    if (err) return setError(err.message);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Productos solicitados</h2>
          {atenciones.length > 0 && (
            <p className="text-xs text-gray-500">
              {resueltos} de {items.length} ítems resueltos{pendientes.length > 0 ? ` · ${pendientes.length} con saldo pendiente` : ""}
            </p>
          )}
        </div>
        {puedeAtender && pendientes.length > 0 && (
          <button type="button" onClick={todosPendientes} className="text-xs text-verde hover:underline">
            Marcar todos los pendientes
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filas.map(({ it, idx, ats, est }) => {
          const adjuntos = it.solicitud_item_adjuntos || [];
          const marcado = sel[it.id] !== undefined;
          const seleccionable = puedeAtender && est.pendiente > 0 && est.clave !== "anulado";
          return (
            <div key={it.id} className={`bg-white border rounded-lg p-4 ${marcado ? "border-verde ring-1 ring-verde" : "border-gray-200"}`}>
              <div className="flex items-start gap-3">
                {seleccionable && (
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(it.id, est.pendiente)}
                    className="mt-1 accent-verde"
                    aria-label={`Seleccionar ítem ${idx + 1}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {idx + 1}. {it.descripcion}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cantidad: {fmtCant(Number(it.cantidad))} {it.um}
                        {it.observacion ? ` · ${it.observacion}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${est.estilo}`}>{est.etiqueta}</span>
                      {est.pendiente > 0 && est.atendida > 0 && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Falta: {fmtCant(est.pendiente)} {it.um}
                        </p>
                      )}
                    </div>
                  </div>

                  {marcado && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <label className="text-gray-500">Cantidad a atender ahora:</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={est.pendiente}
                        value={sel[it.id]}
                        onChange={(e) => setSel((p) => ({ ...p, [it.id]: e.target.value }))}
                        className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                      <span className="text-gray-400">
                        de {fmtCant(est.pendiente)} {it.um} pendientes
                      </span>
                    </div>
                  )}

                  {ats.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {ats.map((a) => (
                        <li key={a.id} className={`text-xs flex flex-wrap items-center gap-x-2 ${a.orden_anulada ? "text-gray-400 line-through" : "text-gray-600"}`}>
                          <span className="font-medium">
                            {fmtCant(Number(a.cantidad))} {it.um}
                          </span>
                          <span>·</span>
                          {a.tipo === "ORDEN" && a.orden_id && esCompras ? (
                            <Link href={`/ordenes/${a.orden_id}`} className="text-verde hover:underline">
                              {textoAtencion(a)}
                            </Link>
                          ) : (
                            <span>{textoAtencion(a)}</span>
                          )}
                          <span className="text-gray-400">{fechaLima(a.created_at)}</span>
                          {a.tipo !== "ANULADO" && !a.orden_anulada && (
                            <span className={a.entregado ? "text-verde" : "text-amber-700"}>
                              {a.entregado ? "✓ entregado al área" : "por entregar"}
                            </span>
                          )}
                          {esCompras && !a.entregado && !a.orden_anulada && (a.tipo === "ORDEN" || a.tipo === "COMPRA_MENOR") && (
                            <button
                              type="button"
                              disabled={trabajando}
                              onClick={() => rpc("marcar_atenciones_entregadas", { p_atenciones: [a.id] })}
                              className="text-verde hover:underline"
                            >
                              Marcar entregado
                            </button>
                          )}
                          {esCompras && (a.tipo === "ALMACEN" || a.tipo === "ANULADO") && (
                            <button
                              type="button"
                              disabled={trabajando}
                              onClick={() => rpc("deshacer_atencion", { p_atencion: a.id })}
                              className="text-gray-400 hover:text-red-600 hover:underline"
                            >
                              Deshacer
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {adjuntos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {adjuntos.map((a) =>
                        a.tipo === "imagen" ? (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={a.nombre || ""} className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                          </a>
                        ) : (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-verde hover:underline bg-verde-claro px-2 py-1 rounded-md max-w-xs truncate"
                          >
                            {a.nombre || a.url}
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">Esta solicitud no tiene ítems.</div>
        )}
      </div>

      {esCompras && porEntregar.length > 1 && (
        <div className="mt-3 text-right">
          <button
            type="button"
            disabled={trabajando}
            onClick={() => rpc("marcar_atenciones_entregadas", { p_atenciones: porEntregar.map((a) => a.id) })}
            className="text-xs text-verde hover:underline"
          >
            Marcar todo lo pedido/comprado como entregado al área ({porEntregar.length})
          </button>
        </div>
      )}

      {puedeAtender && seleccion.length > 0 && (
        <div className="sticky bottom-3 mt-4 bg-white border border-verde rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium mb-2">
            {seleccion.length} ítem(s) seleccionado(s): ¿cómo se atienden?
          </p>
          <div className="flex flex-wrap gap-2">
            {seleccionValida ? (
              <>
                <Link href={hrefOrden("COMPRA")} className="bg-verde text-white text-sm px-3 py-1.5 rounded-md hover:bg-verde-oscuro">
                  Orden de compra
                </Link>
                <Link href={hrefOrden("SERVICIO")} className="border border-verde text-verde text-sm px-3 py-1.5 rounded-md hover:bg-verde-claro">
                  Orden de servicio
                </Link>
              </>
            ) : (
              <span className="text-xs text-red-600 self-center">Revisa las cantidades antes de continuar.</span>
            )}
            <button
              type="button"
              onClick={() => elegirModo("compra")}
              className={`text-sm px-3 py-1.5 rounded-md border ${modo === "compra" ? "border-verde bg-verde-claro" : "border-gray-300 hover:bg-gray-50"}`}
            >
              Compra menor (≤ S/ {limite})
            </button>
            <button
              type="button"
              onClick={() => elegirModo("almacen")}
              className={`text-sm px-3 py-1.5 rounded-md border ${modo === "almacen" ? "border-verde bg-verde-claro" : "border-gray-300 hover:bg-gray-50"}`}
            >
              Desde almacén
            </button>
            <button
              type="button"
              onClick={() => elegirModo("anular")}
              className={`text-sm px-3 py-1.5 rounded-md border ${modo === "anular" ? "border-red-300 bg-red-50 text-red-700" : "border-gray-300 text-red-600 hover:bg-red-50"}`}
            >
              Anular ítems
            </button>
            <button type="button" onClick={() => { setSel({}); setModo(""); }} className="text-sm text-gray-500 hover:underline ml-auto">
              Quitar selección
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Con OC/OS: se abre la orden solo con estos ítems y cantidades; el resto sigue pendiente para otro proveedor.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {esCompras && (
        <div className="mt-4">
          <AtencionSolicitud
            solicitudId={solicitudId}
            estado={estado}
            limite={limite}
            compras={compras}
            avisos={avisos}
            totalAreaMes={totalAreaMes}
            modo={modo}
            setModo={setModo}
            seleccion={seleccion.filter((s) => s.valida)}
            alTerminar={() => setSel({})}
          />
        </div>
      )}
    </div>
  );
}
