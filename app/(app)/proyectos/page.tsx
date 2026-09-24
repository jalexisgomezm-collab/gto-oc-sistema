import { createClient } from "@/lib/supabase/server";
import ProyectosLista from "@/components/ProyectosLista";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, nombre, tipo, cliente, numero_oc_cliente, numero_orden_trabajo, estado")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Proyectos y órdenes de trabajo</h1>
      <ProyectosLista proyectos={proyectos || []} />
    </div>
  );
}
