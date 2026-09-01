"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CerrarSesionBoton() {
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={cerrarSesion} className="hover:text-verde underline underline-offset-2">
      Cerrar sesión
    </button>
  );
}