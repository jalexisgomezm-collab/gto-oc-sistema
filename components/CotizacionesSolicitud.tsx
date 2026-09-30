"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MINIMO_COTIZACIONES, TIPO_ORDEN_LABEL } from "@/lib/solicitudes";

export interface Cotizacion {
  id: string;
  proveedor_id: string | null;
  proveedor_nombre: string;
  ruc: string | null;
  moneda: "SOLES" | "DOLARES";
  monto: number;
  incluye_igv: boolean;
  plazo_entrega: string | null;
  forma_pago: string | null;
  garantia: string | null;
  validez: string | null;
  observaciones: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  elegida: boolean;
}

interface ProveedorOpcion {
  id: string;
  razon_social: string;
  ruc: string;
}

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const simbolo = (m: string) => (m === "DOLARES" ? "US$" : "S/");
const totalConIgv = (c: Cotizacion) => (c.incluye_igv ? Number(c.monto) : Math.round(Number(c.monto) * 1.18 * 100) / 100);

const formVacio = {
  proveedorId: "",
  proveedorNombre: "",
  ruc: "",
  moneda: "SOLES" as "SOLES" | "DOLARES",
  monto: "",
  incluyeIgv: false,
  plazo: "",
  formaPago: "",
  garantia: "",
  validez: "",
  observaciones: ""
};

