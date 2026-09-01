import { createClient } from "@/lib/supabase/server";
import NuevaOrdenForm from "@/components/NuevaOrdenForm";

export default async function NuevaOrdenPage() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social, ruc")
    .eq("activo", true)
    .order("razon_social", { ascending: true });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Nueva orden de compra</h1>
      <NuevaOrdenForm proveedores={proveedores || []} />
    </div>
  );
}