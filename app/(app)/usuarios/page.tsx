import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";
import UsuariosLista from "@/components/UsuariosLista";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const perfil = await obtenerPerfil(supabase);
  if (!perfil?.es_compras) redirect("/solicitudes");

  const { data: usuarios, error } = await supabase.rpc("listar_usuarios");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Usuarios y accesos</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Los usuarios nuevos entran como <b>Solicitante de área</b>: solo pueden crear requerimientos y ver el seguimiento de
        las solicitudes de su área. Asigna el área de cada persona. El rol <b>Compras</b> tiene acceso a todo el sistema
        (órdenes, proveedores, cotizaciones, Maestro de Gestión).
      </p>
      {error && <p className="text-sm text-red-600 mb-4">No se pudo cargar la lista: {error.message}</p>}
      <UsuariosLista usuarios={(usuarios as any[]) || []} miId={perfil.id} />
    </div>
  );
}
