"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMPROBANTE_LABEL, MEDIO_PAGO_LABEL } from "@/lib/solicitudes";

export interface CompraMenor {
  id: string;
  fecha: string;
  monto: number;
  proveedor: string;
  medio_pago: string;
  comprobante_tipo: string;
  comprobante_numero: string | null;
  comprobante_path: string;
  comprobante_nombre: string | null;
  observacion: string | null;
  registrado_nombre: string | null;
}

export interface AvisoFraccionamiento {
  solicitudId: string;
  numero: number;
  fecha: string;
  monto: number;
  coincidencias: string[];
}

const soles = (v: number) => "S/ " + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface ItemSeleccionado {
  item_id: string;
  cantidad: number;
  etiqueta: string;
}

export type ModoAtencion = "" | "compra" | "almacen" | "anular";

export default function AtencionSolicitud({
  solicitudId,
  estado,
  limite,
  compras,
  avisos,
  totalAreaMes,
  modo,
  setModo,
  seleccion,
  alTerminar
}: {
  solicitudId: string;
  estado: string;
  limite: number;
  compras: CompraMenor[];
  avisos: AvisoFraccionamiento[];
  totalAreaMes: number;
  modo: ModoAtencion;
  setModo: (m: ModoAtencion) => void;
  seleccion: ItemSeleccionado[];
  alTerminar: () => void;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [medio, setMedio] = useState("CAJA_CHICA");
  const [tipoComp, setTipoComp] = useState("BOLETA");
  const [numComp, setNumComp] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observacion, setObservacion] = useState("");
  const [entregado, setEntregado] = useState(true);
  const [comentarioAlmacen, setComentarioAlmacen] = useState("");
  const [motivoAnular, setMotivoAnular] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrada = estado === "anulada" || estado === "atendida";
  const gastado = compras.reduce((a, c) => a + Number(c.monto), 0);
  const disponible = Math.max(0, limite - gastado);
  const itemsRpc = seleccion.map((s) => ({ item_id: s.item_id, cantidad: s.cantidad }));
  const hayForm = modo !== "" && !cerrada;

  if (!hayForm && compras.length === 0) return null;

  async function verComprobante(path: string) {
    const supabase = createClient();
    const { data, error: err } = await supabase.storage.from("documentos-oc").createSignedUrl(path, 300);
    if (err || !data) return setError("No se pudo abrir el comprobante");
    window.open(data.signedUrl, "_blank");
  }

  async function registrarCompra(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const m = Number(monto);
    if (!m || m <= 0) return setError("Ingresa el monto pagado");
    if (m > disponible + 0.001) {
      return setError(
        `El monto supera el límite de compra menor (${soles(limite)}${gastado ? `; ya se gastó ${soles(gastado)}` : ""}). Usa el proceso normal con cotizaciones y OC.`
      );
    }
    if (!proveedor.trim()) return setError("Indica dónde se compró");
    if (!archivo) return setError("Adjunta la foto de la boleta o factura");
    if (seleccion.length === 0) return setError("Marca los ítems que se compraron");

    setGuardando(true);
    const supabase = createClient();
    try {
      const seguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const ruta = `compras-menores/${solicitudId}/${crypto.randomUUID()}-${seguro}`;
      const { error: errUp } = await supabase.storage.from("documentos-oc").upload(ruta, archivo, { upsert: false });
      if (errUp) throw new Error(`No se pudo subir el comprobante: ${errUp.message}`);
      const { error: errRpc } = await supabase.rpc("registrar_compra_menor", {
        p_solicitud: solicitudId,
        p_monto: m,
        p_proveedor: proveedor.trim(),
        p_medio_pago: medio,
        p_comprobante_tipo: tipoComp,
        p_comprobante_numero: numComp.trim() || null,
        p_comprobante_path: ruta,
        p_comprobante_nombre: archivo.name,
        p_fecha: fecha,
        p_observacion: observacion.trim() || null,
        p_entregado: entregado,
        p_items: itemsRpc
      });
      if (errRpc) {
        await supabase.storage.from("documentos-oc").remove([ruta]);
        throw new Error(errRpc.message);
      }
      setModo("");
      setMonto("");
      setProveedor("");
      setNumComp("");
      setArchivo(null);
      setObservacion("");
      alTerminar();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "No se pudo registrar la compra");
    } finally {
      setGuardando(false);
    }
  }

  async function atenderAlmacen() {
    setError(null);
    if (seleccion.length === 0) return setError("Marca los ítems que se entregan desde almacén");
    setGuardando(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("atender_desde_almacen", {
      p_solicitud: solicitudId,
      p_comentario: comentarioAlmacen.trim() || null,
      p_items: itemsRpc
    });
    setGuardando(false);
    if (err) return setError(err.message);
    setModo("");
    setComentarioAlmacen("");
    alTerminar();
    router.refresh();
  }

  async function anularItems() {
    setError(null);
    if (seleccion.length === 0) return setError("Marca los ítems que ya no se atenderán");
    if (!motivoAnular.trim()) return setError("Indica el motivo (ej: el área ya no lo necesita, se consiguió por otro medio)");
    setGuardando(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("anular_items_solicitud", {
      p_solicitud: solicitudId,
      p_items: itemsRpc,
      p_motivo: motivoAnular.trim()
    });
    setGuardando(false);
    if (err) return setError(err.message);
    setModo("");
    setMotivoAnular("");
    alTerminar();
    router.refresh();
  }

  const listaSeleccion = (
    <ul className="text-xs text-gray-600 list-disc pl-5">
      {seleccion.map((s) => (
        <li key={s.item_id}>{s.etiqueta}</li>
      ))}
    </ul>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-verde">
          {modo === "almacen" ? "Atender desde almacén" : modo === "anular" ? "Anular ítems" : "Compras menores"}
        </h2>
        <p className="text-xs text-gray-500">Solo visible para el área de compras.</p>
      </div>

      {avisos.length > 0 && (modo === "compra" || compras.length > 0) && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 space-y-1">
          <p className="font-medium">Posible fraccionamiento: esta área ya compró lo mismo como compra menor en los últimos 30 días.</p>
          {avisos.map((a) => (
            <p key={a.solicitudId}>
              <Link href={`/solicitudes/${a.solicitudId}`} className="underline">
                Solicitud N° {a.numero}
              </Link>{" "}
              · {a.fecha} · {soles(a.monto)} · {a.coincidencias.join(", ")}
            </p>
          ))}
          <p>Si se repite, conviene juntar el pedido y hacer una sola compra con cotizaciones y OC.</p>
        </div>
      )}
      {(modo === "compra" || compras.length > 0) && totalAreaMes > 0 && (
        <p className="text-xs text-gray-500">Compras menores de esta área en los últimos 30 días: {soles(totalAreaMes)}.</p>
      )}

      {compras.length > 0 && (
        <div>
          <table className="w-full text-sm border border-gray-100">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Dónde se compró</th>
                <th className="text-left px-3 py-2">Pago</th>
                <th className="text-left px-3 py-2">Comprobante</th>
                <th className="text-right px-3 py-2">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.fecha}</td>
                  <td className="px-3 py-2">
                    {c.proveedor}
                    {c.observacion && <p className="text-xs text-gray-500">{c.observacion}</p>}
                    {c.registrado_nombre && <p className="text-xs text-gray-400">Registró: {c.registrado_nombre}</p>}
                  </td>
                  <td className="px-3 py-2">{MEDIO_PAGO_LABEL[c.medio_pago] || c.medio_pago}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => verComprobante(c.comprobante_path)} className="text-verde hover:underline text-xs">
                      {COMPROBANTE_LABEL[c.comprobante_tipo] || c.comprobante_tipo} {c.comprobante_numero || ""} (ver)
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{soles(Number(c.monto))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            Total {soles(gastado)} de un límite de {soles(limite)}.
            {!cerrada && disponible > 0 && " Para otra compra, marca los ítems pendientes arriba y elige Compra menor."}
          </p>
        </div>
      )}

      {modo === "compra" && !cerrada && (
        <form onSubmit={registrarCompra} className="border border-gray-200 rounded-md p-4 space-y-3">
          <p className="text-sm font-medium">
            Registrar compra menor <span className="text-xs text-gray-400 font-normal">(disponible: {soles(disponible)})</span>
          </p>
          {listaSeleccion}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha de compra</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto pagado (S/, con IGV)</label>
              <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Medio de pago</label>
              <select value={medio} onChange={(e) => setMedio(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                {Object.entries(MEDIO_PAGO_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Dónde se compró (tienda / proveedor)</label>
              <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej: Ferretería El Tornillo, Promart..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Comprobante</label>
              <select value={tipoComp} onChange={(e) => setTipoComp(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                {Object.entries(COMPROBANTE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° de comprobante</label>
              <input value={numComp} onChange={(e) => setNumComp(e.target.value)} placeholder="B001-000123" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Foto o PDF del comprobante *</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="text-xs" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Observación (opcional)</label>
              <input value={observacion} onChange={(e) => setObservacion(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={entregado} onChange={(e) => setEntregado(e.target.checked)} />
            Ya se entregó al área
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-verde text-white text-sm px-4 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
              {guardando ? "Guardando..." : "Registrar compra"}
            </button>
            <button type="button" onClick={() => setModo("")} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "almacen" && !cerrada && (
        <div className="border border-gray-200 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium">Se entregan con stock de almacén:</p>
          {listaSeleccion}
          <input
            value={comentarioAlmacen}
            onChange={(e) => setComentarioAlmacen(e.target.value)}
            placeholder="Opcional: quién recibió, observaciones..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={atenderAlmacen} disabled={guardando} className="bg-verde text-white text-sm px-4 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60">
              {guardando ? "Guardando..." : "Marcar como entregado"}
            </button>
            <button type="button" onClick={() => setModo("")} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "anular" && !cerrada && (
        <div className="border border-red-200 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium">Estos ítems ya no se atenderán:</p>
          {listaSeleccion}
          <input
            value={motivoAnular}
            onChange={(e) => setMotivoAnular(e.target.value)}
            placeholder="Motivo (obligatorio): ej. el área ya no lo necesita"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={anularItems} disabled={guardando} className="bg-red-600 text-white text-sm px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-60">
              {guardando ? "Guardando..." : "Anular ítems"}
            </button>
            <button type="button" onClick={() => setModo("")} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
