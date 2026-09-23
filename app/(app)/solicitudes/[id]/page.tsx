import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const AREA_LABEL: Record<string, string> = {
  LABORATORIO: "Laboratorio",
  TALLER: "Taller",
  LOGISTICA: "Logística",
  ADMINISTRACION: "Administración"
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_cotizacion: "En cotización",
  convertida: "Convertida a OC",
  anulada: "Anulada"
};

export default async function SolicitudDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: solicitud } = await supabase
    .from("solicitudes_pedido")
    .select("*, solicitud_items(*)")
    .eq("id", id)
    .single();

  if (!solicitud) notFound();

  const items = (solicitud.solicitud_items || []).sort((a: any, b: any) => a.posicion - b.posicion);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Solicitud de pedido N.º {solicitud.numero}</h1>
        <Link href="/solicitudes" className="text-sm text-verde hover:underline">
          ← Volver a solicitudes
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Área</p>
            <p className="font-medium">{AREA_LABEL[solicitud.area] || solicitud.area}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Solicitante</p>
            <p className="font-medium">{solicitud.solicitante || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fecha de solicitud</p>
            <p className="font-medium">{solicitud.fecha_solicitud}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Estado</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                solicitud.estado === "pendiente" ? "bg-gray-100 text-gray-500" : "bg-verde-claro text-verde-oscuro"
              }`}
            >
              {ESTADO_LABEL[solicitud.estado] || solicitud.estado}
            </span>
          </div>
        </div>
        {solicitud.observaciones && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Observaciones</p>
            <p className="text-sm">{solicitud.observaciones}</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Producto</th>
              <th className="text-left px-4 py-2">Cantidad</th>
              <th className="text-left px-4 py-2">U.M.</th>
              <th className="text-left px-4 py-2">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it: any, idx: number) => (
              <tr key={it.id}>
                <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                <td className="px-4 py-2">{it.descripcion}</td>
                <td className="px-4 py-2">{it.cantidad}</td>
                <td className="px-4 py-2">{it.um}</td>
                <td className="px-4 py-2 text-gray-600">{it.observacion || "—"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Esta solicitud no tiene ítems.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
