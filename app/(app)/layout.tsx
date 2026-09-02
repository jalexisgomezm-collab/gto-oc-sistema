import { createClient } from "@/lib/supabase/server";
import BarraLateral from "@/components/BarraLateral";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const nombre = (user?.user_metadata as any)?.nombre_completo || "";
  const correo = user?.email || "";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <BarraLateral nombre={nombre} correo={correo} />
      <div className="flex-1 min-w-0">
        <main className="max-w-5xl mx-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
