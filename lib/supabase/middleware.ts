import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseConfig";

/** Rutas que un solicitante de área puede usar (solo requerimientos). */
function permitidoParaSolicitante(path: string, metodo: string) {
  if (path === "/solicitudes" || path.startsWith("/solicitudes/")) return true;
  if (path === "/api/solicitudes" || path.startsWith("/api/solicitudes/")) return true;
  // búsquedas de apoyo del formulario de solicitud (solo lectura)
  if ((path === "/api/proyectos" || path === "/api/productos") && metodo === "GET") return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esAuthPublica = path.startsWith("/login") || path.startsWith("/registro");
  const esRecuperacion = path.startsWith("/reset-password");

  if (!user && !esAuthPublica && !esRecuperacion) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && esAuthPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/ordenes";
    return NextResponse.redirect(url);
  }

  if (user && !esRecuperacion) {
    const { data } = await supabase.rpc("mi_perfil");
    const perfil = Array.isArray(data) ? data[0] : data;
    const esCompras = !!perfil?.es_compras;
    const esMaestro = !!perfil?.es_maestro;
    // Rol "administracion": todo el módulo excepto crear/editar OT y PI (Maestro de Gestión) y Usuarios y accesos
    const bloqueaMaestro =
      esCompras &&
      !esMaestro &&
      (path === "/proyectos" ||
        path.startsWith("/proyectos/") ||
        path === "/usuarios" ||
        path.startsWith("/usuarios/") ||
        (path.startsWith("/api/proyectos") && request.method !== "GET"));
    if (bloqueaMaestro) {
      if (path.startsWith("/api/")) return NextResponse.json({ error: "Tu usuario no tiene acceso a esta sección" }, { status: 403 });
      const url = request.nextUrl.clone();
      url.pathname = "/solicitudes";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (!esCompras && !permitidoParaSolicitante(path, request.method)) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Tu usuario solo tiene acceso a solicitudes de pedido" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/solicitudes";
      url.search = "";
      const redir = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redir.cookies.set(c));
      return redir;
    }
  }

  return response;
}
