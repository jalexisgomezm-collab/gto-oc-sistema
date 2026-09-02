import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function OrdenesPage() {
  const supabase = await createClient();
  const { data: ordenes } = await supabase
    .from("ordenes_compra")
    .select("id, numero, fecha_emision, moneda, total, estado, proveedores(razon_social)")
    .order("numero", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Órdenes de compra</h1>
        <Link href="/ordenes/nueva" className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro">
          + Nueva orden
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">N.º OC</th>
              <th className="text-left px-4 py-2">Proveedor</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Archivos</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(ordenes || []).map((o: any) => (
              <tr key={o.id}>
                <td className="px-4 py-2 font-medium">{o.numero}</td>
                <td className="px-4 py-2">{o.proveedores?.razon_social}</td>
                <td className="px-4 py-2 text-gray-600">{o.fecha_emision}</td>
                <td className="px-4 py-2 text-right">
                  {o.moneda === "DOLARES" ? "US$" : "S/"} {money(Number(o.total))}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.estado === "emitida" ? "bg-verde-claro text-verde-oscuro" : "bg-gray-100 text-gray-500"}`}>
                    {o.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <a href={`/api/ordenes/${o.id}/docx`} className="text-verde hover:underline text-sm mr-3">
                    Word
                  </a>
                  <a href={`/api/ordenes/${o.id}/pdf`} className="text-verde hover:underline text-sm">
                    PDF
                  </a>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link href={`/ordenes/${o.id}`} className="text-verde hover:underline text-sm mr-3">
                    Ver
                  </Link>
                  <Link href={`/ordenes/${o.id}/editar`} className="text-verde hover:underline text-sm">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(!ordenes || ordenes.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Aún no se han emitido órdenes de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
