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
    .select("*, solicitud_items(*, solicitud_item_adjuntos(*))")
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
    </div>
  );
}
