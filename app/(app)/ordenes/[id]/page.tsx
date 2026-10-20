import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/empresa";

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function DetalleOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_compra")
    .select("*, proveedores(razon_social, ruc, contacto), orden_items(*), proyectos(nombre, cliente, numero_orden_trabajo), solicitudes_pedido!ordenes_compra_solicitud_id_fkey(id, numero)")
    .eq("id", id)
    .single();
  if (!orden) notFound();

  const items = (orden.orden_items || []).sort((a: any, b: any) => a.posicion - b.posicion);
  const simbolo = orden.moneda === "DOLARES" ? "US$" : "S/";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">
            {orden.tipo === "SERVICIO" ? "OS" : "OC"} N.º {orden.numero}
          </h1>
          <p className="text-sm text-gray-500">{orden.proveedores?.razon_social}</p>
          {orden.solicitudes_pedido && (
            <Link href={`/solicitudes/${orden.solicitudes_pedido.id}`} className="text-xs text-verde hover:underline">
              Solicitud de pedido N° {orden.solicitudes_pedido.numero}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          {orden.estado !== "anulada" && (
            <Link
              href={`/ordenes/${orden.id}/editar`}
              className="bg-white border border-verde text-verde text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-claro"
            >
              Editar orden
            </Link>
          )}
          <a
            href={`/api/ordenes/${orden.id}/docx`}
            className="bg-white border border-gray-300 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50"
          >
            Descargar Word
          </a>
          <a href={`/api/ordenes/${orden.id}/pdf`} className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro">
            Descargar PDF
          </a>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Dato label="Fecha de emisión" valor={orden.fecha_emision} />
          <Dato label="Moneda" valor={orden.moneda} />
          <Dato label="Forma de pago" valor={orden.forma_pago} />
          <Dato label="Lugar de entrega" valor={orden.lugar_entrega} />
          <Dato label="RUC proveedor" valor={orden.proveedores?.ruc} />
          <Dato label="Contacto" valor={orden.proveedores?.contacto} />
          <Dato label="Centro de costos" valor={orden.centro_costos} />
          <Dato label="Cotización / doc. relacionado" valor={orden.doc_relacionado} />
          <Dato
            label="Orden de trabajo"
            valor={
              orden.proyectos
                ? [orden.proyectos.numero_orden_trabajo, orden.proyectos.nombre, orden.proyectos.cliente].filter(Boolean).join(" · ")
                : null
            }
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Ítems</h3>
          <table className="w-full text-sm border border-gray-100 rounded-md overflow-hidden">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Descripción</th>
                <th className="text-right px-3 py-2">Cant.</th>
                <th className="text-right px-3 py-2">V. Unit.</th>
                <th className="text-right px-3 py-2">V. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it: any) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.descripcion}</td>
                  <td className="px-3 py-2 text-right">
                    {it.cantidad} {it.um}
                  </td>
                  <td className="px-3 py-2 text-right">{money(Number(it.valor_unitario))}</td>
                  <td className="px-3 py-2 text-right">{money(Number(it.cantidad) * Number(it.valor_unitario))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="text-right">
            {orden.descuento ? (
              <p className="text-xs text-gray-500">
                Subtotal: {simbolo} {money(Number(orden.subtotal))} · Descuento: {simbolo} {money(Number(orden.descuento))}
              </p>
            ) : null}
            <p className="text-xs text-gray-500">IGV: {simbolo} {money(Number(orden.igv))}</p>
            <p className="text-lg font-semibold text-verde">
              Total: {simbolo} {money(Number(orden.total))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Condiciones y cláusulas de la orden</h3>
          {orden.estado !== "anulada" && (
            <Link href={`/ordenes/${orden.id}/editar`} className="text-xs text-verde hover:underline">
              Editar condiciones
            </Link>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Condiciones comerciales</p>
          <ul className="space-y-0.5 text-gray-700">
            <li><b>Forma de pago:</b> {orden.forma_pago || "Por coordinar."}</li>
            <li><b>Plazo de entrega:</b> {orden.fecha_entrega || "Por coordinar con el proveedor."}</li>
            {(orden.lugar_entrega || orden.origen || orden.destino) && (
              <li><b>Lugar de recojo y entrega:</b> {orden.lugar_entrega || `${orden.origen || ""} → ${orden.destino || ""}`}</li>
            )}
            {orden.garantia && <li><b>Garantía:</b> {orden.garantia}</li>}
            {orden.penalidad && <li><b>Penalidad por retraso en la entrega:</b> {orden.penalidad}</li>}
          </ul>
        </div>
        {((orden.condiciones_especiales || []).length > 0 || orden.observaciones) && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Condiciones especiales y observaciones</p>
            <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
              {(orden.condiciones_especiales || []).map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
              {orden.observaciones && <li>{orden.observaciones}</li>}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Cláusulas (van en todas las órdenes)</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
            <li>
              <b>Aceptación de la orden:</b> el proveedor debe confirmar la recepción y aceptación en un plazo máximo de dos (2) días
              calendario desde su envío; si no comunica observaciones o rechazo en ese plazo, la orden se considera aceptada tácitamente.
            </li>
            <li>
              <b>Documentos para facturación:</b> consignar el número de esta orden y adjuntar factura, guía de remisión o constancia del
              servicio y conformidad, cuando corresponda. Enviar a: {EMPRESA.correos.split(" | ")[1] || EMPRESA.correos.split(" | ")[0]}
            </li>
            {orden.incluir_anticorrupcion !== false ? (
              <li>
                <b>Cumplimiento anticorrupción:</b> el proveedor declara conocer y cumplir la legislación peruana e internacional en materia
                anticorrupción y antisoborno, y se abstiene de ofrecer o entregar beneficios indebidos en el marco de esta orden.
              </li>
            ) : (
              <li className="text-gray-400">Cláusula anticorrupción: no incluida en esta orden.</li>
            )}
          </ol>
          <p className="text-[11px] text-gray-400 mt-2">
            El pie del documento indica además que es confidencial y está dirigido solo al proveedor indicado.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p>{valor}</p>
    </div>
  );
}
