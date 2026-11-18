/* Maqueta Sistema Integrado GTO aplicada a Logística y Compras (18/11/2026). Solo presentación:
   ordena la barra superior. No consulta ni guarda datos; los botones originales siguen igual. */
(() => {
  const P = {
    carrito: 'M2 4h3l2.5 11h11L21 7H6.2M9 20h.01M18 20h.01',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  };
  const svg = (k) => {
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    for (const [a, b] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'gto-maq-ic' })) s.setAttribute(a, b);
    p.setAttribute('d', P[k]); s.append(p); return s;
  };
  function aplicar() {
    try {
      if (document.querySelector('.gto-log-shell') && !document.getElementById('gto-maqueta-css')) {
        const l = document.createElement('link'); l.id = 'gto-maqueta-css'; l.rel = 'stylesheet'; l.href = '/gto-maqueta.css?v=20261118b'; document.head.append(l);
      }
      const bar = document.querySelector('.gto-log-shell .gto-shared-toolbar'); if (!bar) return;
      const alto = Math.round(bar.getBoundingClientRect().height); if (alto) document.documentElement.style.setProperty('--gto-log-top', alto + 'px');
      const img = bar.querySelector('.gto-toolbar-brand img');
      if (img && !img.dataset.maq) { img.dataset.maq = '1'; img.src = '/logo-gto-blanco.png'; }
      const span = bar.querySelector('.gto-toolbar-brand span');
      if (span && !span.dataset.maq) { span.dataset.maq = '1'; span.replaceChildren(svg('carrito'), document.createTextNode('Logística y Compras')); }
      const quick = bar.querySelector('.gto-toolbar-quick');
      if (quick) {
        quick.querySelectorAll('.gto-toolbar-action:not(.gto-maq-portal)').forEach(a => a.classList.add('gto-maq-oculto'));
        if (!quick.querySelector('.gto-maq-portal')) {
          const a = document.createElement('a'); a.className = 'gto-toolbar-action gto-maq-portal'; a.href = 'https://sistema-integrado-gto.vercel.app';
          a.append(svg('grid'), document.createTextNode('Menú GTO')); quick.append(a); quick.hidden = false;
        }
      }
      const barra = bar.querySelector('.barra'); const reloj = barra && barra.querySelector('.chip.reloj');
      const ind = bar.querySelector('.gto-toolbar-indicators');
      if (reloj && ind) {
        ind.querySelectorAll('.gto-toolbar-popover > .chip').forEach(c => reloj.before(c));
        if (!ind.querySelector('.gto-toolbar-popover > *')) ind.classList.add('gto-maq-oculto');
      }
      const menus = bar.querySelectorAll('.gto-toolbar-menu:not(.gto-toolbar-indicators)');
      menus.forEach(m => {
        m.querySelectorAll('.gto-toolbar-popover a.gto-toolbar-action').forEach(a => { if (/men[uú] gto/i.test(a.textContent)) a.classList.add('gto-maq-oculto'); });
      });
      // Mi cuenta: nombre del usuario y Cerrar sesión (usa el botón original del menú lateral)
      const cuenta = menus[menus.length - 1];
      const salir = Array.from(document.querySelectorAll('.gto-log-side button')).find(b => /cerrar sesi/i.test(b.textContent));
      if (cuenta && !cuenta.dataset.maq) {
        cuenta.dataset.maq = '1';
        const s = cuenta.querySelector('summary'); if (s) s.replaceChildren(svg('usuario'), document.createTextNode('Mi cuenta'));
        const pop = cuenta.querySelector('.gto-toolbar-popover');
        const nombre = document.querySelector('.gto-log-side .border-t p');
        if (pop && nombre && !pop.querySelector('.gto-toolbar-account')) { const st = document.createElement('strong'); st.className = 'gto-toolbar-account'; st.textContent = nombre.textContent.trim(); pop.prepend(st); }
        const yaHaySalir = pop && Array.from(pop.querySelectorAll('button,a')).some(x => /^(salir|cerrar sesi)/i.test(x.textContent.trim()));
        if (pop && salir && !yaHaySalir) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gto-toolbar-action'; b.textContent = 'Cerrar sesión';
          b.addEventListener('click', () => { const o = Array.from(document.querySelectorAll('.gto-log-side button')).find(x => /cerrar sesi/i.test(x.textContent)); if (o) o.click(); }); pop.append(b); }
      }
    } catch (e) { /* solo diseño */ }
  }
  new MutationObserver(aplicar).observe(document.documentElement, { childList: true, subtree: true });
  aplicar();
})();
