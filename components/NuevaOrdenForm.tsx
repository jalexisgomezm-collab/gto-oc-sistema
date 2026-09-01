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

const itemVacio: ItemForm = { cantidad: "1", um: "UND", codigo: "", descripcion: "", entrega: "", valor_unitario: "" };

export default function NuevaOrdenForm({ proveedores }: { proveedores: ProveedorOpcion[] }) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState("");
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [moneda, setMoneda] = useState<"SOLES" | "DOLARES">("SOLES");
  const [formaPago, setFormaPago] = useState("");
  const [lugarEntrega, setLugarEntrega] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [centroCostos, setCentroCostos] = useState("");
  const [docRelacionado, setDocRelacionado] = useState("");
  const [comprador, setComprador] = useState("");
  const [garantia, setGarantia] = useState("");
  const [penalidad, setPenalidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [incluirAnticorrupcion, setIncluirAnticorrupcion] = useState(true);
  const [condicionesEspeciales, setCondicionesEspeciales] = useState("");
  const [descuento, setDescuento] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...itemVacio }]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/ordenes", {
        method: "POST",
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
      if (!res.ok) throw new Error(data.error || "No se pudo crear la orden");
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
        {cargando ? "Generando orden..." : "Emitir orden de compra"}
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
