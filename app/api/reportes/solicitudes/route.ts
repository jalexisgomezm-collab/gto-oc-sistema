import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import { leerFiltros, obtenerReporte } from "@/lib/reporteSolicitudes";
import { AREA_LABEL, ESTADO_LABEL, PRIORIDAD_LABEL, TIPO_ORDEN_CORTO, VIA_LABEL } from "@/lib/solicitudes";

export const runtime = "nodejs";

/** Celda CSV para Excel en español (separador ";" y comillas cuando hace falta). */
const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
const fecha = (f: string) => f.split("-").reverse().join("/");

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const perfil = await obtenerPerfil(supabase);
  if (!perfil?.es_compras) return NextResponse.json({ error: "Solo Compras y Administración" }, { status: 403 });

  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const f = leerFiltros(sp);
  const { filas } = await obtenerReporte(supabase, f);

  const lineas: string[] = [];
  lineas.push(["Reporte de solicitudes de pedido", `Del ${fecha(f.desde)} al ${fecha(f.hasta)}`].map(celda).join(";"));
  lineas.push(
    [
      f.area ? `Área: ${AREA_LABEL[f.area]}` : "Área: todas",
      f.estado ? `Etapa: ${f.estado === "en_proceso" ? "En proceso" : ESTADO_LABEL[f.estado] || f.estado}` : "Etapa: todas",
      f.prioridad ? `Prioridad: ${PRIORIDAD_LABEL[f.prioridad]}` : "Prioridad: todas",
      f.via ? `Atención: ${f.via === "SIN_DEFINIR" ? "Sin definir" : VIA_LABEL[f.via]}` : "Atención: todas"
    ]
      .map(celda)
      .join(";")
  );
  lineas.push("");
  lineas.push(
    [
      "N.º solicitud",
      "Fecha",
      "Área",
      "Solicitante",
      "OT / PI",
      "Tipo de trabajo",
      "Prioridad",
      "Etapa",
      "Forma de atención",
      "Orden",
      "Días de atención",
      "N.º ítem",
      "Producto",
      "Cantidad",
      "U.M.",
      "Estado del ítem",
      "Cant. atendida",
      "Cant. pendiente",
      "Atendido con"
    ]
      .map(celda)
      .join(";")
  );
  for (const s of filas) {
    const base = [
      s.numero,
      fecha(s.fecha),
      AREA_LABEL[s.area] || s.area,
      s.solicitante || "",
      s.proyecto || "Abastecimiento general",
      s.proyectoClase === "INTERNO" ? "Proyecto interno" : s.proyecto ? "Servicio a cliente (OT)" : "Abastecimiento",
      PRIORIDAD_LABEL[s.prioridad] || s.prioridad,
      ESTADO_LABEL[s.estado] || s.estado,
      s.via ? VIA_LABEL[s.via] : "Sin definir",
      s.ordenes,
      num(s.diasAtencion)
    ];
    const items = s.items.length ? s.items : [{ descripcion: "", cantidad: NaN, um: "", estado: "", atendida: NaN, pendiente: NaN, atendidoCon: "" }];
    items.forEach((it, i) => {
      lineas.push(
        [
          ...base,
          i + 1,
          it.descripcion,
          isNaN(it.cantidad) ? "" : num(it.cantidad),
          it.um,
          it.estado,
          isNaN(it.atendida) ? "" : num(it.atendida),
          isNaN(it.pendiente) ? "" : num(it.pendiente),
          it.atendidoCon
        ]
          .map(celda)
          .join(";")
      );
    });
  }

  const csv = "﻿" + lineas.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Reporte_solicitudes_${f.desde}_al_${f.hasta}.csv"`
    }
  });
}
