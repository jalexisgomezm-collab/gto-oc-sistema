import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { generarSolicitudPdf } from "@/lib/pdf/generarSolicitudPdf";
import { AREA_LABEL, ESTADO_LABEL, PRIORIDAD_LABEL, TIPO_ORDEN_CORTO, VIA_LABEL } from "@/lib/solicitudes";
import { fechaHoraLima } from "@/lib/fechas";

export const runtime = "nodejs";

const MAX_FOTOS = 6; // por ítem
const MAX_BYTES = 6 * 1024 * 1024;

/** Descarga una foto de referencia (bucket público "adjuntos"). Solo PNG/JPG; otros formatos se omiten. */
async function descargarImagen(url: string, nombre: string | null) {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    const esPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const esJpg = buf[0] === 0xff && buf[1] === 0xd8;
    if (!esPng && !esJpg) return null;
    return { data: buf, format: (esPng ? "png" : "jpg") as "png" | "jpg", nombre: nombre || "foto" };
  } catch {
    return null;
  }
}

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
    .select("*, proyectos(nombre, cliente, numero_orden_trabajo, numero_oc_cliente), solicitud_items(*, solicitud_item_adjuntos(tipo, url, nombre, created_at))")
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
    items: await Promise.all(
      (sol.solicitud_items || [])
        .sort((x: any, y: any) => x.posicion - y.posicion)
        .map(async (it: any) => {
          const adj = (it.solicitud_item_adjuntos || []) as any[];
          const imagenes = adj.filter((a) => a.tipo === "imagen");
          const descargadas = await Promise.all(imagenes.slice(0, MAX_FOTOS).map((a) => descargarImagen(a.url, a.nombre)));
          const fotos = descargadas.filter(Boolean) as { data: Buffer; format: "png" | "jpg"; nombre: string }[];
          return {
            cantidad: Number(it.cantidad),
            um: it.um || "UND",
            descripcion: it.descripcion,
            observacion: it.observacion,
            fotos,
            fotosNoMostradas: imagenes.length - fotos.length,
            enlaces: adj.filter((a) => a.tipo === "enlace" && /^https?:\/\//i.test(a.url)).map((a) => ({ url: a.url, nombre: a.nombre || a.url }))
          };
        })
    )
  });

  const inline = new URL(req.url).searchParams.get("descargar") !== "1";
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="SOLPED_${String(sol.numero).padStart(6, "0")}.pdf"`
    }
  });
}
