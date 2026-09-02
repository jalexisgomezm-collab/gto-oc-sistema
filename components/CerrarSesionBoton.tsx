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
    <button
      onClick={cerrarSesion}
      className="w-full border border-gray-300 rounded-md text-sm text-gray-600 py-2 hover:bg-gray-50"
    >
      Cerrar sesión
    </button>
  );
}
