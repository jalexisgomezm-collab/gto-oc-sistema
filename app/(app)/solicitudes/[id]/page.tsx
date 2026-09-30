import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { AREA_LABEL, ESTADO_LABEL, ESTADO_ESTILO, PRIORIDAD_ESTILO, PRIORIDAD_LABEL, TIPO_ORDEN_CORTO, estadoItem, type AtencionItem } from "@/lib/solicitudes";
import SeguimientoSolicitud from "@/components/SeguimientoSolicitud";
import CotizacionesSolicitud from "@/components/CotizacionesSolicitud";
import ItemsSolicitud from "@/components/ItemsSolicitud";

const TIPO_LABEL: Record<string, string> = {
  EVALUACION: "Evaluación",
  REPARACION: "Reparación",
  MANTENIMIENTO: "Mantenimiento",
  VENTA: "Venta",
  OTRO: "Otro"
};

export default async function SolicitudDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: solicitud } = await supabase
    .from("solicitudes_pedido")
    .select("*, proyectos(nombre, tipo, cliente, numero_oc_cliente, numero_orden_trabajo), solicitud_items(*, solicitud_item_adjuntos(*))")
    .eq("id", id)
    .single();

  if (!solicitud) notFound();

  const items = (solicitud.solicitud_items || []).sort((a: any, b: any) => a.posicion - b.posicion);
  const proyecto = solicitud.proyectos;

  const perfil = await obtenerPerfil(supabase);
  const esCompras = !!perfil?.es_compras;

  const { data: historial } = await supabase
    .from("solicitud_seguimiento")
    .select("id, estado, comentario, usuario_nombre, created_at")
    .eq("solicitud_id", id)
    .order("created_at", { ascending: true });

  const { data: atencionesData } = await supabase
    .from("solicitud_item_atenciones")
    .select("id, item_id, tipo, cantidad, orden_id, orden_numero, orden_tipo, orden_anulada, proveedor, entregado, entregado_at, comentario, usuario_nombre, created_at")
    .eq("solicitud_id", id)
    .order("created_at", { ascending: true });
  const atenciones = ((atencionesData as any[]) || []) as AtencionItem[];
  const hayPendientes =
    items.length === 0 ||
    items.some((it: any) => estadoItem(Number(it.cantidad), atenciones.filter((a) => a.item_id === it.id)).pendiente > 0);
  // órdenes emitidas para esta solicitud (una por proveedor si se atendió por partes)
  const ordenesMap = new Map<string, { id: string; numero: number | null; tipo: string | null; proveedor: string | null; anulada: boolean }>();
  for (const a of atenciones) {
    if (a.tipo === "ORDEN" && a.orden_id && !ordenesMap.has(a.orden_id)) {
      ordenesMap.set(a.orden_id, { id: a.orden_id, numero: a.orden_numero, tipo: a.orden_tipo, proveedor: a.proveedor, anulada: a.orden_anulada });
    }
  }
  const ordenes = Array.from(ordenesMap.values());

  let cotizaciones: any[] = [];
  let proveedores: any[] = [];
  if (esCompras) {
    const [{ data: cots }, { data: provs }] = await Promise.all([
      supabase.from("solicitud_cotizaciones").select("*").eq("solicitud_id", id).order("created_at", { ascending: true }),
      supabase.from("proveedores").select("id, razon_social, ruc").eq("activo", true).order("razon_social", { ascending: true })
    ]);
    cotizaciones = cots || [];
    proveedores = provs || [];
  }

  // ---- compra menor: registros, límite y aviso de fraccionamiento
  let comprasMenores: any[] = [];
  let limite = 300;
  let avisos: any[] = [];
  let totalAreaMes = 0;
  if (esCompras) {
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [{ data: cms }, { data: conf }, { data: delArea }] = await Promise.all([
      supabase.from("solicitud_compras_menores").select("*").eq("solicitud_id", id).order("created_at", { ascending: true }),
      supabase.from("configuracion").select("valor").eq("clave", "compra_menor_limite").maybeSingle(),
      supabase
        .from("solicitud_compras_menores")
        .select("monto, fecha, solicitud_id, solicitudes_pedido!inner(id, numero, area, solicitud_items(descripcion))")
        .eq("solicitudes_pedido.area", solicitud.area)
        .gte("fecha", hace30)
    ]);
    comprasMenores = cms || [];
    if (conf?.valor) limite = Number(conf.valor) || 300;
    const misDescripciones = new Set(items.map((it: any) => String(it.descripcion).trim().toLowerCase()));
    const porSolicitud: Record<string, any> = {};
    for (const r of (delArea as any[]) || []) {
      totalAreaMes += Number(r.monto);
      if (r.solicitud_id === id) continue;
      const sp = r.solicitudes_pedido;
      const coinc = (sp?.solicitud_items || [])
        .map((x: any) => String(x.descripcion).trim())
        .filter((d: string) => misDescripciones.has(d.toLowerCase()));
      if (coinc.length === 0) continue;
      const a = (porSolicitud[r.solicitud_id] ||= { solicitudId: r.solicitud_id, numero: sp.numero, fecha: r.fecha, monto: 0, coincidencias: coinc });
      a.monto += Number(r.monto);
    }
    avisos = Object.values(porSolicitud);
  }
  const via = solicitud.via_atencion as string | null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Solicitud de pedido N.º {solicitud.numero}</h1>
        <div className="flex items-center gap-4">
          <a
            href={`/api/solicitudes/${solicitud.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro"
          >
            Imprimir / PDF
          </a>
          <Link href="/solicitudes" className="text-sm text-verde hover:underline">
            ← Volver a solicitudes
          </Link>
        </div>
      </div>

      <SeguimientoSolicitud
        solicitudId={solicitud.id}
        estado={solicitud.estado}
        historial={(historial as any[]) || []}
        esCompras={esCompras}
        via={via}
      />

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
            <p className="text-xs text-gray-500 mb-0.5">Prioridad</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORIDAD_ESTILO[solicitud.prioridad] || "bg-gray-100 text-gray-500"}`}>
              {PRIORIDAD_LABEL[solicitud.prioridad] || solicitud.prioridad}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Estado</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_ESTILO[solicitud.estado] || "bg-gray-100 text-gray-500"}`}>
              {ESTADO_LABEL[solicitud.estado] || solicitud.estado}
            </span>
            {ordenes.filter((o) => !o.anulada).length > 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                {ordenes
                  .filter((o) => !o.anulada)
                  .map((o) => `${TIPO_ORDEN_CORTO[o.tipo || "COMPRA"] || "OC"} N° ${o.numero}`)
                  .join(" · ")}
              </p>
            ) : (
              solicitud.orden_numero && (
                <p className="text-xs text-gray-500 mt-1">
                  {TIPO_ORDEN_CORTO[solicitud.orden_tipo] || "OC"} N° {solicitud.orden_numero}
                </p>
              )
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Proyecto / orden de trabajo</p>
            {proyecto ? (
              <p className="font-medium">
                {proyecto.nombre}{" "}
                <span className="text-xs text-gray-400 font-normal">
                  ({TIPO_LABEL[proyecto.tipo] || proyecto.tipo}
                  {proyecto.cliente ? ` · ${proyecto.cliente}` : ""}
                  {proyecto.numero_oc_cliente ? ` · OC ${proyecto.numero_oc_cliente}` : ""}
                  {proyecto.numero_orden_trabajo ? ` · O.T. ${proyecto.numero_orden_trabajo}` : ""})
                </span>
              </p>
            ) : (
              <p className="font-medium text-gray-500">Abastecimiento general</p>
            )}
          </div>
        </div>
        {solicitud.observaciones && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Observaciones</p>
            <p className="text-sm">{solicitud.observaciones}</p>
          </div>
        )}
      </div>

      <ItemsSolicitud
        solicitudId={solicitud.id}
        estado={solicitud.estado}
        esCompras={esCompras}
        items={items}
        atenciones={atenciones}
        limite={limite}
        compras={comprasMenores}
        avisos={avisos}
        totalAreaMes={totalAreaMes}
      />

      {esCompras && (cotizaciones.length > 0 || (hayPendientes && solicitud.estado !== "anulada")) && (
        <div className="mt-6">
          <CotizacionesSolicitud
            solicitudId={solicitud.id}
            estado={solicitud.estado}
            cotizaciones={cotizaciones}
            proveedores={proveedores}
            justificacion={solicitud.justificacion_eleccion}
            motivoExcepcion={solicitud.motivo_excepcion}
            ordenes={ordenes}
            hayPendientes={hayPendientes}
          />
        </div>
      )}
    </div>
  );
}
