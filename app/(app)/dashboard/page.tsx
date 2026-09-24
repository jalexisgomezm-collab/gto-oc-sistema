import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const AREAS = ["LABORATORIO", "TALLER", "LOGISTICA", "ADMINISTRACION"];
const AREA_LABEL: Record<string, string> = {
  LABORATORIO: "Laboratorio",
  TALLER: "Taller",
  LOGISTICA: "Logística",
  ADMINISTRACION: "Administración"
};

const PRIORIDAD_ORDEN: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };
const PRIORIDAD_ESTILO: Record<string, string> = {
  ALTA: "bg-red-100 text-red-700",
  MEDIA: "bg-yellow-100 text-yellow-700",
  BAJA: "bg-gray-100 text-gray-500"
};
const PRIORIDAD_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: solicitudes } = await supabase
    .from("solicitudes_pedido")
    .select("id, numero, area, solicitante, fecha_solicitud, prioridad, estado, proyectos(nombre)")
    .eq("estado", "pendiente");

  const porArea = AREAS.map((area) => {
    const deArea = (solicitudes || []).filter((s: any) => s.area === area);
    const conteo = { ALTA: 0, MEDIA: 0, BAJA: 0 } as Record<string, number>;
    for (const s of deArea) conteo[s.prioridad] = (conteo[s.prioridad] || 0) + 1;
    const ordenadas = [...deArea].sort((a: any, b: any) => {
      const dp = (PRIORIDAD_ORDEN[a.prioridad] ?? 9) - (PRIORIDAD_ORDEN[b.prioridad] ?? 9);
      if (dp !== 0) return dp;
      return String(a.fecha_solicitud).localeCompare(String(b.fecha_solicitud));
    });
    return { area, conteo, total: deArea.length, solicitudes: ordenadas };
  }).sort((a, b) => {
    if (b.conteo.ALTA !== a.conteo.ALTA) return b.conteo.ALTA - a.conteo.ALTA;
    if (b.conteo.MEDIA !== a.conteo.MEDIA) return b.conteo.MEDIA - a.conteo.MEDIA;
    return b.total - a.total;
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Dashboard de solicitudes por área</h1>
      <p className="text-sm text-gray-500 mb-6">
        Ordenado de la más necesitada a la menos necesitada, según solicitudes pendientes y su prioridad.
      </p>

      <div className="space-y-6">
        {porArea.map(({ area, conteo, total, solicitudes: lista }) => (
          <div key={area} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">{AREA_LABEL[area]}</h2>
                <span className="text-xs text-gray-400">{total} pendiente(s)</span>
              </div>
              <div className="flex gap-2">
                {(["ALTA", "MEDIA", "BAJA"] as const).map((p) =>
                  conteo[p] > 0 ? (
                    <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_ESTILO[p]}`}>
                      {PRIORIDAD_LABEL[p]}: {conteo[p]}
                    </span>
                  ) : null
                )}
              </div>
            </div>
            {lista.length === 0 ? (
              <p className="px-4 py-6 text-center text-gray-400 text-sm">Sin solicitudes pendientes.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">N.º</th>
                    <th className="text-left px-4 py-2">Solicitante</th>
                    <th className="text-left px-4 py-2">Proyecto</th>
                    <th className="text-left px-4 py-2">Fecha</th>
                    <th className="text-left px-4 py-2">Prioridad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lista.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-medium">{s.numero}</td>
                      <td className="px-4 py-2">{s.solicitante || "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.proyectos?.nombre || "Abastecimiento"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.fecha_solicitud}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_ESTILO[s.prioridad]}`}>
                          {PRIORIDAD_LABEL[s.prioridad]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/solicitudes/${s.id}`} className="text-verde hover:underline text-sm">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
