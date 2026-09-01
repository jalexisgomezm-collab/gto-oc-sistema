import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const numero = req.nextUrl.searchParams.get("numero") || "";

  if (!/^\d{11}$/.test(numero)) {
    return NextResponse.json({ error: "El RUC debe tener 11 dígitos" }, { status: 422 });
  }

  const token = process.env.DECOLECTA_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "La búsqueda por RUC aún no está configurada (falta DECOLECTA_TOKEN)" },
      { status: 501 }
    );
  }

  try {
    const resp = await fetch(`https://api.decolecta.com/v1/sunat/ruc?numero=${numero}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });

    if (resp.status === 422 || resp.status === 404) {
      return NextResponse.json({ error: "RUC no encontrado" }, { status: 404 });
    }
    if (!resp.ok) {
      return NextResponse.json({ error: "No se pudo consultar SUNAT en este momento" }, { status: 502 });
    }

    const data = await resp.json();
    return NextResponse.json({
      razon_social: data.razon_social || "",
      direccion: data.direccion || "",
      estado: data.estado || "",
      condicion: data.condicion || ""
    });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar SUNAT en este momento" }, { status: 502 });
  }
}