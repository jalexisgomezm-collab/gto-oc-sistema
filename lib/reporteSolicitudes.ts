import { AREAS } from "@/lib/solicitudes";

export interface FiltrosReporte {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  area: string; // "" = todas
  estado: string; // "" = todos | "en_proceso" | valor de estado
  prioridad: string;
  via: string; // "" | NORMAL | COMPRA_MENOR | ALMACEN | SIN_DEFINIR
}

export const EN_PROCESO = ["pendiente", "en_consulta", "en_cotizacion", "proveedor_elegido", "convertida", "compra_menor"];

const hoyLima = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // YYYY-MM-DD
};

const valida = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function leerFiltros(sp: Record<string, string | undefined>): FiltrosReporte {
  const hoy = hoyLima();
  const inicioMes = hoy.slice(0, 8) + "01";
  return {
    desde: valida(sp.desde) || inicioMes,
    hasta: valida(sp.hasta) || hoy,
    area: AREAS.some((a) => a.value === sp.area) ? (sp.area as string) : "",
    estado: sp.estado || "",
    prioridad: ["ALTA", "MEDIA", "BAJA"].includes(sp.prioridad || "") ? (sp.prioridad as string) : "",
    via: ["NORMAL", "COMPRA_MENOR", "ALMACEN", "SIN_DEFINIR"].includes(sp.via || "") ? (sp.via as string) : ""
  };
}

/** Rangos rápidos para los botones del filtro. */
export function periodosRapidos() {
  const hoy = hoyLima();
  const [a, m] = hoy.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ultimoDia = (y: number, mm: number) => new Date(Date.UTC(y, mm, 0)).getUTCDate();
  const mesAnt = m === 1 ? { y: a - 1, m: 12 } : { y: a, m: m - 1 };
  const q = Math.floor((m - 1) / 3);
  return [
    { label: "Este mes", desde: `${a}-${pad(m)}-01`, hasta: hoy },
    { label: "Mes anterior", desde: `${mesAnt.y}-${pad(mesAnt.m)}-01`, hasta: `${mesAnt.y}-${pad(mesAnt.m)}-${ultimoDia(mesAnt.y, mesAnt.m)}` },
    { label: "Este trimestre", desde: `${a}-${pad(q * 3 + 1)}-01`, hasta: hoy },
    { label: "Últimos 90 días", desde: new Date(Date.parse(hoy) - 89 * 86400000).toISOString().slice(0, 10), hasta: hoy },
    { label: "Este año", desde: `${a}-01-01`, hasta: hoy }
  ];
}

export interface FilaReporte {
  id: string;
  numero: number;
  area: string;
  solicitante: string | null;
  fecha: string;
  estado: string;
  prioridad: string;
  via: string | null;
  ordenNumero: number | null;
  ordenTipo: string | null;
  proyecto: string | null;
  proyectoClase: string | null;
  items: { descripcion: string; cantidad: number; um: string }[];
  diasAtencion: number | null;
}

