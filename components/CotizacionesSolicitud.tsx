"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MINIMO_COTIZACIONES, TIPO_ORDEN_LABEL, fmtCant } from "@/lib/solicitudes";

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

/** Ítem cotizado por un proveedor (precio unitario en la moneda de la cotización, con o sin IGV según la cotización). */
export interface CotizacionItem {
  id: string;
  cotizacion_id: string;
  item_id: string;
  cantidad: number | null;
  precio_unitario: number | null;
  elegido: boolean;
  justificacion: string | null;
  motivo_excepcion: string | null;
}

export interface ItemParaCotizar {
  id: string;
  posicion: number;
  descripcion: string;
  cantidad: number;
  um: string | null;
  pendiente: number;
}

interface ProveedorOpcion {
  id: string;
  razon_social: string;
  ruc: string;
}

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const simbolo = (m: string) => (m === "DOLARES" ? "US$" : "S/");
const totalConIgv = (c: Cotizacion) => (c.incluye_igv ? Number(c.monto) : Math.round(Number(c.monto) * 1.18 * 100) / 100);
/** precio unitario sin IGV (para comparar y para la OC) */
const puSinIgv = (c: Cotizacion, ci: CotizacionItem) =>
  ci.precio_unitario === null || ci.precio_unitario === undefined
    ? null
    : c.incluye_igv
    ? Math.round((Number(ci.precio_unitario) / 1.18) * 10000) / 10000
    : Number(ci.precio_unitario);

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

type FilaForm = { marcado: boolean; cantidad: string; precio: string };

