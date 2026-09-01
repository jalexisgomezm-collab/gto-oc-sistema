import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProveedorForm from "@/components/ProveedorForm";

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: proveedor } = await supabase.from("proveedores").select("*").eq("id", id).single();
  if (!proveedor) notFound();

  const { data: cuentas } = await supabase.from("cuentas_bancarias").select("banco, cuenta, cci").eq("proveedor_id", id);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Editar proveedor</h1>
      <ProveedorForm
        proveedorId={id}
        inicial={{
          razon_social: proveedor.razon_social || "",
          ruc: proveedor.ruc || "",
          contacto: proveedor.contacto || "",
          telefono: proveedor.telefono || "",
          email: proveedor.email || "",
          direccion: proveedor.direccion || "",
          codigo_proveedor: proveedor.codigo_proveedor || "",
          detraccion: proveedor.detraccion || "",
          activo: proveedor.activo,
          cuentas_bancarias: cuentas || []
        }}
      />
    </div>
  );
}