export async function obtenerReporte(supabase: any, f: FiltrosReporte) {
  let q = supabase
    .from("solicitudes_pedido")
    .select(
      "id, numero, area, solicitante, fecha_solicitud, estado, prioridad, via_atencion, orden_numero, orden_tipo, created_at, proyectos(numero_orden_trabajo, nombre, clase), solicitud_items(descripcion, cantidad, um)"
    )
    .gte("fecha_solicitud", f.desde)
    .lte("fecha_solicitud", f.hasta)
    .order("numero", { ascending: false })
    .range(0, 4999);
  if (f.area) q = q.eq("area", f.area);
  if (f.prioridad) q = q.eq("prioridad", f.prioridad);
  if (f.estado === "en_proceso") q = q.in("estado", EN_PROCESO);
  else if (f.estado) q = q.eq("estado", f.estado);
  if (f.via === "SIN_DEFINIR") q = q.is("via_atencion", null);
  else if (f.via) q = q.eq("via_atencion", f.via);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const sols = (data as any[]) || [];

  // fecha en que cada solicitud quedó atendida (primer registro "atendida" del historial)
  const atendidaEn: Record<string, string> = {};
  const ids = sols.filter((s) => s.estado === "atendida").map((s) => s.id);
  for (let i = 0; i < ids.length; i += 150) {
    const { data: seg } = await supabase
      .from("solicitud_seguimiento")
      .select("solicitud_id, created_at")
      .in("solicitud_id", ids.slice(i, i + 150))
      .eq("estado", "atendida")
      .order("created_at", { ascending: true });
    for (const r of (seg as any[]) || []) if (!atendidaEn[r.solicitud_id]) atendidaEn[r.solicitud_id] = r.created_at;
  }

  const filas: FilaReporte[] = sols.map((s) => {
    const fin = atendidaEn[s.id];
    const dias = fin ? Math.max(0, (Date.parse(fin) - Date.parse(s.created_at)) / 86400000) : null;
    return {
      id: s.id,
      numero: s.numero,
      area: s.area,
      solicitante: s.solicitante,
      fecha: s.fecha_solicitud,
      estado: s.estado,
      prioridad: s.prioridad,
      via: s.via_atencion,
      ordenNumero: s.orden_numero,
      ordenTipo: s.orden_tipo,
      proyecto: s.proyectos ? [s.proyectos.numero_orden_trabajo, s.proyectos.nombre].filter(Boolean).join(" · ") : null,
      proyectoClase: s.proyectos?.clase || null,
      items: (s.solicitud_items || []).map((it: any) => ({ descripcion: it.descripcion, cantidad: Number(it.cantidad), um: it.um || "UND" })),
      diasAtencion: dias === null ? null : Math.round(dias * 10) / 10
    };
  });

  return { filas, resumen: resumir(filas) };
}

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

function resumir(filas: FilaReporte[]) {
  const cuenta = (fs: FilaReporte[]) => ({
    total: fs.length,
    atendidas: fs.filter((f) => f.estado === "atendida").length,
    enProceso: fs.filter((f) => EN_PROCESO.includes(f.estado)).length,
    observadas: fs.filter((f) => f.estado === "observada").length,
    anuladas: fs.filter((f) => f.estado === "anulada").length,
    diasPromedio: promedio(fs.map((f) => f.diasAtencion).filter((d): d is number => d !== null))
  });

  const general = cuenta(filas);
  const porArea = AREAS.map((a) => ({ area: a.value, label: a.label, ...cuenta(filas.filter((f) => f.area === a.value)) })).filter(
    (x) => x.total > 0
  );

  const meses: Record<string, FilaReporte[]> = {};
  for (const f of filas) (meses[f.fecha.slice(0, 7)] ||= []).push(f);
  const porMes = Object.keys(meses)
    .sort()
    .map((m) => ({ mes: m, ...cuenta(meses[m]) }));

  const proy: Record<string, FilaReporte[]> = {};
  for (const f of filas) (proy[f.proyecto || "Abastecimiento general"] ||= []).push(f);
  const porProyecto = Object.entries(proy)
    .map(([nombre, fs]) => ({ nombre, ...cuenta(fs) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const vias: Record<string, number> = { NORMAL: 0, COMPRA_MENOR: 0, ALMACEN: 0, SIN_DEFINIR: 0 };
  for (const f of filas) vias[f.via || "SIN_DEFINIR"] = (vias[f.via || "SIN_DEFINIR"] || 0) + 1;

  const prod: Record<string, { descripcion: string; solicitudes: Set<string>; cantidades: Record<string, number> }> = {};
  for (const f of filas) {
    if (f.estado === "anulada") continue;
    for (const it of f.items) {
      const k = it.descripcion.trim().toUpperCase();
      prod[k] ||= { descripcion: it.descripcion.trim(), solicitudes: new Set(), cantidades: {} };
      prod[k].solicitudes.add(f.id);
      prod[k].cantidades[it.um] = (prod[k].cantidades[it.um] || 0) + it.cantidad;
    }
  }
  const productos = Object.values(prod)
    .map((p) => ({
      descripcion: p.descripcion,
      solicitudes: p.solicitudes.size,
      cantidad: Object.entries(p.cantidades)
        .map(([um, c]) => `${Math.round(c * 100) / 100} ${um}`)
        .join(" + ")
    }))
    .sort((a, b) => b.solicitudes - a.solicitudes)
    .slice(0, 12);

  return { general, porArea, porMes, porProyecto, vias, productos };
}
