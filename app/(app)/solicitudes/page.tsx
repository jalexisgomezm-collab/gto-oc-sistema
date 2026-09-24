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

const PRIORIDAD_ESTILO: Record<string, string> = {
  ALTA: "bg-red-100 text-red-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAJA: "bg-gray-100 text-gray-500"
};

const PRIORIDAD_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export default async function SolicitudesPage() {
  const supabase = await createClient();
  const { data: solicitudes } = await supabase
    .from("solicitudes_pedido")
    .select("id, numero, area, solicitante, fecha_solicitud, estado, prioridad, proyectos(nombre), solicitud_items(id)")
    .order("numero", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Solicitudes de pedido</h1>
        <Link href="/solicitudes/nueva" className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro">
          + Nueva solicitud
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">N.º</th>
              <th className="text-left px-4 py-2">Área</th>
              <th className="text-left px-4 py-2">Solicitante</th>
              <th className="text-left px-4 py-2">Proyecto</th>
              <th className="text-left px-4 py-2">Fecha</th>
              <th className="text-left px-4 py-2">Prioridad</th>
              <th className="text-left px-4 py-2">Ítems</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(solicitudes || []).map((s: any) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium">{s.numero}</td>
                <td className="px-4 py-2">{AREA_LABEL[s.area] || s.area}</td>
                <td className="px-4 py-2">{s.solicitante || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{s.proyectos?.nombre || "Abastecimiento"}</td>
                <td className="px-4 py-2 text-gray-600">{s.fecha_solicitud}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_ESTILO[s.prioridad] || "bg-gray-100 text-gray-500"}`}>
                    {PRIORIDAD_LABEL[s.prioridad] || s.prioridad}
                  </span>
                </td>
                <td className="px-4 py-2">{(s.solicitud_items || []).length}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      s.estado === "pendiente" ? "bg-gray-100 text-gray-500" : "bg-verde-claro text-verde-oscuro"
                    }`}
                  >
                    {ESTADO_LABEL[s.estado] || s.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/solicitudes/${s.id}`} className="text-verde hover:underline text-sm">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {(!solicitudes || solicitudes.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Aún no se han registrado solicitudes de pedido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
