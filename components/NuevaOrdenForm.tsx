"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelectorOT, { etiquetaOT } from "@/components/SelectorOT";

interface ProveedorOpcion {
  id: string;
  razon_social: string;
  ruc: string;
}

interface ItemForm {
  cantidad: string;
  um: string;
  codigo: string;
  descripcion: string;
  entrega: string;
  valor_unitario: string;
  /** precio unitario con IGV (solo en pantalla; se guarda el valor sin IGV) */
  precio_con_igv?: string;
  /** ítem de la solicitud de pedido del que viene (para el seguimiento por ítem) */
  solicitud_item_id?: string;
}

interface InicialOrden {
  tipo?: "COMPRA" | "SERVICIO";
  proveedor_id: string;
  fecha_emision: string;
  moneda: "SOLES" | "DOLARES";
  forma_pago: string;
  lugar_entrega: string;
  origen: string;
  destino: string;
  fecha_entrega: string;
  centro_costos: string;
  doc_relacionado: string;
  comprador: string;
  garantia: string;
  penalidad: string;
  condiciones_especiales: string;
  observaciones: string;
  incluir_anticorrupcion: boolean;
  descuento: string;
  items?: ItemForm[];
  proyecto_id?: string | null;
  proyecto_etiqueta?: string;
}

interface ResultadoBusqueda {
  id: string;
  numero: number;
  fecha_emision: string;
  proveedores?: { razon_social: string; ruc: string } | null;
}

const itemVacio: ItemForm = { cantidad: "1", um: "UND", codigo: "", descripcion: "", entrega: "", valor_unitario: "", precio_con_igv: "" };