export default function CotizacionesSolicitud({
  solicitudId,
  estado,
  cotizaciones,
  cotItems,
  items,
  proveedores,
  ordenes,
  hayPendientes
}: {
  solicitudId: string;
  estado: string;
  cotizaciones: Cotizacion[];
  cotItems: CotizacionItem[];
  items: ItemParaCotizar[];
  proveedores: ProveedorOpcion[];
  ordenes: { id: string; numero: number | null; tipo: string | null; proveedor: string | null; anulada: boolean }[];
  hayPendientes: boolean;
}) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Cotizacion | null>(null);
  const [f, setF] = useState({ ...formVacio });
  const [filas, setFilas] = useState<Record<string, FilaForm>>({});
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [marcaEleccion, setMarcaEleccion] = useState<Record<string, boolean>>({});
  const [justif, setJustif] = useState("");
  const [motivo, setMotivo] = useState("");

  const bloqueado = !hayPendientes || estado === "anulada" || estado === "atendida";
  const itemsDe = (cotId: string) => cotItems.filter((ci) => ci.cotizacion_id === cotId);
  const conDetalle = cotizaciones.filter((c) => itemsDe(c.id).length > 0);
  const sinDetalle = cotizaciones.filter((c) => itemsDe(c.id).length === 0);
  const itemPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  // cuántas cotizaciones tiene cada ítem y cuál es el menor precio (sin IGV) por ítem, en la moneda más usada del ítem
  const analisis = useMemo(() => {
    const r: Record<string, { n: number; menor: number | null; moneda: string | null; elegida: string | null }> = {};
    for (const it of items) {
      const cis = cotItems.filter((ci) => ci.item_id === it.id);
      const precios = cis
        .map((ci) => {
          const c = cotizaciones.find((x) => x.id === ci.cotizacion_id);
          return c ? { moneda: c.moneda, pu: puSinIgv(c, ci) } : null;
        })
        .filter((x): x is { moneda: "SOLES" | "DOLARES"; pu: number | null } => !!x && x.pu !== null);
      const nSol = precios.filter((p) => p.moneda === "SOLES").length;
      const nUsd = precios.filter((p) => p.moneda === "DOLARES").length;
      const moneda = precios.length ? (nUsd > nSol ? "DOLARES" : "SOLES") : null;
      const comparables = precios.filter((p) => p.moneda === moneda).map((p) => p.pu as number);
      r[it.id] = {
        n: cis.length,
        menor: comparables.length > 1 ? Math.min(...comparables) : null,
        moneda,
        elegida: cis.find((ci) => ci.elegido)?.cotizacion_id || null
      };
    }
    return r;
  }, [items, cotItems, cotizaciones]);

  function set<K extends keyof typeof formVacio>(k: K, v: (typeof formVacio)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function abrirNueva() {
    setEditando(null);
    setF({ ...formVacio });
    setArchivo(null);
    // por defecto: todos los ítems con saldo pendiente, con su cantidad pendiente
    setFilas(
      Object.fromEntries(
        items.map((it) => [it.id, { marcado: it.pendiente > 0, cantidad: fmtCant(it.pendiente > 0 ? it.pendiente : it.cantidad), precio: "" }])
      )
    );
    setError(null);
    setMostrarForm(true);
  }

  function abrirEditar(c: Cotizacion) {
    setEditando(c);
    setF({
      proveedorId: c.proveedor_id || "",
      proveedorNombre: c.proveedor_id ? "" : c.proveedor_nombre,
      ruc: c.proveedor_id ? "" : c.ruc || "",
      moneda: c.moneda,
      monto: String(c.monto ?? ""),
      incluyeIgv: c.incluye_igv,
      plazo: c.plazo_entrega || "",
      formaPago: c.forma_pago || "",
      garantia: c.garantia || "",
      validez: c.validez || "",
      observaciones: c.observaciones || ""
    });
    const mias = itemsDe(c.id);
    setFilas(
      Object.fromEntries(
        items.map((it) => {
          const ci = mias.find((x) => x.item_id === it.id);
          return [
            it.id,
            ci
              ? { marcado: true, cantidad: fmtCant(Number(ci.cantidad ?? it.cantidad)), precio: ci.precio_unitario === null ? "" : String(ci.precio_unitario) }
              : { marcado: false, cantidad: fmtCant(it.pendiente > 0 ? it.pendiente : it.cantidad), precio: "" }
          ];
        })
      )
    );
    setArchivo(null);
    setError(null);
    setMostrarForm(true);
  }

  const marcados = items.filter((it) => filas[it.id]?.marcado);
  const conPrecio = marcados.filter((it) => filas[it.id].precio !== "" && Number(filas[it.id].precio) >= 0);
  const totalCalculado = conPrecio.reduce((a, it) => a + Number(filas[it.id].cantidad || 0) * Number(filas[it.id].precio || 0), 0);
  const usaTotalCalculado = marcados.length > 0 && conPrecio.length === marcados.length;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const prov = proveedores.find((p) => p.id === f.proveedorId);
    const nombre = prov ? prov.razon_social : f.proveedorNombre.trim();
    if (!nombre) return setError("Elige el proveedor o escribe su nombre");
    if (items.length > 0 && marcados.length === 0) return setError("Marca los ítems que cotizó este proveedor");
    if (marcados.some((it) => !(Number(filas[it.id].cantidad) > 0))) return setError("Revisa las cantidades de los ítems marcados");
    const monto = usaTotalCalculado ? Math.round(totalCalculado * 100) / 100 : Number(f.monto);
    if (!monto || monto <= 0) return setError("Ingresa el precio unitario de cada ítem o el monto total cotizado");

    setGuardando(true);
    const supabase = createClient();
    try {
      let archivoPath: string | null = editando?.archivo_path || null;
      let archivoNombre: string | null = editando?.archivo_nombre || null;
      if (archivo) {
        const seguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        archivoPath = `cotizaciones/${solicitudId}/${crypto.randomUUID()}-${seguro}`;
        archivoNombre = archivo.name;
        const { error: errUp } = await supabase.storage.from("documentos-oc").upload(archivoPath, archivo, { upsert: false });
        if (errUp) throw new Error(`No se pudo subir el archivo: ${errUp.message}`);
      }
      const datos = {
        solicitud_id: solicitudId,
        proveedor_id: prov ? prov.id : null,
        proveedor_nombre: nombre,
        ruc: prov ? prov.ruc : f.ruc.trim() || null,
        moneda: f.moneda,
        monto,
        incluye_igv: f.incluyeIgv,
        plazo_entrega: f.plazo.trim() || null,
        forma_pago: f.formaPago.trim() || null,
        garantia: f.garantia.trim() || null,
        validez: f.validez.trim() || null,
        observaciones: f.observaciones.trim() || null,
        archivo_path: archivoPath,
        archivo_nombre: archivoNombre
      };
      let cotId = editando?.id || "";
      if (editando) {
        const { error: errUpd } = await supabase.from("solicitud_cotizaciones").update(datos).eq("id", editando.id);
        if (errUpd) throw new Error(errUpd.message);
        if (archivo && editando.archivo_path) await supabase.storage.from("documentos-oc").remove([editando.archivo_path]);
      } else {
        const { data: nueva, error: errIns } = await supabase.from("solicitud_cotizaciones").insert(datos).select("id").single();
        if (errIns || !nueva) throw new Error(errIns?.message || "No se pudo guardar la cotización");
        cotId = nueva.id;
      }

      // ítems cotizados: se actualizan los existentes (conservan la elección), se agregan y se quitan
      const anteriores = itemsDe(cotId);
      const quitar = anteriores.filter((ci) => !filas[ci.item_id]?.marcado).map((ci) => ci.id);
      if (quitar.length) {
        const { error: errDel } = await supabase.from("solicitud_cotizacion_items").delete().in("id", quitar);
        if (errDel) throw new Error(errDel.message);
      }
      const filasItems = marcados.map((it) => ({
        cotizacion_id: cotId,
        solicitud_id: solicitudId,
        item_id: it.id,
        cantidad: Number(filas[it.id].cantidad),
        precio_unitario: filas[it.id].precio === "" ? null : Number(filas[it.id].precio)
      }));
      if (filasItems.length) {
        const { error: errIt } = await supabase
          .from("solicitud_cotizacion_items")
          .upsert(filasItems, { onConflict: "cotizacion_id,item_id" });
        if (errIt) throw new Error(errIt.message);
      }

      if (!editando && (estado === "pendiente" || estado === "en_consulta" || estado === "observada")) {
        await supabase.rpc("registrar_seguimiento", {
          p_solicitud: solicitudId,
          p_estado: "en_cotizacion",
          p_comentario: `Se recibió cotización de ${nombre}`
        });
      }
      setF({ ...formVacio });
      setArchivo(null);
      setMostrarForm(false);
      setEditando(null);
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
    const mias = itemsDe(c.id);
    // por defecto: ítems con saldo donde este proveedor es el más barato (o el único)
    const marca: Record<string, boolean> = {};
    let todosMenor = mias.length > 0;
    for (const ci of mias) {
      const a = analisis[ci.item_id];
      const pu = puSinIgv(c, ci);
      const esMenor = a && pu !== null && (a.menor === null ? a.n === 1 : c.moneda === a.moneda && pu <= a.menor + 0.00001);
      if (!esMenor) todosMenor = false;
      marca[ci.item_id] = (itemPorId[ci.item_id]?.pendiente ?? 0) > 0 && (!!esMenor || mias.length === 1);
    }
    if (!Object.values(marca).some(Boolean)) mias.forEach((ci) => (marca[ci.item_id] = (itemPorId[ci.item_id]?.pendiente ?? 0) > 0));
    setMarcaEleccion(marca);
    setJustif(todosMenor ? "Menor precio" : "");
    setMotivo("");
    setError(null);
  }

  const cotEligiendo = cotizaciones.find((c) => c.id === eligiendo) || null;
  const eligiendoConDetalle = cotEligiendo ? itemsDe(cotEligiendo.id).length > 0 : false;
  const itemsEleccion = Object.entries(marcaEleccion).filter(([, v]) => v).map(([k]) => k);
  const faltanEnEleccion = eligiendoConDetalle
    ? itemsEleccion.filter((iid) => (analisis[iid]?.n ?? 0) < MINIMO_COTIZACIONES)
    : cotizaciones.length < MINIMO_COTIZACIONES
    ? ["x"]
    : [];

  async function confirmarElegir() {
    if (!cotEligiendo) return;
    setError(null);
    if (!justif.trim()) return setError("Indica por qué eliges este proveedor");
    if (faltanEnEleccion.length > 0 && !motivo.trim()) return setError(`Hay menos de ${MINIMO_COTIZACIONES} cotizaciones: indica el motivo`);
    const supabase = createClient();
    const { error: err } = eligiendoConDetalle
      ? await supabase.rpc("elegir_cotizacion_items", {
          p_cotizacion: cotEligiendo.id,
          p_items: itemsEleccion,
          p_justificacion: justif.trim(),
          p_motivo_excepcion: motivo.trim() || null
        })
      : await supabase.rpc("elegir_cotizacion", {
          p_cotizacion: cotEligiendo.id,
          p_justificacion: justif.trim(),
          p_motivo_excepcion: motivo.trim() || null
        });
    if (err) return setError(err.message);
    setEligiendo(null);
    router.refresh();
  }

  async function quitarEleccion(c: Cotizacion) {
    const supabase = createClient();
    const { error: err } = await supabase.rpc("quitar_eleccion_items", { p_cotizacion: c.id, p_items: null });
    if (err) return setError(err.message);
    router.refresh();
  }

  // proveedores elegidos (con los ítems que se les asignaron)
  const elegidas = cotizaciones
    .filter((c) => c.elegida)
    .map((c) => {
      const mias = itemsDe(c.id).filter((ci) => ci.elegido);
      const conSaldo = mias.filter((ci) => (itemPorId[ci.item_id]?.pendiente ?? 0) > 0);
      return { c, mias, conSaldo, detalle: itemsDe(c.id).length > 0 };
    });

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-verde">Cuadro comparativo de cotizaciones</h2>
          <p className="text-xs text-gray-500">Solo visible para el área de compras.</p>
        </div>
        {!bloqueado && !mostrarForm && (
          <button type="button" onClick={abrirNueva} className="text-sm border border-verde text-verde px-3 py-1.5 rounded-md hover:bg-verde-claro">
            + Registrar cotización
          </button>
        )}
      </div>

      <ol className="text-xs text-gray-600 bg-gray-50 rounded-md px-4 py-3 space-y-1 list-decimal list-inside">
        <li>Consulta a los proveedores (pasa la solicitud a <b>En consulta</b> en Seguimiento).</li>
        <li>
          Registra cada cotización marcando <b>qué ítems cotizó y su precio unitario</b>, con su PDF, plazo, pago, garantía y validez
          (mínimo {MINIMO_COTIZACIONES} por ítem).
        </li>
        <li>Compara ítem por ítem y elige el mejor proveedor para cada ítem, indicando el motivo.</li>
        <li>Genera la orden de compra o de servicio de cada proveedor elegido: sale con sus ítems y precios cargados.</li>
      </ol>

      {/* ---------------- comparativo por ítem ---------------- */}
      {conDetalle.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs font-semibold text-gray-600 mb-1">Comparativo por ítem (precio unitario sin IGV)</p>
          <table className="w-full text-sm border border-gray-100">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 uppercase">Ítem</th>
                {conDetalle.map((c) => (
                  <th key={c.id} className="text-right px-3 py-2 min-w-[8rem]">
                    <span className="block font-semibold text-gray-700 normal-case">{c.proveedor_nombre}</span>
                    <span className="font-normal">{simbolo(c.moneda)}</span>
                  </th>
                ))}
                <th className="text-center px-3 py-2 uppercase">Cotiz.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => {
                const a = analisis[it.id];
                return (
                  <tr key={it.id} className={it.pendiente <= 0 ? "text-gray-400" : ""}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">
                        {it.posicion}. {it.descripcion}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtCant(it.cantidad)} {it.um}
                        {it.pendiente <= 0 ? " · ya atendido" : it.pendiente < it.cantidad ? ` · pendiente ${fmtCant(it.pendiente)}` : ""}
                      </p>
                    </td>
                    {conDetalle.map((c) => {
                      const ci = itemsDe(c.id).find((x) => x.item_id === it.id);
                      if (!ci) return <td key={c.id} className="px-3 py-2 text-right text-gray-300 align-top">no cotizó</td>;
                      const pu = puSinIgv(c, ci);
                      const esMenor = pu !== null && a?.menor !== null && a?.moneda === c.moneda && pu <= (a?.menor ?? 0) + 0.00001;
                      return (
                        <td key={c.id} className={`px-3 py-2 text-right align-top whitespace-nowrap ${ci.elegido ? "bg-verde-claro" : ""}`}>
                          {pu === null ? (
                            <span className="text-xs text-gray-400">sin precio</span>
                          ) : (
                            <span className={esMenor ? "font-semibold text-verde" : ""}>{money(pu)}</span>
                          )}
                          {pu !== null && ci.cantidad ? (
                            <p className="text-[11px] text-gray-400">
                              × {fmtCant(Number(ci.cantidad))} = {money(pu * Number(ci.cantidad))}
                            </p>
                          ) : null}
                          {esMenor && <p className="text-[11px] text-verde">menor</p>}
                          {ci.elegido && <p className="text-[11px] font-medium text-verde-oscuro">✓ elegido</p>}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2 text-center align-top text-xs ${(a?.n ?? 0) < MINIMO_COTIZACIONES ? "text-amber-700" : "text-verde"}`}>
                      {a?.n ?? 0}/{MINIMO_COTIZACIONES}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 mt-1">
            Si el proveedor cotizó con IGV incluido, el precio se muestra sin IGV para comparar. El menor se resalta entre precios de la
            misma moneda.
          </p>
        </div>
      )}

      {/* ---------------- resumen por proveedor ---------------- */}
      {cotizaciones.length > 0 ? (
        <div className="overflow-x-auto">
          {conDetalle.length > 0 && <p className="text-xs font-semibold text-gray-600 mb-1">Condiciones de cada proveedor</p>}
          <table className="w-full text-sm border border-gray-100">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Proveedor</th>
                <th className="text-left px-3 py-2">Ítems cotizados</th>
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
                const mias = itemsDe(c.id);
                return (
                  <tr key={c.id} className={c.elegida ? "bg-verde-claro/60" : ""}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">
                        {c.proveedor_nombre}
                        {c.elegida && <span className="ml-2 text-[11px] bg-verde text-white px-2 py-0.5 rounded-full">Elegido</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.ruc ? `RUC ${c.ruc}` : "Sin RUC"}
                        {!c.proveedor_id && " · no registrado"}
                      </p>
                      {c.observaciones && <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{c.observaciones}</p>}
                      {c.archivo_path && (
                        <button type="button" onClick={() => verArchivo(c.archivo_path!)} className="block text-left text-xs text-verde hover:underline mt-0.5">
                          Ver cotización ({c.archivo_nombre || "archivo"})
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-600">
                      {mias.length === 0 ? (
                        <span className="text-amber-700">
                          Sin detalle de ítems{!bloqueado && " — usa Editar para marcar qué ítems cotizó"}
                        </span>
                      ) : (
                        mias
                          .map((ci) => itemPorId[ci.item_id])
                          .filter(Boolean)
                          .sort((x, y) => x.posicion - y.posicion)
                          .map((x) => x.posicion)
                          .join(", ")
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                      {simbolo(c.moneda)} {money(totalConIgv(c))}
                      <p className="text-[11px] text-gray-400">{c.incluye_igv ? "cotizó con IGV" : "cotizó + IGV"}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.plazo_entrega || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.forma_pago || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.garantia || "—"}</td>
                    <td className="px-3 py-2 align-top text-gray-600">{c.validez || "—"}</td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                      {!bloqueado && (mias.length > 0 || !c.elegida) && (
                        <button type="button" onClick={() => abrirElegir(c)} className="text-xs text-verde hover:underline block ml-auto">
                          {mias.length > 0 ? "Elegir para ítems..." : "Elegir"}
                        </button>
                      )}
                      {!bloqueado && (
                        <button type="button" onClick={() => abrirEditar(c)} className="text-xs text-gray-600 hover:underline block ml-auto mt-1">
                          Editar
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
          {sinDetalle.length > 0 && conDetalle.length > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Las cotizaciones sin detalle de ítems no entran al comparativo por ítem. Edítalas para marcar qué ítems cotizaron.
            </p>
          )}
          {conDetalle.length === 0 && cotizaciones.length < MINIMO_COTIZACIONES && (
            <p className="text-xs text-amber-700 mt-2">
              Llevas {cotizaciones.length} de {MINIMO_COTIZACIONES} cotizaciones. Puedes elegir con menos, pero tendrás que justificar la
              excepción (proveedor único, urgencia, etc.).
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Aún no se registran cotizaciones de proveedores.</p>
      )}

      {/* ---------------- elegir ---------------- */}
      {cotEligiendo && (
        <div className="border border-verde rounded-md p-4 space-y-2 bg-verde-claro/40">
          <p className="text-sm font-medium">Elegir a {cotEligiendo.proveedor_nombre}</p>
          {eligiendoConDetalle ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-600">¿Para qué ítems? (cada ítem queda con un solo proveedor elegido)</p>
              {itemsDe(cotEligiendo.id)
                .map((ci) => ({ ci, it: itemPorId[ci.item_id] }))
                .filter((x) => x.it)
                .sort((x, y) => x.it.posicion - y.it.posicion)
                .map(({ ci, it }) => {
                  const a = analisis[it.id];
                  const otro = a?.elegida && a.elegida !== cotEligiendo.id ? cotizaciones.find((c) => c.id === a.elegida) : null;
                  const pu = puSinIgv(cotEligiendo, ci);
                  return (
                    <label key={ci.id} className={`flex items-start gap-2 text-sm ${it.pendiente <= 0 ? "text-gray-400" : ""}`}>
                      <input
                        type="checkbox"
                        className="mt-1 accent-verde"
                        checked={!!marcaEleccion[it.id]}
                        disabled={it.pendiente <= 0}
                        onChange={(e) => setMarcaEleccion((m) => ({ ...m, [it.id]: e.target.checked }))}
                      />
                      <span>
                        {it.posicion}. {it.descripcion}
                        <span className="text-xs text-gray-500">
                          {pu !== null ? ` · ${simbolo(cotEligiendo.moneda)} ${money(pu)} c/u sin IGV` : ""}
                          {` · ${a?.n ?? 0} cotización(es)`}
                          {it.pendiente <= 0 ? " · ya atendido" : ""}
                          {otro ? ` · hoy elegido: ${otro.proveedor_nombre}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-gray-600">Esta cotización no tiene detalle de ítems: se elige para toda la solicitud.</p>
          )}
          <input
            value={justif}
            onChange={(e) => setJustif(e.target.value)}
            placeholder="¿Por qué es el mejor? Ej: menor precio, mejor plazo, garantía..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {faltanEnEleccion.length > 0 && (
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={`Motivo por el que hay menos de ${MINIMO_COTIZACIONES} cotizaciones (proveedor único, urgencia...)`}
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

      {/* ---------------- formulario ---------------- */}
      {mostrarForm && (
        <form onSubmit={guardar} className="border border-gray-200 rounded-md p-4 space-y-3">
          <p className="text-sm font-medium">{editando ? `Editar cotización de ${editando.proveedor_nombre}` : "Nueva cotización"}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
              <select value={f.proveedorId} onChange={(e) => set("proveedorId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
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
                <p className="text-[11px] text-gray-400 mt-0.5">Si lo eliges como ganador, regístralo en Proveedores antes de emitir la orden.</p>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moneda</label>
              <select value={f.moneda} onChange={(e) => set("moneda", e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="SOLES">Soles</option>
                <option value="DOLARES">Dólares</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pt-5 col-span-2">
              <input type="checkbox" checked={f.incluyeIgv} onChange={(e) => set("incluyeIgv", e.target.checked)} />
              Los precios de la cotización incluyen IGV
            </label>
          </div>

          {items.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Ítems que cotizó este proveedor y su precio unitario</p>
              <table className="w-full text-sm border border-gray-100">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-2 py-1.5 w-8"></th>
                    <th className="text-left px-2 py-1.5">Ítem</th>
                    <th className="text-right px-2 py-1.5 w-24">Cantidad</th>
                    <th className="text-right px-2 py-1.5 w-32">P. unitario ({simbolo(f.moneda)})</th>
                    <th className="text-right px-2 py-1.5 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it) => {
                    const fl = filas[it.id] || { marcado: false, cantidad: fmtCant(it.cantidad), precio: "" };
                    const setFl = (p: Partial<FilaForm>) => setFilas((prev) => ({ ...prev, [it.id]: { ...fl, ...p } }));
                    const sub = Number(fl.cantidad || 0) * Number(fl.precio || 0);
                    return (
                      <tr key={it.id} className={fl.marcado ? "" : "text-gray-400"}>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" className="accent-verde" checked={fl.marcado} onChange={(e) => setFl({ marcado: e.target.checked })} />
                        </td>
                        <td className="px-2 py-1.5">
                          {it.posicion}. {it.descripcion}
                          <span className="text-xs text-gray-400">
                            {" "}
                            ({fmtCant(it.cantidad)} {it.um}
                            {it.pendiente <= 0 ? ", ya atendido" : it.pendiente < it.cantidad ? `, pendiente ${fmtCant(it.pendiente)}` : ""})
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="any"
                            disabled={!fl.marcado}
                            value={fl.cantidad}
                            onChange={(e) => setFl({ cantidad: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-right disabled:bg-gray-50"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="any"
                            disabled={!fl.marcado}
                            value={fl.precio}
                            onChange={(e) => setFl({ precio: e.target.value })}
                            placeholder="0.00"
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-right disabled:bg-gray-50"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-600 whitespace-nowrap">{fl.marcado && fl.precio !== "" ? money(sub) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto total cotizado</label>
              {usaTotalCalculado ? (
                <p className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm">
                  {simbolo(f.moneda)} {money(totalCalculado)} <span className="text-xs text-gray-400">(suma de ítems)</span>
                </p>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={f.monto}
                  onChange={(e) => set("monto", e.target.value)}
                  placeholder="Si no pones precios por ítem"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              )}
            </div>
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Archivo de la cotización {editando?.archivo_nombre ? "(ya tiene uno; sube otro solo para cambiarlo)" : "(PDF o imagen)"}
              </label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="text-sm" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
              <input value={f.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Marca, stock, condiciones..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-verde text-white text-sm px-4 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Guardar cotización"}
            </button>
            <button type="button" onClick={() => { setMostrarForm(false); setEditando(null); }} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ---------------- proveedores elegidos y órdenes ---------------- */}
      {(elegidas.length > 0 || ordenes.length > 0) && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {elegidas.map(({ c, mias, conSaldo, detalle }) => (
            <div key={c.id} className="text-sm">
              <p>
                <b>Proveedor elegido:</b> {c.proveedor_nombre}
                {detalle ? (
                  <span className="text-gray-600">
                    {" "}
                    para ítems{" "}
                    {mias
                      .map((ci) => itemPorId[ci.item_id]?.posicion)
                      .filter(Boolean)
                      .sort((x, y) => (x as number) - (y as number))
                      .join(", ")}
                  </span>
                ) : (
                  <span className="text-gray-600">
                    {" "}
                    — {simbolo(c.moneda)} {money(totalConIgv(c))} c/IGV
                  </span>
                )}
                {!bloqueado && detalle && (
                  <button type="button" onClick={() => quitarEleccion(c)} className="ml-2 text-xs text-gray-400 hover:text-red-600 hover:underline">
                    quitar elección
                  </button>
                )}
              </p>
              {mias[0]?.justificacion && <p className="text-xs text-gray-600">Motivo: {mias[0].justificacion}</p>}
              {mias.find((ci) => ci.motivo_excepcion) && (
                <p className="text-xs text-amber-700">
                  Excepción (menos de {MINIMO_COTIZACIONES} cotizaciones): {mias.find((ci) => ci.motivo_excepcion)?.motivo_excepcion}
                </p>
              )}
              {estado !== "anulada" && (detalle ? conSaldo.length > 0 : hayPendientes) && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {!c.proveedor_id && (
                    <p className="text-xs text-amber-700 w-full">
                      Este proveedor no está registrado: regístralo en{" "}
                      <Link href="/proveedores/nuevo" className="underline">
                        Proveedores
                      </Link>{" "}
                      y luego elígelo en la orden.
                    </p>
                  )}
                  <Link
                    href={`/ordenes/nueva?solicitud=${solicitudId}&tipo=COMPRA&cotizacion=${c.id}`}
                    className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro"
                  >
                    Orden de compra a {c.proveedor_nombre}
                  </Link>
                  <Link
                    href={`/ordenes/nueva?solicitud=${solicitudId}&tipo=SERVICIO&cotizacion=${c.id}`}
                    className="border border-verde text-verde text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-claro"
                  >
                    Orden de servicio
                  </Link>
                </div>
              )}
            </div>
          ))}
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
        </div>
      )}
    </section>
  );
}
