import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; formato: string }> }) {
  const { id, formato } = await params;
  if (formato !== "docx" && formato !== "pdf") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: orden } = await supabase.from("ordenes_compra").select("archivo_docx_url, archivo_pdf_url, numero").eq("id", id).single();
  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const objectPath = formato === "docx" ? orden.archivo_docx_url : orden.archivo_pdf_url;
  if (!objectPath) return NextResponse.json({ error: "El archivo aún no está disponible" }, { status: 404 });

  const { data: blob, error } = await supabase.storage.from("documentos-oc").download(objectPath);
  if (error || !blob) return NextResponse.json({ error: "No se pudo descargar el archivo" }, { status: 500 });

  const buf = Buffer.from(await blob.arrayBuffer());
  const filename = objectPath.split("/").pop() || `OC_${orden.numero}.${formato}`;
  const contentType = formato === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";

  return new NextResponse(buf, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
