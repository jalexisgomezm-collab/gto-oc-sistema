import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { AREAS, AREA_LABEL, ESTADO_LABEL, ESTADO_ESTILO, ETAPAS, ESTADOS_ESPECIALES, PRIORIDAD_LABEL, VIA_LABEL, TIPO_ORDEN_CORTO } from "@/lib/solicitudes";
import { leerFiltros, obtenerReporte, periodosRapidos, type FiltrosReporte } from "@/lib/reporteSolicitudes";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fmtFecha = (f: string) => f.split("-").reverse().join("/");
const fmtMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const dias = (d: number | null) => (d === null ? "—" : `${d.toLocaleString("es-PE")} d`);

function qs(f: FiltrosReporte, cambios: Partial<FiltrosReporte> = {}) {
  const x = { ...f, ...cambios };
  const p = new URLSearchParams();
  (Object.keys(x) as (keyof FiltrosReporte)[]).forEach((k) => x[k] && p.set(k, x[k]));
  return p.toString();
}

function Barra({ valor, max, color = "bg-verde" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="h-2.5 bg-gray-100 rounded-full w-full">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${valor ? pct : 0}%` }} />
    </div>
  );
}

function Tarjeta({ titulo, valor, sub, color = "text-gray-900" }: { titulo: string; valor: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function ReportesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const perfil = await obtenerPerfil(supabase);
  if (!perfil?.es_compras) redirect("/solicitudes");

  const f = leerFiltros(sp);
  let reporte: Awaited<ReturnType<typeof obtenerReporte>> | null = null;
  let error: string | null = null;
  try {
    reporte = await obtenerReporte(supabase, f);
  } catch (e: any) {
    error = e.message;
  }
  const r = reporte?.resumen;
  const g = r?.general;
  const pct = (n: number) => (g && g.total ? `${Math.round((n / g.total) * 100)}%` : "0%");
  const maxArea = Math.max(1, ...(r?.porArea.map((a) => a.total) || [0]));
  const maxMes = Math.max(1, ...(r?.porMes.map((m) => m.total) || [0]));
  const maxProy = Math.max(1, ...(r?.porProyecto.map((p) => p.total) || [0]));
  const totalVias = Object.values(r?.vias || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Reporte de solicitudes</h1>
        <a
          href={`/api/reportes/solicitudes?${qs(f)}`}
          className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro"
        >
          Descargar Excel
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Del <b>{fmtFecha(f.desde)}</b> al <b>{fmtFecha(f.hasta)}</b>, según la fecha de solicitud. Solo visible para Compras y
        Administración.
      </p>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {periodosRapidos().map((p) => {
            const activo = p.desde === f.desde && p.hasta === f.hasta;
            return (
              <Link
                key={p.label}
                href={`/reportes?${qs(f, { desde: p.desde, hasta: p.hasta })}`}
                className={`text-xs px-3 py-1 rounded-full border ${
                  activo ? "bg-verde text-white border-verde" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form method="get" className="grid grid-cols-7 gap-3 items-end">
          <label className="text-xs text-gray-500">
            Desde
            <input type="date" name="desde" defaultValue={f.desde} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800" />
          </label>
          <label className="text-xs text-gray-500">
            Hasta
            <input type="date" name="hasta" defaultValue={f.hasta} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800" />
          </label>
          <label className="text-xs text-gray-500">
            Área
            <select name="area" defaultValue={f.area} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800">
              <option value="">Todas</option>
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Etapa
            <select name="estado" defaultValue={f.estado} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800">
              <option value="">Todas</option>
              <option value="en_proceso">En proceso (sin cerrar)</option>
              {[...ETAPAS, { value: "compra_menor", label: "Comprado (compra menor)" }, { value: "atendida_parcial", label: "Atendido parcial" }, ...ESTADOS_ESPECIALES].map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Prioridad
            <select name="prioridad" defaultValue={f.prioridad} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800">
              <option value="">Todas</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">
            Atención
            <select name="via" defaultValue={f.via} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-800">
              <option value="">Todas</option>
              <option value="NORMAL">Proceso normal</option>
              <option value="COMPRA_MENOR">Compra menor</option>
              <option value="ALMACEN">Desde almacén</option>
              <option value="MIXTA">Mixta (por ítems)</option>
              <option value="SIN_DEFINIR">Aún sin definir</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-verde text-white text-sm px-4 py-2 rounded-md hover:bg-verde-oscuro">
              Aplicar
            </button>
            <Link href="/reportes" className="text-xs text-gray-500 py-2 hover:underline">
              Limpiar
            </Link>
          </div>
        </form>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">No se pudo generar el reporte: {error}</p>}

      {g && r && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            <Tarjeta titulo="Solicitudes" valor={g.total} />
            <Tarjeta titulo="Atendidas" valor={g.atendidas} sub={pct(g.atendidas)} color="text-verde" />
            <Tarjeta titulo="En proceso" valor={g.enProceso} sub={pct(g.enProceso)} color="text-indigo-700" />
            <Tarjeta titulo="Observadas" valor={g.observadas} sub={pct(g.observadas)} color="text-orange-600" />
            <Tarjeta titulo="Anuladas" valor={g.anuladas} sub={pct(g.anuladas)} color="text-red-600" />
            <Tarjeta titulo="Tiempo promedio de atención" valor={dias(g.diasPromedio)} sub="desde el registro hasta la entrega" />
          </div>

          {g.total === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 mb-6">
              No hay solicitudes con estos filtros.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Por área */}
                <section className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-verde mb-3">Por área</h2>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500">
                      <tr>
                        <th className="text-left font-medium pb-2">Área</th>
                        <th className="text-left font-medium pb-2 w-2/5"></th>
                        <th className="text-right font-medium pb-2">Total</th>
                        <th className="text-right font-medium pb-2">Atend.</th>
                        <th className="text-right font-medium pb-2">En proc.</th>
                        <th className="text-right font-medium pb-2">Prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.porArea.map((a) => (
                        <tr key={a.area}>
                          <td className="py-1.5">
                            <Link href={`/reportes?${qs(f, { area: a.area })}`} className="hover:underline">
                              {a.label}
                            </Link>
                          </td>
                          <td className="py-1.5 pr-3">
                            <Barra valor={a.total} max={maxArea} />
                          </td>
                          <td className="py-1.5 text-right font-medium">{a.total}</td>
                          <td className="py-1.5 text-right text-verde">{a.atendidas}</td>
                          <td className="py-1.5 text-right text-indigo-700">{a.enProceso}</td>
                          <td className="py-1.5 text-right text-gray-500">{dias(a.diasPromedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* Por mes */}
                <section className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-verde mb-3">Por mes</h2>
                  <div className="space-y-2">
                    {r.porMes.map((m) => (
                      <div key={m.mes} className="grid grid-cols-12 items-center gap-2 text-sm">
                        <span className="col-span-2 text-gray-600">{fmtMes(m.mes)}</span>
                        <div className="col-span-7 relative">
                          <Barra valor={m.total} max={maxMes} color="bg-verde-claro" />
                          <div className="absolute inset-0">
                            <Barra valor={m.atendidas} max={maxMes} />
                          </div>
                        </div>
                        <span className="col-span-3 text-right text-xs text-gray-500">
                          <b className="text-gray-800">{m.total}</b> · {m.atendidas} atend.
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Barra clara: solicitudes del mes · barra verde: ya atendidas.</p>
                </section>

                {/* Por OT / PI */}
                <section className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-verde mb-3">Por OT / proyecto interno</h2>
                  <div className="space-y-2">
                    {r.porProyecto.map((p) => (
                      <div key={p.nombre} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="truncate text-gray-700" title={p.nombre}>
                            {p.nombre}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            <b className="text-gray-800">{p.total}</b> · {p.atendidas} atend.
                          </span>
                        </div>
                        <Barra valor={p.total} max={maxProy} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Forma de atención y productos */}
                <section className="bg-white border border-gray-200 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-verde mb-3">Forma de atención</h2>
                  <div className="space-y-2 mb-5">
                    {(["NORMAL", "COMPRA_MENOR", "ALMACEN", "SIN_DEFINIR"] as const).map((v) => (
                      <div key={v} className="grid grid-cols-12 items-center gap-2 text-sm">
                        <span className="col-span-5 text-gray-600">{v === "SIN_DEFINIR" ? "Aún sin definir" : VIA_LABEL[v]}</span>
                        <div className="col-span-5">
                          <Barra valor={r.vias[v] || 0} max={totalVias} color={v === "SIN_DEFINIR" ? "bg-gray-300" : "bg-verde"} />
                        </div>
                        <span className="col-span-2 text-right font-medium">{r.vias[v] || 0}</span>
                      </div>
                    ))}
                  </div>
                  <h2 className="text-sm font-semibold text-verde mb-2">Productos más pedidos</h2>
                  <table className="w-full text-sm">
                    <tbody>
                      {r.productos.map((p) => (
                        <tr key={p.descripcion} className="border-t border-gray-100">
                          <td className="py-1 pr-2 text-gray-700">{p.descripcion}</td>
                          <td className="py-1 text-right text-xs text-gray-500 whitespace-nowrap">
                            {p.solicitudes} sol. · {p.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>

              {/* Detalle */}
              <section className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-verde">Detalle ({reporte!.filas.length})</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">N.º</th>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Área</th>
                      <th className="text-left px-3 py-2">Solicitante</th>
                      <th className="text-left px-3 py-2">OT / PI</th>
                      <th className="text-left px-3 py-2">Ítems</th>
                      <th className="text-left px-3 py-2">Prioridad</th>
                      <th className="text-left px-3 py-2">Etapa</th>
                      <th className="text-right px-3 py-2">Días</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reporte!.filas.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2">
                          <Link href={`/solicitudes/${s.id}`} className="text-verde hover:underline">
                            {s.numero}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtFecha(s.fecha)}</td>
                        <td className="px-3 py-2">{AREA_LABEL[s.area] || s.area}</td>
                        <td className="px-3 py-2">{s.solicitante || "—"}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[14rem] truncate" title={s.proyecto || ""}>
                          {s.proyecto || "Abastecimiento"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {s.items.length}
                          {s.items.some((it) => it.atendida > 0) && s.items.some((it) => it.pendiente > 0) && (
                            <span className="block text-[11px] text-lime-800">
                              {s.items.filter((it) => it.pendiente > 0).length} pendiente(s)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{PRIORIDAD_LABEL[s.prioridad] || s.prioridad}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_ESTILO[s.estado] || "bg-gray-100"}`}>
                            {ESTADO_LABEL[s.estado] || s.estado}
                          </span>
                          {s.ordenes && <span className="block text-xs text-gray-400 mt-0.5">{s.ordenes}</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{s.diasAtencion ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
