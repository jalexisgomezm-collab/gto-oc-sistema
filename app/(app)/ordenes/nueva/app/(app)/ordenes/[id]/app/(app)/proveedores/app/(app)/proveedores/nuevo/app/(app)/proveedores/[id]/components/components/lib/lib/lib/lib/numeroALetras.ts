const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DIEZ_A_DIECINUEVE = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS",
  "DIECISIETE", "DIECIOCHO", "DIECINUEVE"
];
const DECENAS = [
  "", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA",
  "OCHENTA", "NOVENTA"
];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"
];

function tresCifras(n: number, apocope = false): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (c) partes.push(CENTENAS[c]);

  if (resto) {
    if (resto === 1) {
      partes.push(apocope ? "UN" : "UNO");
    } else if (resto < 10) {
      partes.push(UNIDADES[resto]);
    } else if (resto < 20) {
      partes.push(DIEZ_A_DIECINUEVE[resto - 10]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      const unidad = u === 1 ? (apocope ? "UN" : "UNO") : UNIDADES[u];
      if (u === 0) {
        partes.push(DECENAS[d]);
      } else if (d === 2) {
        partes.push("VEINTI" + unidad);
      } else {
        partes.push(DECENAS[d] + " Y " + unidad);
      }
    }
  }

  return partes.join(" ");
}

export function enteroALetras(nIn: number): string {
  const n = Math.trunc(nIn);
  if (n === 0) return "CERO";

  const millones = Math.floor(n / 1_000_000);
  const restoM = n % 1_000_000;
  const miles = Math.floor(restoM / 1000);
  const resto = restoM % 1000;

  const partes: string[] = [];

  if (millones) {
    if (millones === 1) {
      partes.push("UN MILLON");
    } else {
      partes.push(tresCifras(millones, true) + " MILLONES");
    }
  }
  if (miles) {
    if (miles === 1) {
      partes.push("MIL");
    } else {
      partes.push(tresCifras(miles, true) + " MIL");
    }
  }
  if (resto) {
    partes.push(tresCifras(resto, false));
  }

  return partes.filter(Boolean).join(" ");
}

export function montoALetras(valorIn: number, moneda: string = "SOLES"): string {
  const valor = Math.round((valorIn + 1e-9) * 100) / 100;
  let entero = Math.trunc(valor);
  let centavos = Math.round((valor - entero) * 100);
  if (centavos === 100) {
    entero += 1;
    centavos = 0;
  }
  const letrasEntero = enteroALetras(entero);
  const centavosStr = centavos.toString().padStart(2, "0");
  return `${letrasEntero} CON ${centavosStr}/100 ${moneda}`;
}