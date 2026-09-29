import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { AREA_LABEL, ESTADO_LABEL, ESTADO_ESTILO, PRIORIDAD_ESTILO, PRIORIDAD_LABEL, TIPO_ORDEN_LABEL } from "@/lib/solicitudes";
import SeguimientoSolicitud from "@/components/SeguimientoSolicitud";
import CotizacionesSolicitud from "@/components/CotizacionesSolicitud";
import AtencionSolicitud from "@/components/AtencionSolicitud";

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

      {esCompras && (
        <AtencionSolicitud
          solicitudId={solicitud.id}
          estado={solicitud.estado}
          via={via}
          tieneCotizaciones={cotizaciones.length > 0}
          tieneOrden={!!solicitud.orden_id}
          limite={limite}
          compras={comprasMenores}
          avisos={avisos}
          totalAreaMes={totalAreaMes}
        />
      )}

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
            {solicitud.orden_numero && (
              <p className="text-xs text-gray-500 mt-1">
                {TIPO_ORDEN_LABEL[solicitud.orden_tipo] || "Orden de compra"} N° {solicitud.orden_numero}
              </p>
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

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Productos solicitados</h2>
      <div className="space-y-3">
        {items.map((it: any, idx: number) => {
          const adjuntos = it.solicitud_item_adjuntos || [];
          return (
            <div key={it.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {idx + 1}. {it.descripcion}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cantidad: {it.cantidad} {it.um}
                    {it.observacion ? ` · ${it.observacion}` : ""}
                  </p>
                </div>
              </div>
              {adjuntos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {adjuntos.map((a: any) =>
                    a.tipo === "imagen" ? (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                        <img src={a.url} alt={a.nombre || ""} className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                      </a>
                    ) : (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-verde hover:underline bg-verde-claro px-2 py-1 rounded-md max-w-xs truncate"
                      >
                        {a.nombre || a.url}
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
            Esta solicitud no tiene ítems.
          </div>
        )}
      </div>

      {esCompras && via !== "COMPRA_MENOR" && via !== "ALMACEN" && (
        <div className="mt-6">
          <CotizacionesSolicitud
            solicitudId={solicitud.id}
            estado={solicitud.estado}
            cotizaciones={cotizaciones}
            proveedores={proveedores}
            justificacion={solicitud.justificacion_eleccion}
            motivoExcepcion={solicitud.motivo_excepcion}
            ordenId={solicitud.orden_id}
            ordenNumero={solicitud.orden_numero}
            ordenTipo={solicitud.orden_tipo}
          />
        </div>
      )}
    </div>
  );
}
