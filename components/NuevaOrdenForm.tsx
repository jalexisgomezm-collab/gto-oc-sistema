"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
}

interface InicialOrden {
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
  items: ItemForm[];
}

interface ResultadoBusqueda {
  id: string;
  numero: number;
  fecha_emision: string;
  proveedores?: { razon_social: string; ruc: string } | null;
}

const itemVacio: ItemForm = { cantidad: "1", um: "UND", codigo: "", descripcion: "", entrega: "", valor_unitario: "" };

export default function NuevaOrdenForm({
  proveedores,
  ordenId,
  inicial
}: {
  proveedores: ProveedorOpcion[];
  ordenId?: string;
  inicial?: InicialOrden;
}) {
  const router = useRouter();
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
  const [comprador, setComprador] = useState(inicial?.comprador || "");
  const [garantia, setGarantia] = useState(inicial?.garantia || "");
  const [penalidad, setPenalidad] = useState(inicial?.penalidad || "");
  const [observaciones, setObservaciones] = useState(inicial?.observaciones || "");
  const [incluirAnticorrupcion, setIncluirAnticorrupcion] = useState(inicial?.incluir_anticorrupcion ?? true);
  const [condicionesEspeciales, setCondicionesEspeciales] = useState(inicial?.condiciones_especiales || "");
  const [descuento, setDescuento] = useState(inicial?.descuento || "");
  const [items, setItems] = useState<ItemForm[]>(inicial?.items && inicial.items.length > 0 ? inicial.items : [{ ...itemVacio }]);
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
      setDocRelacionado(p.doc_relacionado || "");
      setComprador(p.comprador || "");
      setGarantia(p.garantia || "");
      setPenalidad(p.penalidad || "");
      setCondicionesEspeciales(p.condiciones_especiales || "");
      setObservaciones(p.observaciones || "");
      setIncluirAnticorrupcion(p.incluir_anticorrupcion ?? true);
      setDescuento(p.descuento || "");
      if (p.items && p.items.length > 0) setItems(p.items);

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
      copia[idx] = { ...copia[idx], [campo]: valor };
      return copia;
    });
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...itemVacio }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalEstimado = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.valor_unitario) || 0), 0);

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
            valor_unitario: Number(it.valor_unitario)
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
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Descripción</label>
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
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Entrega (opcional)</label>
                <input value={it.entrega} onChange={(e) => actualizarItem(idx, "entrega", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">V. Unitario</label>
                <input type="number" step="0.01" value={it.valor_unitario} onChange={(e) => actualizarItem(idx, "valor_unitario", e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-1 text-right">
                {items.length > 1 && (
                  <button type="button" onClick={() => quitarItem(idx)} className="text-red-500 text-xs hover:underline">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Descuento (opcional)</label>
            <input type="number" step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <p className="text-sm text-gray-600">
            Subtotal estimado: <span className="font-semibold">{totalEstimado.toFixed(2)}</span> (más IGV 18%)
          </p>
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
        {cargando ? (ordenId ? "Actualizando..." : "Generando orden...") : ordenId ? "Actualizar orden" : "Emitir orden de compra"}
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
