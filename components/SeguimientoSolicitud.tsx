"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fechaHoraLima } from "@/lib/fechas";
import { etapasPara, ESTADOS_ESPECIALES, ESTADO_LABEL, ESTADO_ESTILO } from "@/lib/solicitudes";

export interface EventoSeguimiento {
  id: string;
  estado: string | null;
  comentario: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

const fechaHora = (v: string) => fechaHoraLima(v);

export default function SeguimientoSolicitud({
  solicitudId,
  estado,
  historial,
  esCompras,
  via = null
}: {
  solicitudId: string;
  estado: string;
  historial: EventoSeguimiento[];
  esCompras: boolean;
  via?: string | null;
}) {
  const ETAPAS = etapasPara(via);
  const router = useRouter();
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En "observada" o "anulada" la barra muestra la última etapa normal alcanzada
  let etapaActual = ETAPAS.findIndex((e) => e.value === estado);
  if (etapaActual < 0) {
    const ultima = [...historial].reverse().find((h) => h.estado && ETAPAS.some((e) => e.value === h.estado));
    etapaActual = ultima ? ETAPAS.findIndex((e) => e.value === ultima.estado) : 0;
  }
  const especial = ESTADOS_ESPECIALES.find((e) => e.value === estado);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nuevoEstado && !comentario.trim()) {
      setError(esCompras ? "Elige una etapa o escribe un comentario" : "Escribe tu comentario");
      return;
    }
    if ((nuevoEstado === "observada" || nuevoEstado === "anulada") && !comentario.trim()) {
      setError("Explica el motivo en el comentario");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("registrar_seguimiento", {
      p_solicitud: solicitudId,
      p_estado: nuevoEstado || null,
      p_comentario: comentario.trim() || null
    });
    setEnviando(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNuevoEstado("");
    setComentario("");
    router.refresh();
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-verde">Seguimiento</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_ESTILO[estado] || "bg-gray-100 text-gray-500"}`}>
          {ESTADO_LABEL[estado] || estado}
        </span>
      </div>

      <ol className="grid gap-1 mb-4" style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(0, 1fr))` }}>
        {ETAPAS.map((e, i) => {
          const hecho = i < etapaActual || (i === etapaActual && estado === "atendida");
          const actual = i === etapaActual && !especial && estado !== "atendida";
          return (
            <li key={e.value} className="text-center" title={e.ayuda}>
              <div
                className={`h-1.5 rounded-full mb-2 ${
                  hecho || actual ? (especial?.value === "anulada" ? "bg-gray-300" : "bg-verde") : "bg-gray-200"
                }`}
              />
              <div
                className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mb-1 ${
                  hecho ? "bg-verde text-white" : actual ? "border-2 border-verde text-verde bg-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {hecho ? "✓" : i + 1}
              </div>
              <p className={`text-[11px] leading-tight ${actual ? "text-verde font-semibold" : hecho ? "text-gray-700" : "text-gray-400"}`}>
                {e.label}
              </p>
            </li>
          );
        })}
      </ol>

      {especial ? (
        <p
          className={`text-xs rounded-md px-3 py-2 mb-4 ${
            especial.value === "anulada" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
          }`}
        >
          <b>{especial.label}:</b> {especial.ayuda}
          {especial.value === "observada" && !esCompras && " Responde con un comentario abajo."}
        </p>
      ) : (
        <p className="text-xs text-gray-500 mb-4">{ETAPAS[etapaActual]?.ayuda}</p>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-600 mb-2">Historial</p>
        <ul className="space-y-3 mb-4">
          {historial.map((h) => (
            <li key={h.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-verde shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  {fechaHora(h.created_at)}
                  {h.usuario_nombre ? ` · ${h.usuario_nombre}` : ""}
                </p>
                {h.estado && (
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full mt-0.5 ${ESTADO_ESTILO[h.estado] || "bg-gray-100"}`}>
                    {ESTADO_LABEL[h.estado] || h.estado}
                  </span>
                )}
                {h.comentario && <p className="text-gray-700 whitespace-pre-line mt-0.5">{h.comentario}</p>}
              </div>
            </li>
          ))}
          {historial.length === 0 && <li className="text-xs text-gray-400">Sin movimientos todavía.</li>}
        </ul>

        {estado !== "anulada" && (
          <form onSubmit={enviar} className="space-y-2">
            {esCompras && (
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Solo comentar (sin cambiar etapa)</option>
                {[...ETAPAS, ...ESTADOS_ESPECIALES]
                  .filter((e) => e.value !== estado)
                  .map((e) => (
                    <option key={e.value} value={e.value}>
                      Cambiar a: {e.label}
                    </option>
                  ))}
              </select>
            )}
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder={
                esCompras
                  ? "Ej: Se consultó a 3 proveedores, esperando respuesta..."
                  : "Escribe una consulta o respuesta para el área de compras..."
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
            >
              {enviando ? "Guardando..." : esCompras && nuevoEstado ? "Actualizar etapa" : "Enviar comentario"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
