import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logística y Compras · GTO PERU",
  description: "Sistema de emisión de órdenes de compra para proveedores - GTO PERU S.A.C."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        {children}
        <Script src="/directorio-correos.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}