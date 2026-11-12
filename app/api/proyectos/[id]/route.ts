import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Desde la separación (11/2026) las OT/proyectos son un espejo de solo lectura del Maestro.
export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: "Las OT y proyectos ahora se crean y editan en el Maestro de Operaciones. Aquí solo se eligen." },
    { status: 403 }
  );
}
