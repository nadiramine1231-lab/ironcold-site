// ===== IRONCOLD — shared shell, cart, checkout & motion =====
// Loaded (sync) in <head> after js/products.js.
// Each page calls IC.top({ page }) right after <body> and IC.bottom() before </body>.
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  const IC = (window.IC = {});
  const PRODUCTS = window.IC_PRODUCTS || [];
  const WA_NUMBER = '212606685735';
  const NOTIFY_URL = '/api/notify'; // Netlify Function → saved + push to the IRON COLD Commandes app
  const CART_KEY = 'ironcold_cart_v2';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  IC.reduceMotion = reduceMotion;
  IC.byId = (id) => PRODUCTS.find((p) => p.id === id);
  IC.img = (name, small) => `images/web/${name}${small ? '-sm' : ''}.webp`;
  IC.money = (n) => `${n} MAD`;
  IC.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  IC.param = (k) => new URLSearchParams(location.search).get(k);

  // ---------- icons ----------
  const I = {
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7.5h13l-1.1 12.2a1.5 1.5 0 01-1.5 1.3H8.1a1.5 1.5 0 01-1.5-1.3L5.5 7.5z"/><path d="M9 7.5V6a3 3 0 016 0v1.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 7h18M3 12h12M3 17h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.03 1.02-1.03 2.48s1.06 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 005.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.48-8.41z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
    flake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.8l3 2.2 3-2.2M9 20.2l3-2.2 3 2.2"/></svg>'
  };
  IC.icon = I;

  // ---------- shell markup ----------
  const ANN = ['Livraison gratuite partout au Maroc', 'Paiement à la livraison', 'Nouveau drop — Zip Hoodies', 'Échange de taille 7 jours'];
  const NAV = [
    { key: 'shop', href: 'products.html', label: 'Zip Hoodies' },
    { key: 'homme', href: 'products.html?g=homme', label: 'Homme' },
    { key: 'femme', href: 'products.html?g=femme', label: 'Femme' },
    { key: 'livraison', href: 'livraison.html', label: 'Livraison' },
    { key: 'contact', href: 'contact.html', label: 'Contact' }
  ];

  function annHTML() {
    const items = ANN.map((t) => `<span class="ann__brand">IRONCOLD</span><span class="ann__sep">${I.flake}</span><span>${t}</span><span class="ann__sep">${I.flake}</span>`).join('');
    return `<div class="ann" data-marquee data-speed="38" data-dir="-1" role="region" aria-label="Annonces">
      <div class="mq__track"><div class="mq__group">${items}</div></div></div>`;
  }

  IC.top = function (opts) {
    opts = opts || {};
    const page = opts.page || '';
    const nav = NAV.map((n) => `<a href="${n.href}" class="${n.key === page ? 'is-active' : ''}">${n.label}</a>`).join('');
    const mnav = [{ href: 'index.html', label: 'Accueil' }].concat(NAV).map((n, i) =>
      `<a href="${n.href}" style="--i:${i}"><span class="mnav__num">0${i + 1}</span>${n.label}</a>`).join('');
    const html = `${annHTML()}
    <header class="hdr ${opts.overlay ? 'hdr--overlay' : 'is-solid'}" id="icHeader">
      <div class="hdr__in">
        <div class="hdr__left">
          <button class="icon-btn hdr__burger" type="button" aria-label="Ouvrir le menu" data-menu>${I.menu}</button>
          <nav class="hdr__nav" aria-label="Navigation principale">${nav}</nav>
        </div>
        <a class="hdr__logo" href="index.html" aria-label="IRONCOLD — Accueil"><img src="logo1_nobg.png" alt="IRONCOLD" width="704" height="207"></a>
        <div class="hdr__actions">
          <a class="icon-btn hide-sm" href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>
          <a class="icon-btn hide-sm" href="https://www.instagram.com/ironcold_officiel/" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a>
          <button class="icon-btn hdr__cart" type="button" data-cart aria-label="Ouvrir le panier">${I.bag}<span class="cart-count" data-cart-count hidden>0</span></button>
        </div>
      </div>
    </header>
    <div class="layer mnav" id="icMenu" aria-hidden="true">
      <div class="mnav__panel" role="dialog" aria-label="Menu">
        <div class="mnav__head">
          <img src="images/web/emblem-white.png" alt="" class="mnav__emblem" width="347" height="512">
          <button class="icon-btn" type="button" data-close aria-label="Fermer le menu">${I.close}</button>
        </div>
        <nav class="mnav__links">${mnav}</nav>
        <div class="mnav__foot">
          <a class="btn btn--ice btn--block" href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">${I.wa} Commander sur WhatsApp</a>
          <p>Livraison gratuite · Paiement à la livraison</p>
        </div>
      </div>
    </div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
  };

  IC.bottom = function () {
    const big = `<span>IRONCOLD</span><img src="images/web/emblem-white.png" alt="" width="347" height="512"><span class="is-outline">STAY COLD</span><img src="images/web/emblem-white.png" alt="" width="347" height="512">`;
    const html = `
    <footer class="ftr">
      <div class="ftr__big" data-marquee data-speed="55" data-dir="-1" data-boost aria-hidden="true"><div class="mq__track"><div class="mq__group">${big}</div></div></div>
      <div class="wrap ftr__grid">
        <div class="ftr__brand">
          <img src="logo1_nobg.png" alt="IRONCOLD" class="ftr__logo" width="704" height="207">
          <p>Sport fashion engineered for the relentless. Zip hoodies premium, pensés au Maroc.</p>
          <div class="ftr__social">
            <a class="icon-btn icon-btn--line" href="https://www.instagram.com/ironcold_officiel/" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a>
            <a class="icon-btn icon-btn--line" href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>
          </div>
        </div>
        <div class="ftr__col"><h5>Shop</h5><ul>
          <li><a href="products.html">Tous les zip hoodies</a></li>
          <li><a href="products.html?g=homme">Homme</a></li>
          <li><a href="products.html?g=femme">Femme</a></li></ul></div>
        <div class="ftr__col"><h5>Aide</h5><ul>
          <li><a href="livraison.html">Livraison</a></li>
          <li><a href="livraison.html#retours">Retours & échanges</a></li>
          <li><a href="livraison.html#faq">FAQ</a></li>
          <li><a href="contact.html">Contact</a></li></ul></div>
        <div class="ftr__col"><h5>Contact</h5><ul>
          <li><a href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">WhatsApp +212 6 06 68 57 35</a></li>
          <li><a href="mailto:contact@ironcold.ma">contact@ironcold.ma</a></li>
          <li><a href="https://www.instagram.com/ironcold_officiel/" target="_blank" rel="noopener">@ironcold_officiel</a></li></ul></div>
      </div>
      <div class="wrap ftr__bottom">
        <span>© 2026 IRONCOLD. Tous droits réservés.</span>
        <span class="ftr__pills"><span class="pill">${I.cash} Paiement à la livraison</span><span class="pill">${I.truck} Livraison gratuite</span></span>
        <span>Made in Morocco 🇲🇦</span>
      </div>
    </footer>

    <div class="ovl" id="icOverlay" aria-hidden="true"></div>

    <aside class="layer drawer" id="icCart" aria-hidden="true" aria-label="Panier">
      <header class="drawer__head">
        <h3>Panier <span class="drawer__count" data-cart-count-text></span></h3>
        <button class="icon-btn" type="button" data-close aria-label="Fermer le panier">${I.close}</button>
      </header>
      <div class="drawer__ship">${I.truck}<span><strong>Livraison gratuite</strong> débloquée — partout au Maroc</span></div>
      <div class="drawer__items" id="icCartItems"></div>
      <footer class="drawer__foot" id="icCartFoot">
        <div class="drawer__row"><span>Sous-total</span><strong id="icCartTotal">0 MAD</strong></div>
        <div class="drawer__row drawer__row--muted"><span>Livraison</span><span>Gratuite</span></div>
        <button class="btn btn--ice btn--block btn--shine" type="button" data-checkout>Commander maintenant ${I.arrow}</button>
        <button class="btn btn--ghost btn--block" type="button" data-wa-cart>${I.wa} Commander via WhatsApp</button>
        <p class="drawer__note">${I.cash} Tu paies à la livraison — aucun paiement en ligne.</p>
      </footer>
    </aside>

    <div class="layer modal" id="icCheckout" aria-hidden="true">
      <div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="icCoTitle">
        <button class="icon-btn modal__close" type="button" data-close aria-label="Fermer">${I.close}</button>
        <div id="icCoBody"></div>
      </div>
    </div>

    <div class="toast" id="icToast" role="status" aria-live="polite"></div>`;
    document.currentScript.insertAdjacentHTML('beforebegin', html);
    init();
  };

  // ---------- layers (menu / cart / checkout) ----------
  let openLayer = null;
  IC.open = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (openLayer && openLayer !== el) closeLayerEl(openLayer, true);
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.getElementById('icOverlay').classList.add('is-open');
    document.documentElement.classList.add('is-locked');
    openLayer = el;
    const focusable = el.querySelector('button, a, input, select');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 50);
  };
  function closeLayerEl(el, keepOverlay) {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!keepOverlay) {
      document.getElementById('icOverlay').classList.remove('is-open');
      document.documentElement.classList.remove('is-locked');
    }
    if (openLayer === el) openLayer = null;
  }
  IC.close = function () { if (openLayer) closeLayerEl(openLayer); };

  // ---------- cart ----------
  function loadCart() {
    try {
      const v2 = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
      if (Array.isArray(v2)) return v2.filter((i) => IC.byId(i.id));
      // migrate the old cart (drops T-shirts / oversize items that no longer exist)
      const old = JSON.parse(localStorage.getItem('ironcold_cart') || '[]');
      localStorage.removeItem('ironcold_cart');
      return old.filter((i) => IC.byId(i.id)).map((i) => ({ id: i.id, size: i.size || 'M', qty: Math.max(1, i.qty | 0) }));
    } catch (e) { return []; }
  }
  let cart = loadCart();
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ } }
  IC.cart = () => cart.slice();
  IC.cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
  const lineTotal = (items) => items.reduce((s, i) => s + IC.byId(i.id).price * i.qty, 0);

  IC.add = function (id, size, qty, opts) {
    const p = IC.byId(id);
    if (!p) return;
    qty = qty || 1;
    const ex = cart.find((i) => i.id === id && i.size === size);
    if (ex) ex.qty += qty; else cart.push({ id, size, qty });
    saveCart();
    renderCart();
    document.querySelectorAll('.hdr__cart').forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    if (!opts || opts.open !== false) IC.open('icCart');
    else IC.toast(`${p.name} (${size}) ajouté au panier`);
  };
  IC.setQty = function (idx, qty) {
    if (!cart[idx]) return;
    cart[idx].qty = qty;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(); renderCart();
  };

  function renderCart() {
    const n = IC.cartCount();
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('[data-cart-count-text]').forEach((el) => { el.textContent = n ? `(${n})` : ''; });
    const list = document.getElementById('icCartItems');
    const foot = document.getElementById('icCartFoot');
    if (!list) return;
    if (!cart.length) {
      foot.hidden = true;
      list.innerHTML = `<div class="drawer__empty">
        <img src="images/web/emblem-white.png" alt="" width="347" height="512">
        <p>Ton panier est vide.</p>
        <a href="products.html" class="btn btn--ice">Découvrir les zip hoodies ${I.arrow}</a></div>`;
      return;
    }
    foot.hidden = false;
    list.innerHTML = cart.map((it, idx) => {
      const p = IC.byId(it.id);
      return `<div class="citem">
        <a href="product.html?id=${p.id}" class="citem__img"><img src="${IC.img(p.images[0], true)}" alt="${IC.esc(p.name)}" width="480" height="690"></a>
        <div class="citem__info">
          <a href="product.html?id=${p.id}" class="citem__name">${IC.esc(p.name)}</a>
          <span class="citem__meta">${p.color} · Taille ${it.size}</span>
          <div class="citem__row">
            <div class="qty qty--sm">
              <button type="button" data-qty="${idx}" data-delta="-1" aria-label="Diminuer">−</button>
              <span>${it.qty}</span>
              <button type="button" data-qty="${idx}" data-delta="1" aria-label="Augmenter">+</button>
            </div>
            <strong>${IC.money(p.price * it.qty)}</strong>
          </div>
        </div>
        <button class="icon-btn citem__del" type="button" data-remove="${idx}" aria-label="Retirer">${I.trash}</button>
      </div>`;
    }).join('');
    document.getElementById('icCartTotal').textContent = IC.money(lineTotal(cart));
  }
  IC.renderCart = renderCart;

  // ---------- WhatsApp order ----------
  IC.waOrder = function (items, who) {
    items = items || cart;
    const lines = items.map((i) => { const p = IC.byId(i.id); return `• ${p.name} — ${p.color} — Taille ${i.size} × ${i.qty}`; }).join('\n');
    const client = who ? `\n\n${who.prenom} ${who.nom}\n${who.phone}\n${who.ville}, ${who.adresse}` : '';
    const text = `Salam IRONCOLD, bghit ncommander :\n${lines}\nTotal : ${IC.money(lineTotal(items))}${client}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  // ---------- checkout (cash on delivery) ----------
  const CITIES = ['Casablanca', 'Rabat', 'Salé', 'Témara', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Safi', 'El Jadida', 'Béni Mellal', 'Nador', 'Mohammedia', 'Khouribga', 'Settat', 'Berrechid', 'Khémisset', 'Laâyoune', 'Dakhla', 'Autre'];
  let coItems = null;
  let coFromCart = true;

  IC.checkout = function (items) {
    coFromCart = !items;
    coItems = (items || cart).map((i) => Object.assign({}, i));
    if (!coItems.length) return;
    const total = lineTotal(coItems);
    const summary = coItems.map((i) => {
      const p = IC.byId(i.id);
      return `<div class="co__line"><img src="${IC.img(p.images[0], true)}" alt="" width="480" height="690"><span><strong>${IC.esc(p.name)}</strong><em>${p.color} · Taille ${i.size} · ×${i.qty}</em></span><b>${IC.money(p.price * i.qty)}</b></div>`;
    }).join('');
    document.getElementById('icCoBody').innerHTML = `
      <p class="eyebrow">${I.cash} Paiement à la livraison</p>
      <h3 class="co__title" id="icCoTitle">Finaliser la commande</h3>
      <div class="co__summary">${summary}
        <div class="co__total"><span>Livraison</span><span>Gratuite</span></div>
        <div class="co__total co__total--big"><span>Total</span><strong>${IC.money(total)}</strong></div>
      </div>
      <form class="co__form" id="icCoForm" novalidate>
        <div class="field-row">
          <label class="field"><span>Prénom</span><input name="prenom" autocomplete="given-name" required></label>
          <label class="field"><span>Nom</span><input name="nom" autocomplete="family-name" required></label>
        </div>
        <label class="field"><span>Téléphone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 XX XX XX XX" required></label>
        <label class="field"><span>Ville</span><select name="ville" required><option value="">Choisir ta ville</option>${CITIES.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Quartier / Adresse</span><input name="adresse" autocomplete="street-address" placeholder="Ex : Hay Mohammadi, Maarif…" required></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="co__err" id="icCoErr" role="alert"></p>
        <button type="submit" class="btn btn--ice btn--block btn--shine">Confirmer la commande — ${IC.money(total)}</button>
        <p class="co__fine">Notre équipe t'appelle pour confirmer. Livraison 24–48H, tu paies à la réception.</p>
      </form>`;
    IC.open('icCheckout');
    document.getElementById('icCoForm').addEventListener('submit', submitOrder);
  };

  function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const d = Object.fromEntries(new FormData(f).entries());
    const err = document.getElementById('icCoErr');
    const phone = (d.phone || '').replace(/[\s.\-()]/g, '');
    if (!d.prenom.trim() || !d.nom.trim() || !d.ville || !d.adresse.trim()) { err.textContent = 'Merci de remplir tous les champs.'; return; }
    if (!/^(?:\+212|00212|0)[5-7]\d{8}$/.test(phone)) { err.textContent = 'Numéro de téléphone invalide (ex : 06 12 34 56 78).'; f.phone.focus(); return; }
    err.textContent = '';
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Envoi…';

    const total = IC.money(lineTotal(coItems));
    const who = { prenom: d.prenom.trim(), nom: d.nom.trim(), phone, ville: d.ville, adresse: d.adresse.trim() };

    // Server unreachable / not configured: never lose the order — hand it to WhatsApp.
    const fail = () => {
      btn.disabled = false; btn.textContent = `Confirmer la commande — ${total}`;
      err.innerHTML = `Oups, la commande n'a pas pu être envoyée. <button type="button" class="co__wa" id="icCoWa">${I.wa} Envoyer ma commande sur WhatsApp</button>`;
      document.getElementById('icCoWa').addEventListener('click', () => IC.waOrder(coItems, who));
    };

    const done = (res) => {
      res = res || {};
      if (coFromCart) { cart = []; saveCart(); renderCart(); }
      document.getElementById('icCoBody').innerHTML = `
        <div class="co__ok">
          <div class="co__okIcon"><img src="images/web/emblem-white.png" alt="" width="347" height="512"></div>
          <h3 class="co__title" id="icCoTitle">Merci ${IC.esc(d.prenom)} !</h3>
          <p>Ta commande${res.ref ? ` N° <strong>${IC.esc(res.ref)}</strong>` : ''} est bien reçue.${res.confirmUrl ? ' <strong>Dernière étape : confirme-la</strong> pour qu’on la prépare tout de suite.' : ' Notre équipe t’appelle dans les <strong>24H</strong> pour confirmer la livraison.'}</p>
          <div class="co__okBox">
            <span>${coItems.map((i) => `${IC.esc(IC.byId(i.id).name)} (${i.size}) ×${i.qty}`).join('<br>')}</span>
            <span>📍 ${IC.esc(d.ville)}, ${IC.esc(d.adresse)}</span>
            <span>📞 ${IC.esc(phone)}</span>
            <strong>Total à payer à la livraison : ${total}</strong>
          </div>
          ${res.confirmUrl ? `<a class="btn btn--ice btn--block btn--shine" href="${IC.esc(res.confirmUrl)}">✓ Confirmer ma commande</a>
          <button class="btn btn--ghost btn--block" type="button" data-close>Plus tard</button>` : '<button class="btn btn--ice btn--block" type="button" data-close>Continuer</button>'}
        </div>`;
    };
    fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ type: 'order', website: d.website || '', items: coItems }, who))
    }).then((r) => (r.ok ? r.json().catch(() => ({})).then(done) : fail()), fail);
  }

  // ---------- toast ----------
  let toastT;
  IC.toast = function (msg) {
    const t = document.getElementById('icToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-show'), 2600);
  };

  // ---------- product card ----------
  IC.card = function (p, i) {
    const g = p.gender === 'homme' ? 'Homme' : 'Femme';
    return `<article class="pcard" data-reveal style="--d:${(i || 0) * 90}ms">
      <div class="pcard__media" data-tilt="7">
        <a class="pcard__link" href="product.html?id=${p.id}" aria-label="${IC.esc(p.name)}">
          <img class="pcard__img" src="${IC.img(p.images[0])}" alt="${IC.esc(p.name)} — ${p.color}" loading="lazy" width="900" height="1296">
          ${p.images[1] ? `<img class="pcard__img pcard__img--alt" src="${IC.img(p.images[1])}" alt="" loading="lazy" width="900" height="1296">` : ''}
        </a>
        ${p.badge ? `<span class="pcard__badge${p.badge === 'Bestseller' ? ' is-hot' : ''}">${p.badge}</span>` : ''}
        <div class="pcard__quick">
          <span>Ajout rapide</span>
          <div class="pcard__sizes">${p.sizes.map((s) => `<button type="button" data-add="${p.id}" data-size="${s}">${s}</button>`).join('')}</div>
        </div>
        <span class="pcard__glare" aria-hidden="true"></span>
      </div>
      <div class="pcard__info">
        <a href="product.html?id=${p.id}" class="pcard__name">${IC.esc(p.name)}</a>
        <span class="pcard__meta"><i class="swatch swatch--${p.color === 'Noir' ? 'noir' : 'gris'}"></i>${p.color} · ${g}</span>
        <span class="pcard__price">${IC.money(p.price)}</span>
      </div>
    </article>`;
  };
  IC.renderGrid = function (el, list) {
    el.innerHTML = list.map((p, i) => IC.card(p, i)).join('');
    IC.reveal(el); IC.tilt(el);
  };

  // ---------- marquees (announcement, bands, footer) ----------
  const marquees = [];
  let scrollVel = 0, scrollSign = 1, lastY = window.scrollY;
  function setupMarquee(el) {
    const track = el.querySelector('.mq__track');
    const group = track.querySelector('.mq__group');
    const m = { el, track, group, speed: parseFloat(el.dataset.speed) || 50, dir: parseFloat(el.dataset.dir) || -1, boost: el.hasAttribute('data-boost'), x: 0, w: 1, visible: true };
    m.measure = function () {
      track.querySelectorAll('.mq__group[aria-hidden]').forEach((n) => n.remove());
      m.w = group.getBoundingClientRect().width || 1;
      const copies = Math.ceil(el.clientWidth / m.w) + 1;
      for (let i = 0; i < copies; i++) { const c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
      m.x = m.dir > 0 ? -m.w : 0;
    };
    m.measure();
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { m.visible = es[0].isIntersecting; }).observe(el);
    marquees.push(m);
  }
  let lastT = performance.now();
  function tick(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) scrollSign = dy > 0 ? 1 : -1;
    scrollVel += (Math.min(Math.abs(dy) / Math.max(dt, 0.001), 4000) - scrollVel) * 0.12;
    const boost = 1 + Math.min(scrollVel / 260, 5);
    for (const m of marquees) {
      if (!m.visible) continue;
      const v = m.speed * m.dir * (m.boost ? boost * scrollSign : 1);
      m.x += v * dt;
      if (m.x <= -m.w) m.x += m.w;
      if (m.x > 0) m.x -= m.w;
      m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
    }
    progressUpdate();
    requestAnimationFrame(tick);
  }

  // ---------- scroll progress for sticky 3D sections ----------
  let progressEls = [];
  function progressUpdate() {
    const vh = window.innerHeight;
    for (const el of progressEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      el.style.setProperty('--p', p.toFixed(4));
    }
  }

  // ---------- reveal ----------
  let io = null;
  IC.reveal = function (root) {
    const els = (root || document).querySelectorAll('[data-reveal]:not(.is-in)');
    if (!io || reduceMotion) { els.forEach((el) => el.classList.add('is-in')); return; }
    els.forEach((el) => io.observe(el));
  };

  // ---------- 3D tilt ----------
  IC.tilt = function (root) {
    if (!finePointer || reduceMotion) return;
    (root || document).querySelectorAll('[data-tilt]:not([data-tilt-on])').forEach((el) => {
      el.setAttribute('data-tilt-on', '');
      const max = parseFloat(el.dataset.tilt) || 8;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        el.classList.add('is-tilt');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
        el.classList.remove('is-tilt');
      });
    });
  };

  // ---------- init ----------
  IC.icons = function (root) {
    (root || document).querySelectorAll('i[data-icon]').forEach((el) => { if (I[el.dataset.icon]) el.outerHTML = I[el.dataset.icon]; });
  };

  function init() {
    IC.icons();
    if ('IntersectionObserver' in window && !reduceMotion) {
      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }
    document.querySelectorAll('[data-marquee]').forEach(setupMarquee);
    const remeasure = () => marquees.forEach((m) => m.measure());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(remeasure, 150); });
    progressEls = Array.from(document.querySelectorAll('[data-progress]'));
    if (!reduceMotion) requestAnimationFrame(tick);
    else progressEls.forEach((el) => el.style.setProperty('--p', '0.5'));
    if (reduceMotion) window.addEventListener('scroll', progressUpdate, { passive: true });

    renderCart();
    IC.reveal(); IC.tilt();

    // header state
    const hdr = document.getElementById('icHeader');
    const onScroll = () => { if (hdr.classList.contains('hdr--overlay')) hdr.classList.toggle('is-solid', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // delegated clicks
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-cart],[data-menu],[data-close],[data-add],[data-qty],[data-remove],[data-checkout],[data-wa-cart]');
      if (!t) return;
      if (t.hasAttribute('data-cart')) { e.preventDefault(); IC.open('icCart'); }
      else if (t.hasAttribute('data-menu')) { IC.open('icMenu'); }
      else if (t.hasAttribute('data-close')) { IC.close(); }
      else if (t.hasAttribute('data-add')) { e.preventDefault(); IC.add(t.dataset.add, t.dataset.size, 1); }
      else if (t.hasAttribute('data-qty')) { const i = +t.dataset.qty; IC.setQty(i, cart[i].qty + (+t.dataset.delta)); }
      else if (t.hasAttribute('data-remove')) { IC.setQty(+t.dataset.remove, 0); }
      else if (t.hasAttribute('data-checkout')) { IC.checkout(); }
      else if (t.hasAttribute('data-wa-cart')) { IC.waOrder(); }
    });
    document.getElementById('icOverlay').addEventListener('click', IC.close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') IC.close(); });
    document.querySelectorAll('.mnav__links a').forEach((a) => a.addEventListener('click', IC.close));
    window.addEventListener('storage', (e) => { if (e.key === CART_KEY) { cart = loadCart(); renderCart(); } });
  }
})();
