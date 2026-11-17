import { createClient } from "@/lib/supabase/server";
import "./logistica.css";
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
    <div className="log-shell">
      <header className="log-header">
        <a className="log-logo" href="https://sistema-integrado-gto.vercel.app" aria-label="Ir al portal GTO"><img src="/logo-gto.png" alt="GTO Electrónica y Eléctrico de Potencia" /></a>
        <div className="log-brand"><small>SISTEMA INTEGRADO GTO</small><strong>Logística y Compras</strong></div>
        <a className="log-portal" href="https://sistema-integrado-gto.vercel.app">Menú GTO ↗</a>
      </header>
      <div className="log-workspace">
      <BarraLateral nombre={nombre} correo={correo} esCompras={esCompras} esMaestro={esMaestro} rolTexto={rolTexto} />
      <div className="log-content">
        <main className="log-main">{children}</main>
      </div>
      </div>
    </div>
  );
}

