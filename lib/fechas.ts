/**
 * Formatea fechas siempre en hora de Lima y con números (dd/mm/aaaa hh:mm), para que el
 * servidor (Vercel, UTC) y el navegador muestren exactamente el mismo texto.
 */
function partes(v: string | Date, conHora: boolean) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {})
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(v))) p[x.type] = x.value;
  return p;
}

export function fechaHoraLima(v: string | Date) {
  const p = partes(v, true);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function fechaLima(v: string | Date) {
  const p = partes(v, false);
  return `${p.day}/${p.month}/${p.year}`;
}
