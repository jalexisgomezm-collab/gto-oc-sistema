import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import {
  AREA_LABEL,
  ESTADO_LABEL,
  ESTADO_ESTILO,
  ETAPAS,
  ESTADOS_ESPECIALES,
  PRIORIDAD_ESTILO,
  PRIORIDAD_LABEL,
  TIPO_ORDEN_CORTO,
  estadoItem
} from "@/lib/solicitudes";

const FILTROS = [
  { value: "activas", label: "En proceso" },
  ...ETAPAS.map((e) => ({ value: e.value, label: e.label })),
  { value: "compra_menor", label: "Compra menor" },
  { value: "atendida_parcial", label: "Atendido parcial" },
  ...ESTADOS_ESPECIALES.map((e) => ({ value: e.value, label: e.label })),
  { value: "todas", label: "Todas" }
];

const ACTIVAS = ["pendiente", "en_consulta", "en_cotizacion", "proveedor_elegido", "convertida", "compra_menor", "atendida_parcial", "observada"];

export default async function SolicitudesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado: filtroParam } = await searchParams;
  const filtro = FILTROS.some((f) => f.value === filtroParam) ? (filtroParam as string) : "activas";

  const supabase = await createClient();
  const perfil = await obtenerPerfil(supabase);
  const esCompras = !!perfil?.es_compras;

  let query = supabase
    .from("solicitudes_pedido")
    .select(
      "id, numero, area, solicitante, fecha_solicitud, estado, prioridad, orden_numero, orden_tipo, via_atencion, updated_at, proyectos(nombre, numero_orden_trabajo), solicitud_items(id, cantidad), solicitud_item_atenciones(item_id, tipo, cantidad, entregado, orden_anulada, orden_numero, orden_tipo)"
    )
    .order("numero", { ascending: false });
  if (filtro === "activas") query = query.in("estado", ACTIVAS);
  else if (filtro === "compra_menor") query = query.eq("via_atencion", "COMPRA_MENOR");
  else if (filtro !== "todas") query = query.eq("estado", filtro);
  const { data: solicitudes } = await query;

  const titulo = esCompras
    ? "Solicitudes de pedido"
    : perfil?.area
    ? `Solicitudes de ${AREA_LABEL[perfil.area] || perfil.area}`
    : "Mis solicitudes";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <Link href="/solicitudes/nueva" className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro">
          + Nueva solicitud
        </Link>
      </div>

      {!esCompras && !perfil?.area && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          Aún no tienes un área asignada: por ahora solo ves las solicitudes que tú registraste. Pide al área de compras que
          te asigne tu área.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "activas" ? "/solicitudes" : `/solicitudes?estado=${f.value}`}
            className={`text-xs px-3 py-1 rounded-full border ${
              filtro === f.value ? "bg-verde text-white border-verde" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
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
              <th className="text-left px-4 py-2">Seguimiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(solicitudes || []).map((s: any) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium">{s.numero}</td>
                <td className="px-4 py-2">{AREA_LABEL[s.area] || s.area}</td>
                <td className="px-4 py-2">{s.solicitante || "—"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {s.proyectos ? [s.proyectos.numero_orden_trabajo, s.proyectos.nombre].filter(Boolean).join(" · ") : "Abastecimiento"}
                </td>
                <td className="px-4 py-2 text-gray-600">{s.fecha_solicitud}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_ESTILO[s.prioridad] || "bg-gray-100 text-gray-500"}`}>
                    {PRIORIDAD_LABEL[s.prioridad] || s.prioridad}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {(s.solicitud_items || []).length}
                  {(() => {
                    const ats = s.solicitud_item_atenciones || [];
                    if (ats.length === 0) return null;
                    const its = s.solicitud_items || [];
                    const listos = its.filter((it: any) => estadoItem(Number(it.cantidad), ats.filter((a: any) => a.item_id === it.id)).pendiente <= 0).length;
                    return listos < its.length ? <span className="block text-[11px] text-lime-800">{listos} de {its.length} atendidos</span> : null;
                  })()}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_ESTILO[s.estado] || "bg-gray-100 text-gray-500"}`}>
                    {ESTADO_LABEL[s.estado] || s.estado}
                  </span>
                  {s.via_atencion === "COMPRA_MENOR" && <span className="block text-xs text-gray-400 mt-0.5">Compra menor</span>}
                  {s.via_atencion === "ALMACEN" && <span className="block text-xs text-gray-400 mt-0.5">Desde almacén</span>}
                  {s.via_atencion === "MIXTA" && <span className="block text-xs text-gray-400 mt-0.5">Mixta (por ítems)</span>}
                  {(() => {
                    const ords = Array.from(
                      new Set(
                        (s.solicitud_item_atenciones || [])
                          .filter((a: any) => a.tipo === "ORDEN" && !a.orden_anulada)
                          .map((a: any) => `${TIPO_ORDEN_CORTO[a.orden_tipo] || "OC"} N° ${a.orden_numero}`)
                      )
                    );
                    const texto = ords.length ? ords.join(" · ") : s.orden_numero ? `${TIPO_ORDEN_CORTO[s.orden_tipo] || "OC"} N° ${s.orden_numero}` : "";
                    return texto ? <span className="block text-xs text-gray-400 mt-0.5">{texto}</span> : null;
                  })()}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link href={`/solicitudes/${s.id}`} className="text-verde hover:underline text-sm mr-3">
                    Ver
                  </Link>
                  <a href={`/api/solicitudes/${s.id}/pdf`} target="_blank" rel="noreferrer" className="text-verde hover:underline text-sm">
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {(!solicitudes || solicitudes.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No hay solicitudes en esta vista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
