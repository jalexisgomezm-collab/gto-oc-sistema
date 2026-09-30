import { createClient } from "@/lib/supabase/server";
import BarraLateral from "@/components/BarraLateral";
import { obtenerPerfil, ROL_LABEL } from "@/lib/perfil";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const perfil = await obtenerPerfil(supabase);

  const nombre = (user?.user_metadata as any)?.nombre_completo || perfil?.nombre_completo || "";
  const correo = user?.email || "";
  const esCompras = !!perfil?.es_compras;
  const esMaestro = !!perfil?.es_maestro;
  const rolTexto = ROL_LABEL[perfil?.rol || "solicitante"] || "Usuario";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <BarraLateral nombre={nombre} correo={correo} esCompras={esCompras} esMaestro={esMaestro} rolTexto={rolTexto} />
      <div className="flex-1 min-w-0">
        <main className="max-w-5xl mx-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
