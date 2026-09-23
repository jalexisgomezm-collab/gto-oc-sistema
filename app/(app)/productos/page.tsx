import { createClient } from "@/lib/supabase/server";
import ProductosLista from "@/components/ProductosLista";

export default async function ProductosPage() {
  const supabase = await createClient();
  const { data: productos } = await supabase
    .from("catalogo_productos")
    .select("id, descripcion, um, codigo, activo")
    .order("descripcion", { ascending: true });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Catálogo de productos</h1>
      <ProductosLista productos={productos || []} />
    </div>
  );
}
