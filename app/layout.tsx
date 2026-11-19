import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

// Carga suave: oculta la pantalla un instante hasta que el diseño GTO está aplicado (máx. 2.5 s). Solo presentación.
const GTO_PRE = "(function(w,d){if(w.__gtoPre)return;w.__gtoPre=1;var o='html{background:#F6F7F7}body{opacity:0!important}',sh,el;try{sh=new CSSStyleSheet();sh.replaceSync(o);d.adoptedStyleSheets=d.adoptedStyleSheets.concat(sh)}catch(e){sh=null;el=d.createElement('style');el.textContent=o;(d.head||d.documentElement).appendChild(el)}var t=Date.now();function quitar(){if(sh)d.adoptedStyleSheets=d.adoptedStyleSheets.filter(function(x){return x!==sh});if(el)el.remove()}function fin(){if(!sh)return quitar();sh.replaceSync('body{transition:opacity .2s ease}');setTimeout(quitar,400)}function css(){var l=d.querySelector('link[href*=\"gto-maqueta.css\"]');try{return!l||!!l.sheet}catch(e){return true}}(function c(){if(d.body&&((d.querySelector('.gto-maq-portal,.gto-maq-cab')&&css())||d.querySelector('input[type=password]')))return setTimeout(fin,60);if(Date.now()-t>2500)return fin();setTimeout(c,40)})()})(window,document);";

export const metadata: Metadata = {
  title: "Logística y Compras · GTO PERU",
  description: "Sistema de emisión de órdenes de compra para proveedores - GTO PERU S.A.C."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" href="/icono-sistema.png?v=1" />
        <script dangerouslySetInnerHTML={{ __html: GTO_PRE }} />
        <link rel="stylesheet" href="https://sistema-integrado-gto.vercel.app/gto-login-v2.css?v=20261117" />
      </head>
      <body className="bg-gray-50 text-gray-900">
        {children}
        <Script src="/directorio-correos.js" strategy="afterInteractive" />
        <Script src="/gto-maqueta.js?v=20261118" strategy="afterInteractive" />
      </body>
    </html>
  );
}