export default function CotizacionesSolicitud({
  solicitudId,
  estado,
  cotizaciones,
  proveedores,
  justificacion,
  motivoExcepcion,
  ordenes,
  hayPendientes
}: {
  solicitudId: string;
  estado: string;
  cotizaciones: Cotizacion[];
  proveedores: ProveedorOpcion[];
  justificacion: string | null;
  motivoExcepcion: string | null;
  ordenes: { id: string; numero: number | null; tipo: string | null; proveedor: string | null; anulada: boolean }[];
  hayPendientes: boolean;
}) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [f, setF] = useState({ ...formVacio });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [justif, setJustif] = useState("");
  const [motivo, setMotivo] = useState("");

  const bloqueado = !hayPendientes || estado === "anulada" || estado === "atendida";
  const elegida = cotizaciones.find((c) => c.elegida) || null;
  const faltan = Math.max(0, MINIMO_COTIZACIONES - cotizaciones.length);

  // menor precio (con IGV) dentro de la moneda más usada
  const monedaBase =
    cotizaciones.filter((c) => c.moneda === "DOLARES").length > cotizaciones.filter((c) => c.moneda === "SOLES").length
      ? "DOLARES"
      : "SOLES";
  const comparables = cotizaciones.filter((c) => c.moneda === monedaBase);
  const menor = comparables.length > 0 ? Math.min(...comparables.map(totalConIgv)) : null;

  function set<K extends keyof typeof formVacio>(k: K, v: (typeof formVacio)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const prov = proveedores.find((p) => p.id === f.proveedorId);
    const nombre = prov ? prov.razon_social : f.proveedorNombre.trim();
    if (!nombre) return setError("Elige el proveedor o escribe su nombre");
    if (!f.monto || Number(f.monto) <= 0) return setError("Ingresa el monto cotizado");

    setGuardando(true);
    const supabase = createClient();
    try {
      let archivoPath: string | null = null;
      if (archivo) {
        const seguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        archivoPath = `cotizaciones/${solicitudId}/${crypto.randomUUID()}-${seguro}`;
        const { error: errUp } = await supabase.storage.from("documentos-oc").upload(archivoPath, archivo, { upsert: false });
        if (errUp) throw new Error(`No se pudo subir el archivo: ${errUp.message}`);
      }
      const { error: errIns } = await supabase.from("solicitud_cotizaciones").insert({
        solicitud_id: solicitudId,
        proveedor_id: prov ? prov.id : null,
        proveedor_nombre: nombre,
        ruc: prov ? prov.ruc : f.ruc.trim() || null,
        moneda: f.moneda,
        monto: Number(f.monto),
        incluye_igv: f.incluyeIgv,
        plazo_entrega: f.plazo.trim() || null,
        forma_pago: f.formaPago.trim() || null,
        garantia: f.garantia.trim() || null,
        validez: f.validez.trim() || null,
        observaciones: f.observaciones.trim() || null,
        archivo_path: archivoPath,
        archivo_nombre: archivo ? archivo.name : null
      });
      if (errIns) throw new Error(errIns.message);

      if (estado === "pendiente" || estado === "en_consulta" || estado === "observada") {
        await supabase.rpc("registrar_seguimiento", {
          p_solicitud: solicitudId,
          p_estado: "en_cotizacion",
          p_comentario: `Se recibió cotización de ${nombre}`
        });
      }
      setF({ ...formVacio });
      setArchivo(null);
      setMostrarForm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar la cotización");
    } finally {
      setGuardando(false);
    }
  }

  async function verArchivo(path: string) {
    const supabase = createClient();
    const { data, error: err } = await supabase.storage.from("documentos-oc").createSignedUrl(path, 300);
    if (err || !data) return setError("No se pudo abrir el archivo");
    window.open(data.signedUrl, "_blank");
  }

  async function eliminar(c: Cotizacion) {
    if (!window.confirm(`¿Eliminar la cotización de ${c.proveedor_nombre}?`)) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("solicitud_cotizaciones").delete().eq("id", c.id);
    if (err) return setError(err.message);
    if (c.archivo_path) await supabase.storage.from("documentos-oc").remove([c.archivo_path]);
    router.refresh();
  }

  function abrirElegir(c: Cotizacion) {
    setEligiendo(c.id);
    setJustif(menor !== null && c.moneda === monedaBase && totalConIgv(c) === menor ? "Menor precio" : "");
    setMotivo("");
    setError(null);
  }

  async function confirmarElegir() {
    if (!eligiendo) return;
    setError(null);
    if (!justif.trim()) return setError("Indica por qué eliges este proveedor");
    if (faltan > 0 && !motivo.trim()) return setError(`Hay menos de ${MINIMO_COTIZACIONES} cotizaciones: indica el motivo`);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("elegir_cotizacion", {
      p_cotizacion: eligiendo,
      p_justificacion: justif.trim(),
      p_motivo_excepcion: motivo.trim() || null
    });
    if (err) return setError(err.message);
    setEligiendo(null);
    router.refresh();
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-verde">Cuadro comparativo de cotizaciones</h2>
          <p className="text-xs text-gray-500">Solo visible para el área de compras.</p>
        </div>
        {!bloqueado && !mostrarForm && (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="text-sm border border-verde text-verde px-3 py-1.5 rounded-md hover:bg-verde-claro"
          >
            + Registrar cotización
          </button>
        )}
      </div>

      <ol className="text-xs text-gray-600 bg-gray-50 rounded-md px-4 py-3 space-y-1 list-decimal list-inside">
        <li>Consulta a los proveedores (pasa la solicitud a <b>En consulta</b> en Seguimiento).</li>
        <li>
          Registra cada cotización con su PDF y los datos clave: precio, plazo, forma de pago, garantía y validez (mínimo{" "}
          {MINIMO_COTIZACIONES}).
        </li>
        <li>Compara y elige el mejor proveedor indicando el motivo.</li>
        <li>Genera la orden de compra (bienes) o de servicio con los datos ya cargados.</li>
      </ol>

      {cotizaciones.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-100">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Proveedor</th>
                <th className="text-right px-3 py-2">Monto cotizado</th>
                <th className="text-right px-3 py-2">Total c/IGV</th>
                <th className="text-left px-3 py-2">Plazo</th>
                <th className="text-left px-3 py-2">Pago</th>
                <th className="text-left px-3 py-2">Garantía</th>
                <th className="text-left px-3 py-2">Validez</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cotizaciones.map((c) => {
                const esMenor = menor !== null && c.moneda === monedaBase && totalConIgv(c) === menor && cotizaciones.length > 1;
                return (
                  <tr key={c.id} className={c.elegida ? "bg-verde-claro" : ""}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">
                        {c.proveedor_nombre}
                        {c.elegida && <span className="ml-2 text-[11px] bg-verde text-white px-2 py-0.5 rounded-full">Elegido</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.ruc ? `RUC ${c.ruc}` : "Sin RUC"}
                        {!c.proveedor_id && " · no registrado"}
                      </p>
                      {c.observaciones && <p className="text-xs text-gray-500 mt-0.5">{c.observaciones}</p>}
                      {c.archivo_path && (
                        <button type="button" onClick={() => verArchivo(c.archivo_path!)} className="block text-left text-xs text-verde hover:underline mt-0.5">
                          Ver cotización ({c.archivo_nombre || "archivo"})
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                      {simbolo(c.moneda)} {money(Number(c.monto))}
                      <p className="text-[11px] text-gray-400">{c.incluye_igv ? "incluye IGV" : "+ IGV"}</p>
                    </td>
                    <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                      <span className={esMenor ? "font-semibold text-verde" : ""}>
                        {simbolo(c.moneda)} {money(totalConIgv(c))}
                      </span>
                      {esMenor && <p className="text-[11px] text-verde">Menor precio</p>}
                    </td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.plazo_entrega || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.forma_pago || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.garantia || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.validez || "—"}</td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                      {!bloqueado && !c.elegida && (
                        <button type="button" onClick={() => abrirElegir(c)} className="text-xs text-verde hover:underline block ml-auto">
                          Elegir
                        </button>
                      )}
                      {!bloqueado && (
                        <button type="button" onClick={() => eliminar(c)} className="text-xs text-red-500 hover:underline block ml-auto mt-1">
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {faltan > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Llevas {cotizaciones.length} de {MINIMO_COTIZACIONES} cotizaciones. Puedes elegir con menos, pero tendrás que
              justificar la excepción (proveedor único, urgencia, etc.).
            </p>
          )}
          {cotizaciones.some((c) => c.moneda !== monedaBase) && (
            <p className="text-xs text-gray-400 mt-1">El menor precio se calcula solo entre cotizaciones en la misma moneda.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Aún no se registran cotizaciones de proveedores.</p>
      )}

      {eligiendo && (
        <div className="border border-verde rounded-md p-4 space-y-2 bg-verde-claro/40">
          <p className="text-sm font-medium">
            Elegir a {cotizaciones.find((c) => c.id === eligiendo)?.proveedor_nombre}
          </p>
          <input
            value={justif}
            onChange={(e) => setJustif(e.target.value)}
            placeholder="¿Por qué es el mejor? Ej: menor precio, mejor plazo, garantía..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {faltan > 0 && (
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={`Motivo por el que hay menos de ${MINIMO_COTIZACIONES} cotizaciones`}
              className="w-full border border-amber-300 rounded-md px-3 py-2 text-sm"
            />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={confirmarElegir} className="bg-verde text-white text-sm px-4 py-1.5 rounded-md hover:bg-verde-oscuro">
              Confirmar elección
            </button>
            <button type="button" onClick={() => setEligiendo(null)} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="border border-gray-200 rounded-md p-4 space-y-3">
          <p className="text-sm font-medium">Nueva cotización</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
              <select
                value={f.proveedorId}
                onChange={(e) => set("proveedorId", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Otro (aún no registrado)...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razon_social} — {p.ruc}
                  </option>
                ))}
              </select>
            </div>
            {!f.proveedorId ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">RUC (opcional)</label>
                <input value={f.ruc} onChange={(e) => set("ruc", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            ) : (
              <div />
            )}
            {!f.proveedorId && (
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Nombre del proveedor</label>
                <input
                  value={f.proveedorNombre}
                  onChange={(e) => set("proveedorNombre", e.target.value)}
                  placeholder="Razón social"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Si lo eliges como ganador, regístralo en Proveedores antes de emitir la orden.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moneda</label>
              <select value={f.moneda} onChange={(e) => set("moneda", e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="SOLES">Soles</option>
                <option value="DOLARES">Dólares</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto total cotizado</label>
              <input
                type="number"
                step="0.01"
                value={f.monto}
                onChange={(e) => set("monto", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pt-5">
              <input type="checkbox" checked={f.incluyeIgv} onChange={(e) => set("incluyeIgv", e.target.checked)} />
              El monto incluye IGV
            </label>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plazo de entrega</label>
              <input value={f.plazo} onChange={(e) => set("plazo", e.target.value)} placeholder="Ej: 5 días hábiles" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
              <input value={f.formaPago} onChange={(e) => set("formaPago", e.target.value)} placeholder="Ej: crédito 30 días" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Garantía</label>
              <input value={f.garantia} onChange={(e) => set("garantia", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Validez de la oferta</label>
              <input value={f.validez} onChange={(e) => set("validez", e.target.value)} placeholder="Ej: 15 días" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
              <input value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Marca, stock, condiciones..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Archivo de la cotización (PDF o imagen)</label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-verde text-white text-sm px-4 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar cotización"}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {elegida && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-sm">
            <b>Proveedor elegido:</b> {elegida.proveedor_nombre} — {simbolo(elegida.moneda)} {money(totalConIgv(elegida))} c/IGV
          </p>
          {justificacion && <p className="text-xs text-gray-600">Motivo: {justificacion}</p>}
          {motivoExcepcion && <p className="text-xs text-amber-700">Excepción (menos de {MINIMO_COTIZACIONES} cotizaciones): {motivoExcepcion}</p>}
          {ordenes.length > 0 && (
            <ul className="text-sm space-y-0.5">
              {ordenes.map((o) => (
                <li key={o.id} className={o.anulada ? "text-gray-400 line-through" : ""}>
                  Se emitió la {TIPO_ORDEN_LABEL[o.tipo || "COMPRA"]?.toLowerCase()} N° {o.numero}
                  {o.proveedor ? ` a ${o.proveedor}` : ""}.{" "}
                  <Link href={`/ordenes/${o.id}`} className="text-verde hover:underline">
                    Ver orden
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hayPendientes && estado !== "anulada" && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!elegida.proveedor_id && (
                <p className="text-xs text-amber-700 w-full">
                  Este proveedor no está registrado: regístralo en{" "}
                  <Link href="/proveedores/nuevo" className="underline">
                    Proveedores
                  </Link>{" "}
                  y luego elígelo en la orden.
                </p>
              )}
              <p className="text-xs text-gray-500 w-full">
                {ordenes.length > 0
                  ? "Aún hay ítems pendientes. Para pedir solo algunos a este u otro proveedor, márcalos en la lista de productos."
                  : "La orden incluirá todos los ítems pendientes. Para pedir solo algunos, márcalos en la lista de productos."}
              </p>
              <Link
                href={`/ordenes/nueva?solicitud=${solicitudId}&tipo=COMPRA`}
                className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro"
              >
                {ordenes.length > 0 ? "Orden de compra con lo pendiente" : "Generar orden de compra"}
              </Link>
              <Link
                href={`/ordenes/nueva?solicitud=${solicitudId}&tipo=SERVICIO`}
                className="border border-verde text-verde text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-claro"
              >
                {ordenes.length > 0 ? "Orden de servicio con lo pendiente" : "Generar orden de servicio"}
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
