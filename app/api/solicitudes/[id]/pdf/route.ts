import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { generarSolicitudPdf } from "@/lib/pdf/generarSolicitudPdf";
import { AREA_LABEL, ESTADO_LABEL, PRIORIDAD_LABEL, TIPO_ORDEN_CORTO, VIA_LABEL } from "@/lib/solicitudes";
import { fechaHoraLima } from "@/lib/fechas";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // RLS: cada usuario solo obtiene las solicitudes que puede ver
  const { data: sol } = await supabase
    .from("solicitudes_pedido")
    .select("*, proyectos(nombre, cliente, numero_orden_trabajo, numero_oc_cliente), solicitud_items(*, solicitud_item_adjuntos(id))")
    .eq("id", id)
    .single();
  if (!sol) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const perfil = await obtenerPerfil(supabase);
  const nombre = (user.user_metadata as any)?.nombre_completo || perfil?.nombre_completo || user.email || "";
  const p = sol.proyectos;
  const [a, m, d] = String(sol.fecha_solicitud || "").split("-");

  const pdf = await generarSolicitudPdf({
    numero: sol.numero,
    area: AREA_LABEL[sol.area] || sol.area,
    solicitante: sol.solicitante || "",
    fecha: d ? `${d}/${m}/${a}` : "",
    prioridad: PRIORIDAD_LABEL[sol.prioridad] || sol.prioridad,
    estado: ESTADO_LABEL[sol.estado] || sol.estado,
    proyecto: p ? [p.numero_orden_trabajo, p.nombre].filter(Boolean).join(" · ") : "Abastecimiento general",
    cliente: p?.cliente || null,
    ocCliente: p?.numero_oc_cliente || null,
    referenciaOrden: sol.orden_numero
      ? `${TIPO_ORDEN_CORTO[sol.orden_tipo] || "OC"} N° ${sol.orden_numero}`
      : sol.via_atencion && sol.via_atencion !== "NORMAL"
      ? VIA_LABEL[sol.via_atencion]
      : null,
    observaciones: sol.observaciones,
    generadoPor: nombre,
    generadoEl: fechaHoraLima(new Date()),
    items: (sol.solicitud_items || [])
      .sort((x: any, y: any) => x.posicion - y.posicion)
      .map((it: any) => ({
        cantidad: Number(it.cantidad),
        um: it.um || "UND",
        descripcion: it.descripcion,
        observacion: it.observacion,
        tieneReferencia: (it.solicitud_item_adjuntos || []).length > 0
      }))
  });

  const inline = new URL(req.url).searchParams.get("descargar") !== "1";
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="SOLPED_${String(sol.numero).padStart(6, "0")}.pdf"`
    }
  });
}