const IGV = 0.18;
export const ABASTECIMIENTO_GENERAL = "ABASTECIMIENTO GENERAL";
const r2 = (n: number) => Math.round(n * 100) / 100;
/** número → texto sin ceros sobrantes (máx. `dec` decimales) */
const txt = (n: number, dec: number) => (Number.isFinite(n) ? String(Number(n.toFixed(dec))) : "");
const conIgvDe = (vu: string) => (vu === "" || isNaN(Number(vu)) ? "" : txt(Number(vu) * (1 + IGV), 2));
const sinIgvDe = (pu: string) => (pu === "" || isNaN(Number(pu)) ? "" : txt(Number(pu) / (1 + IGV), 6));
const conPrecios = (list: ItemForm[]) => list.map((it) => ({ ...it, precio_con_igv: it.precio_con_igv ?? conIgvDe(it.valor_unitario) }));
const fmt = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NuevaOrdenForm({
  proveedores,
  ordenId,
  inicial,
  solicitudId = null,
  tipoInicial = "COMPRA"
}: {
  proveedores: ProveedorOpcion[];
  ordenId?: string;
  inicial?: InicialOrden;
  solicitudId?: string | null;
  tipoInicial?: "COMPRA" | "SERVICIO";
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"COMPRA" | "SERVICIO">(inicial?.tipo || tipoInicial);
  const [proveedorId, setProveedorId] = useState(inicial?.proveedor_id || "");
  const [fechaEmision, setFechaEmision] = useState(inicial?.fecha_emision || new Date().toISOString().slice(0, 10));
  const [moneda, setMoneda] = useState<"SOLES" | "DOLARES">(inicial?.moneda || "SOLES");
  const [formaPago, setFormaPago] = useState(inicial?.forma_pago || "");
  const [lugarEntrega, setLugarEntrega] = useState(inicial?.lugar_entrega || "");
  const [origen, setOrigen] = useState(inicial?.origen || "");
  const [destino, setDestino] = useState(inicial?.destino || "");
  const [fechaEntrega, setFechaEntrega] = useState(inicial?.fecha_entrega || "");
  const [centroCostos, setCentroCostos] = useState(inicial?.centro_costos || "");
  const [docRelacionado, setDocRelacionado] = useState(inicial?.doc_relacionado || "");
  const [proyectoId, setProyectoId] = useState<string | null>(inicial?.proyecto_id || null);
  const [proyectoEtiqueta, setProyectoEtiqueta] = useState(inicial?.proyecto_etiqueta || "");
  const [comprador, setComprador] = useState(inicial?.comprador || "");
  const [garantia, setGarantia] = useState(inicial?.garantia || "");
  const [penalidad, setPenalidad] = useState(inicial?.penalidad || "");
  const [observaciones, setObservaciones] = useState(inicial?.observaciones || "");
  const [incluirAnticorrupcion, setIncluirAnticorrupcion] = useState(inicial?.incluir_anticorrupcion ?? true);
  const [condicionesEspeciales, setCondicionesEspeciales] = useState(inicial?.condiciones_especiales || "");
  const [descuento, setDescuento] = useState(inicial?.descuento || "");
  const [items, setItems] = useState<ItemForm[]>(conPrecios(inicial?.items && inicial.items.length > 0 ? inicial.items : [{ ...itemVacio }]));
  // destino de la compra: para una OT/proyecto o abastecimiento general (stock, almacén, uso común)
  const [destinoCompra, setDestinoCompra] = useState<"OT" | "GENERAL">(
    !inicial?.proyecto_id && (inicial?.centro_costos || "").trim().toUpperCase() === ABASTECIMIENTO_GENERAL ? "GENERAL" : "OT"
  );

  function elegirDestino(d: "OT" | "GENERAL") {
    setDestinoCompra(d);
    if (d === "GENERAL") {
      setProyectoId(null);
      setProyectoEtiqueta("");
      setCentroCostos(ABASTECIMIENTO_GENERAL);
    } else if (centroCostos.trim().toUpperCase() === ABASTECIMIENTO_GENERAL) {
      setCentroCostos("");
    }
  }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------- cargar orden anterior como plantilla
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [mensajePlantilla, setMensajePlantilla] = useState<string | null>(null);

  async function buscarOrdenes() {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setMensajePlantilla(null);
    try {
      const res = await fetch(`/api/ordenes/plantilla?q=${encodeURIComponent(busqueda.trim())}`);
      const data = await res.json();
      setResultados(data.resultados || []);
      if (!data.resultados || data.resultados.length === 0) {
        setMensajePlantilla("No se encontraron órdenes con esa búsqueda.");
      }
    } catch {
      setMensajePlantilla("No se pudo buscar. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  async function usarPlantilla(idOrdenPlantilla: string) {
    setCargandoPlantilla(true);
    setMensajePlantilla(null);
    try {
      const res = await fetch(`/api/ordenes/plantilla?id=${idOrdenPlantilla}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la orden");

      const p = data.plantilla;
      setProveedorId(p.proveedor_id || "");
      setMoneda(p.moneda || "SOLES");
      setFormaPago(p.forma_pago || "");
      setLugarEntrega(p.lugar_entrega || "");
      setOrigen(p.origen || "");
      setDestino(p.destino || "");
      setFechaEntrega(p.fecha_entrega || "");
      setCentroCostos(p.centro_costos || "");
      setDestinoCompra((p.centro_costos || "").trim().toUpperCase() === ABASTECIMIENTO_GENERAL ? "GENERAL" : "OT");
      setDocRelacionado(p.doc_relacionado || "");
      setComprador(p.comprador || "");
      setGarantia(p.garantia || "");
      setPenalidad(p.penalidad || "");
      setCondicionesEspeciales(p.condiciones_especiales || "");
      setObservaciones(p.observaciones || "");
      setIncluirAnticorrupcion(p.incluir_anticorrupcion ?? true);
      setDescuento(p.descuento || "");
      if (p.items && p.items.length > 0) setItems(conPrecios(p.items));

      setResultados([]);
      setBusqueda("");
      setMensajePlantilla(`Se cargaron los datos de la OC ${data.numero} como plantilla. Revisa y ajusta antes de emitir.`);
    } catch (err: any) {
      setMensajePlantilla(err.message || "No se pudo cargar la orden");
    } finally {
      setCargandoPlantilla(false);
    }
  }

  function actualizarItem(idx: number, campo: keyof ItemForm, valor: string) {
    setItems((prev) => {
      const copia = [...prev];
      const it = { ...copia[idx], [campo]: valor };
      // los dos precios van enlazados: se escribe uno y el otro se calcula (IGV 18 %)
      if (campo === "valor_unitario") it.precio_con_igv = conIgvDe(valor);
      if (campo === "precio_con_igv") it.valor_unitario = sinIgvDe(valor);
      copia[idx] = it;
      return copia;
    });
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...itemVacio }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // mismo cálculo que al emitir la orden (importe por ítem redondeado a 2 decimales)
  const importeDe = (it: ItemForm) => r2((Number(it.cantidad) || 0) * (Number(it.valor_unitario) || 0));
  const subtotal = r2(items.reduce((acc, it) => acc + importeDe(it), 0));
  const desc = r2(Number(descuento) || 0);
  const gravada = r2(subtotal - desc);
  const igv = r2(gravada * IGV);
  const total = r2(gravada + igv);
  const sim = moneda === "DOLARES" ? "US$" : "S/";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proveedorId) {
      setError("Selecciona un proveedor");
      return;
    }
    if (items.some((it) => !it.descripcion || !it.valor_unitario)) {
      setError("Completa la descripción y el valor unitario de todos los ítems");
      return;
    }

    setCargando(true);
    try {
      const url = ordenId ? `/api/ordenes/${ordenId}` : "/api/ordenes";
      const method = ordenId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          solicitud_id: solicitudId,
          proveedor_id: proveedorId,
          fecha_emision: fechaEmision,
          moneda,
          forma_pago: formaPago || null,
          lugar_entrega: lugarEntrega || null,
          origen: origen || null,
          destino: destino || null,
          fecha_entrega: fechaEntrega || null,
          centro_costos: centroCostos || null,
          doc_relacionado: docRelacionado || null,
          proyecto_id: proyectoId,
          comprador: comprador || null,
          garantia: garantia || null,
          penalidad: penalidad || null,
          condiciones_especiales: condicionesEspeciales
            ? condicionesEspeciales.split("\n").map((s) => s.trim()).filter(Boolean)
            : [],
          observaciones: observaciones || null,
          incluir_anticorrupcion: incluirAnticorrupcion,
          descuento: descuento ? Number(descuento) : 0,
          items: items.map((it) => ({
            cantidad: Number(it.cantidad),
            um: it.um || "UND",
            codigo: it.codigo || null,
            descripcion: it.descripcion,
            entrega: it.entrega || null,
            valor_unitario: Number(it.valor_unitario),
            solicitud_item_id: it.solicitud_item_id || null
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la orden");
      router.push(`/ordenes/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-8 max-w-4xl pb-16">
      {!ordenId && (
        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-verde">Volver a generar</h2>
          <p className="text-xs text-gray-500">
            Busca una orden anterior por proveedor, RUC o número, y úsala como plantilla: se copian el proveedor, las
            condiciones y los ítems (puedes editarlo todo antes de emitir).
          </p>
          <div className="flex gap-2">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarOrdenes();
                }
              }}
              placeholder="Ej: proveedor, RUC o N.° de orden..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={buscarOrdenes}
              disabled={buscando}
              className="border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {resultados.length > 0 && (
            <ul className="border border-gray-200 rounded-md divide-y divide-gray-100">
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => usarPlantilla(r.id)}
                    disabled={cargandoPlantilla}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  >
                    <span className="font-medium">OC {r.numero}</span> — {r.proveedores?.razon_social || "—"} (
                    {r.proveedores?.ruc || "—"}) · {r.fecha_emision}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {mensajePlantilla && <p className="text-xs text-verde">{mensajePlantilla}</p>}
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-verde">Datos generales</h2>
        <div className="flex gap-2">
          {(["COMPRA", "SERVICIO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`text-sm px-4 py-1.5 rounded-md border ${
                tipo === t ? "bg-verde text-white border-verde" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t === "COMPRA" ? "Orden de compra (bienes)" : "Orden de servicio"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social} — {p.ruc}
                </option>
              ))}
            </select>
          </div>
          <Campo label="Fecha de emisión" type="date" value={fechaEmision} onChange={setFechaEmision} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="SOLES">Soles</option>
              <option value="DOLARES">Dólares</option>
            </select>
          </div>
          <Campo label="Forma de pago" value={formaPago} onChange={setFormaPago} />
          <Campo label="Fecha requerida de entrega" value={fechaEntrega} onChange={setFechaEntrega} placeholder="dd/mm/aaaa o POR COORDINAR" />
          <Campo label="Lugar de entrega" value={lugarEntrega} onChange={setLugarEntrega} />
          <Campo label="Origen" value={origen} onChange={setOrigen} />
          <Campo label="Destino" value={destino} onChange={setDestino} />
          <Campo label="Centro de costos" value={centroCostos} onChange={setCentroCostos} />
          <Campo label="Cotización / doc. relacionado" value={docRelacionado} onChange={setDocRelacionado} />
          <Campo label="Solicitante / comprador" value={comprador} onChange={setComprador} />
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">¿A qué corresponde esta compra?</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {([
                ["OT", "Orden de trabajo / proyecto"],
                ["GENERAL", "Abastecimiento general"]
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => elegirDestino(k)}
                  className={`text-sm px-3 py-1.5 rounded-md border ${
                    destinoCompra === k ? "bg-verde-claro text-verde border-verde font-medium" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {destinoCompra === k ? "● " : "○ "}
                  {l}
                </button>
              ))}
            </div>
            {destinoCompra === "OT" ? (
              <>
                <div className="max-w-xl">
                  <SelectorOT
                    valorId={proyectoId}
                    valorEtiqueta={proyectoEtiqueta}
                    onElegir={(p) => {
                      setProyectoId(p ? p.id : null);
                      setProyectoEtiqueta(p ? etiquetaOT(p) : "");
                      if (p?.numero_orden_trabajo && !centroCostos.trim()) setCentroCostos(p.numero_orden_trabajo);
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {proyectoId
                    ? `Enlazada a: ${proyectoEtiqueta}`
                    : "Elige la OT o proyecto (PI) a la que corresponde esta compra; si el centro de costos está vacío se llena con su N°."}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Compra para stock, almacén o uso común de la empresa (no se carga a ninguna OT). El centro de costos queda como{" "}
                <span className="font-medium">{ABASTECIMIENTO_GENERAL}</span> y así sale en la orden.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-verde">Ítems del pedido</h2>
          <button type="button" onClick={agregarItem} className="text-xs text-verde hover:underline">
            + Agregar ítem
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-3">
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Descripción
                  {it.solicitud_item_id && <span className="ml-1 text-[10px] text-verde">(de la solicitud)</span>}
                </label>
                <input value={it.descripcion} onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Cant.</label>
                <input type="number" step="any" value={it.cantidad} onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">U.M.</label>
                <input value={it.um} onChange={(e) => actualizarItem(idx, "um", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Código</label>
                <input value={it.codigo} onChange={(e) => actualizarItem(idx, "codigo", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Entrega</label>
                <input value={it.entrega} onChange={(e) => actualizarItem(idx, "entrega", e.target.value)} placeholder="opc." className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1" title="Precio unitario incluido IGV. Al escribirlo se calcula el valor sin IGV.">P. Unit. con IGV</label>
                <input type="number" step="any" value={it.precio_con_igv ?? ""} onChange={(e) => actualizarItem(idx, "precio_con_igv", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1" title="Valor unitario sin IGV (es el que va en la orden). Al escribirlo se calcula el precio con IGV.">V. Unit. sin IGV</label>
                <input type="number" step="any" value={it.valor_unitario} onChange={(e) => actualizarItem(idx, "valor_unitario", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-verde-claro/40" />
              </div>
              <div className="col-span-1 text-right">
                <div className="text-[11px] text-gray-400 leading-tight">Importe</div>
                <div className="text-sm font-medium text-gray-700 leading-tight">{fmt(importeDe(it))}</div>
                {items.length > 1 && (
                  <button type="button" onClick={() => quitarItem(idx)} className="text-red-500 text-xs hover:underline">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 -mt-1">
          Escribe el precio <b>con IGV</b> o el valor <b>sin IGV</b>: el otro se calcula solo. En la orden van los valores sin IGV y el IGV (18 %) se calcula
          sobre el total.
        </p>
        <div className="flex justify-between items-start pt-2 gap-6">
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Descuento sin IGV (opcional)</label>
            <input type="number" step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <table className="text-sm text-gray-600">
            <tbody>
              <tr>
                <td className="pr-6 py-0.5">Subtotal (sin IGV)</td>
                <td className="text-right tabular-nums">{sim} {fmt(subtotal)}</td>
              </tr>
              {desc ? (
                <>
                  <tr>
                    <td className="pr-6 py-0.5">Descuento</td>
                    <td className="text-right tabular-nums">- {sim} {fmt(desc)}</td>
                  </tr>
                  <tr>
                    <td className="pr-6 py-0.5">Valor de venta</td>
                    <td className="text-right tabular-nums">{sim} {fmt(gravada)}</td>
                  </tr>
                </>
              ) : null}
              <tr>
                <td className="pr-6 py-0.5">IGV (18 %)</td>
                <td className="text-right tabular-nums">{sim} {fmt(igv)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="pr-6 pt-1 font-semibold text-gray-800">Total</td>
                <td className="text-right pt-1 font-semibold text-gray-800 tabular-nums">{sim} {fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-verde">Observaciones y condiciones</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Condiciones especiales (una por línea)</label>
          <textarea value={condicionesEspeciales} onChange={(e) => setCondicionesEspeciales(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Garantía" value={garantia} onChange={setGarantia} />
          <Campo label="Penalidad por retraso" value={penalidad} onChange={setPenalidad} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={incluirAnticorrupcion} onChange={(e) => setIncluirAnticorrupcion(e.target.checked)} />
          Incluir cláusula de cumplimiento anticorrupción
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={cargando} className="bg-verde text-white text-sm font-medium px-6 py-2.5 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
        {cargando
          ? ordenId
            ? "Actualizando..."
            : "Generando orden..."
          : ordenId
          ? "Actualizar orden"
          : tipo === "SERVICIO"
          ? "Emitir orden de servicio"
          : "Emitir orden de compra"}
      </button>
    </form>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}
