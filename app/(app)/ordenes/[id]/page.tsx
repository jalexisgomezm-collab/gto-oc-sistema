import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function DetalleOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_compra")
    .select("*, proveedores(razon_social, ruc, contacto), orden_items(*)")
    .eq("id", id)
    .single();
  if (!orden) notFound();

  const items = (orden.orden_items || []).sort((a: any, b: any) => a.posicion - b.posicion);
  const simbolo = orden.moneda === "DOLARES" ? "US$" : "S/";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">OC N.º {orden.numero}</h1>
          <p className="text-sm text-gray-500">{orden.proveedores?.razon_social}</p>
        </div>
        <div className="flex gap-2">
          
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
            <p className="text-xs text-gray-500">IGV: {simbolo} {money(Number(orden.igv))}</p>
            <p className="text-lg font-semibold text-verde">
              Total: {simbolo} {money(Number(orden.total))}
            </p>
          </div>
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
