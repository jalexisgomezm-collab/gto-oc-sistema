import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, razon_social, ruc, contacto, telefono, activo")
    .order("razon_social", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Proveedores</h1>
        <Link href="/proveedores/nuevo" className="bg-verde text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-verde-oscuro">
          + Nuevo proveedor
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Razón social</th>
              <th className="text-left px-4 py-2">RUC</th>
              <th className="text-left px-4 py-2">Contacto</th>
              <th className="text-left px-4 py-2">Teléfono</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(proveedores || []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.razon_social}</td>
                <td className="px-4 py-2 text-gray-600">{p.ruc}</td>
                <td className="px-4 py-2 text-gray-600">{p.contacto}</td>
                <td className="px-4 py-2 text-gray-600">{p.telefono}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? "bg-verde-claro text-verde-oscuro" : "bg-gray-100 text-gray-500"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/proveedores/${p.id}`} className="text-verde hover:underline text-sm">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(!proveedores || proveedores.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aún no hay proveedores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
