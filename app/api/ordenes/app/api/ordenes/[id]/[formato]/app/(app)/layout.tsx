import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-verde">GTO · Órdenes de Compra</span>
            <nav className="flex gap-5 text-sm text-gray-600">
              <Link href="/ordenes" className="hover:text-verde">
                Órdenes
              </Link>
              <Link href="/ordenes/nueva" className="hover:text-verde">
                Nueva orden
              </Link>
              <Link href="/proveedores" className="hover:text-verde">
                Proveedores
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{user?.email}</span>
            <CerrarSesionBoton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}