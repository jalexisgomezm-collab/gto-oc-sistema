"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createClient as createClienteSimple } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseConfig";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/ordenes");
        router.refresh();
      } else if (modo === "registro") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre_completo: nombre } }
        });
        if (error) throw error;
        setAviso("Cuenta creada. Si tu correo requiere confirmación, revisa tu bandeja de entrada antes de iniciar sesión.");
        setModo("login");
      } else {
        // Flujo "implicit": el enlace del correo funciona desde cualquier navegador o celular
        const clienteRecuperacion = createClienteSimple(
          process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
          { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        );
        const { error } = await clienteRecuperacion.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        setAviso("Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setCargando(false);
    }
  }

  const GTO_MENU = "https://sistema-integrado-gto.vercel.app";
  const cambiar = (m: "login" | "registro" | "recuperar") => {
    setModo(m);
    setError(null);
    setAviso(null);
  };

  return (
    <div className="gto">
      <div className="gto-login" style={{ minHeight: "100vh" }}>
<aside className="gto-sector-panel" aria-label="GTO Perú · Minería, industria y ferrovías">
  <div className="gto-logo-placa"><img src="https://sistema-integrado-gto.vercel.app/assets/logo-gto.png" alt="GTO Electrónica y Eléctrico de Potencia" /></div>
  <h1 className="gto-sector-title">SISTEMA INTEGRADO<br />GTO <span>PERÚ</span></h1>
  <div className="gto-sectores"><div className="gto-sector gto-sector--mina"><span>MINERÍA</span></div><div className="gto-sector gto-sector--industria"><span>INDUSTRIA</span></div><div className="gto-sector gto-sector--ferrea"><span>FERROVÍAS</span></div></div>
</aside>
        <div className="form">
          <form onSubmit={handleSubmit} className="caja">
            <div className="marca">
              <img src={`${GTO_MENU}/assets/icono-compras.png`} alt="" />
              <div>
                <small>Sistema Integrado GTO</small>
                <h2>Logística y Compras</h2>
              </div>
            </div>

            {error && (
              <div className="gto-aviso gto-aviso--error" role="alert">
                <span className="i">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </span>
                <div>
                  <b>No se pudo continuar</b>
                  <p>{error === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error}</p>
                </div>
              </div>
            )}
            {aviso && (
              <div className="gto-aviso gto-aviso--exito" role="status">
                <span className="i">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
                </span>
                <div><p>{aviso}</p></div>
              </div>
            )}

            {modo === "registro" && (
              <div className="gto-campo">
                <label htmlFor="l-nombre">Nombre completo <span className="req">*</span></label>
                <input id="l-nombre" className="gto-input" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
            )}
            <div className="gto-campo">
              <label htmlFor="l-email">Correo</label>
              <input id="l-email" className="gto-input" type="email" required autoComplete="username" placeholder="nombre@gtoperu.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {modo !== "recuperar" && (
              <div className="gto-campo">
                <label htmlFor="l-pass">Contraseña</label>
                <input id="l-pass" className="gto-input" type="password" required minLength={6} autoComplete={modo === "registro" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            {modo === "login" && (
              <a href="#" className="olvido" onClick={(e) => { e.preventDefault(); cambiar("recuperar"); }}>
                ¿Olvidaste tu contraseña?
              </a>
            )}

            <button type="submit" disabled={cargando} className="gto-btn gto-btn--primario" style={{ width: "100%" }}>
              {cargando
                ? "Procesando…"
                : modo === "login"
                ? "Ingresar"
                : modo === "registro"
                ? "Crear cuenta"
                : "Enviar enlace de recuperación"}
            </button>

            {modo === "recuperar" ? (
              <button type="button" className="gto-btn gto-btn--texto" onClick={() => cambiar("login")}>
                Volver a iniciar sesión
              </button>
            ) : (
              <button type="button" className="gto-btn gto-btn--texto" onClick={() => cambiar(modo === "login" ? "registro" : "login")}>
                {modo === "login" ? "¿Nuevo en el equipo? Crear una cuenta" : "Ya tengo una cuenta"}
              </button>
            )}
            <a className="volver" href={GTO_MENU}>← Volver al menú</a>
          </form>
        </div>
      </div>
    </div>
  );
}

