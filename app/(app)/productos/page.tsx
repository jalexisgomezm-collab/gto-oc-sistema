import { createClient } from "@/lib/supabase/server";
import ProductosLista from "@/components/ProductosLista";

export default async function ProductosPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: familias }] = await Promise.all([
    supabase.from("catalogo_productos").select("id, descripcion, um, codigo, familia, activo, imagen_url").order("codigo", { ascending: true }),
    supabase.from("catalogo_familias").select("codigo, nombre").order("orden", { ascending: true })
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Catálogo de productos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Cada producto tiene un código automático <span className="font-mono">FAMILIA-0001</span> (ej. FER-0004). La familia se sugiere
        por la descripción y puedes cambiarla; al cambiarla, el producto recibe el siguiente código de la nueva familia.
      </p>
      <ProductosLista productos={productos || []} familias={familias || []} />
    </div>
  );
}
