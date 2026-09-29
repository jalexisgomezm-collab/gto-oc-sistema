import NuevaSolicitudForm from "@/components/NuevaSolicitudForm";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/perfil";

export default async function NuevaSolicitudPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const perfil = await obtenerPerfil(supabase);
  const nombre = (user?.user_metadata as any)?.nombre_completo || perfil?.nombre_completo || "";
  const areaFija = perfil && !perfil.es_compras ? perfil.area : null;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Nueva solicitud de pedido</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Describe lo que necesitas. El área de compras consultará a los proveedores, comparará las cotizaciones y emitirá la
        orden de compra o de servicio. Podrás ver en qué etapa va tu pedido desde <b>Solicitudes</b>.
      </p>
      <NuevaSolicitudForm areaFija={areaFija} nombreInicial={perfil?.es_compras ? "" : nombre} />
    </div>
  );
}
