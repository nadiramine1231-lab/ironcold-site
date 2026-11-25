// ===== IRONCOLD — admin dashboard (admin.html) =====
// Edits the whole site: products & photos, categories, any text/photo of the pages (visual editor),
// hidden sections, announcements, contact info, orders. Changes stay in a draft until "Publier".
(function () {
  'use strict';
  const API = '/api/admin';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} MAD`;
  const imgUrl = (name, small) => (String(name || '').startsWith('m/') ? `/media/${name.slice(2)}${small ? '-sm' : ''}.webp` : `images/web/${name}${small ? '-sm' : ''}.webp`);
  const srcUrl = (src) => (/^(https?:|\/)/.test(src) ? src : '/' + src);
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'TU'];
  const STATUS = { new: ['Nouvelle', '#c8102e'], confirmed: ['Confirmée', '#2563eb'], shipped: ['Expédiée', '#7c3aed'], delivered: ['Livrée', '#15803d'], cancelled: ['Annulée', '#64748b'] };
  const PAGES = [['index', 'Accueil'], ['products', 'Collection'], ['livraison', 'Livraison'], ['contact', 'Contact']];
  const DRAFT_KEY = 'ic_admin_draft';

  let PASS = '';
  let published = null;   // catalog as on the server
  let draft = null;       // working copy
  let orders = null;
  let view = 'overview';

  // ---------- small helpers ----------
  let toastT;
  function toast(msg, err) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('is-err', !!err);
    t.classList.add('is-show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-show'), 3200);
  }

  async function api(method, path, body) {
    const r = await fetch(API + path, {
      method,
      headers: Object.assign({ Authorization: 'Bearer ' + PASS }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) throw Object.assign(new Error('Mot de passe incorrect.'), { auth: true });
    if (!r.ok || d.ok === false) throw new Error(d.error === 'ADMIN_PASSWORD missing' ? 'ADMIN_PASSWORD manquant sur Netlify.' : (d.error || `Erreur serveur (${r.status})`));
    return d;
  }

  function core(c) { return { products: c.products, categories: c.categories, settings: c.settings }; }
  const isDirty = () => published && draft && JSON.stringify(core(draft)) !== JSON.stringify(core(published));
  function changed() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: published.updatedAt, draft: core(draft) })); } catch (e) { /* full */ }
    const dirty = isDirty();
    $('#publishBtn').disabled = !dirty;
    $('#discardBtn').hidden = !dirty;
    const st = $('#draftState');
    st.classList.toggle('is-dirty', dirty);
    st.textContent = dirty ? '● Modifications non publiées' : (published.updatedAt ? `Publié le ${new Date(published.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Contenu par défaut');
  }

  // photo → WebP in the browser (big + thumbnail), then upload
  async function toWebp(file, width) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, width / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.82);
  }
  async function upload(file, width) {
    if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
    const [data, small] = await Promise.all([toWebp(file, width || 900), toWebp(file, 480)]);
    const r = await api('POST', '/media', { data, small });
    return r.name;
  }
  function pickFiles(multiple) {
    return new Promise((resolve) => {
      const inp = $('#filePick');
      inp.multiple = !!multiple;
      inp.value = '';
      inp.onchange = () => resolve(Array.from(inp.files || []));
      inp.click();
    });
  }

  // ---------- login ----------
  async function login(pass, remember) {
    PASS = pass;
    await api('GET', '/me');
    (remember ? localStorage : sessionStorage).setItem('ic_admin_pass', pass);
    const r = await api('GET', '/catalog');
    published = r.catalog;
    draft = clone(published);
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved && saved.base === published.updatedAt && saved.draft) { draft = Object.assign(clone(published), saved.draft); toast('Brouillon non publié restauré.'); }
    } catch (e) { /* ignore */ }
    $('#login').hidden = true;
    $('#app').hidden = false;
    changed();
    go(location.hash.slice(1) || 'overview');
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try { await login($('#loginPass').value, $('#loginRemember').checked); }
    catch (err) { $('#loginErr').textContent = err.message || 'Connexion impossible.'; }
  });
  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('ic_admin_pass'); sessionStorage.removeItem('ic_admin_pass');
    location.reload();
  });

  // ---------- publish / discard ----------
  $('#publishBtn').addEventListener('click', async () => {
    const b = $('#publishBtn');
    b.disabled = true; b.textContent = 'Publication…';
    try {
      const r = await api('PUT', '/catalog', { catalog: core(draft) });
      published = r.catalog;
      draft = clone(published);
      localStorage.removeItem(DRAFT_KEY);
      toast('Publié ✓ Le site est à jour.');
      render();
    } catch (err) { toast(err.message, true); }
    b.textContent = 'Publier';
    changed();
  });
  $('#discardBtn').addEventListener('click', () => {
    if (!confirm('Annuler toutes les modifications non publiées ?')) return;
    draft = clone(published);
    localStorage.removeItem(DRAFT_KEY);
    changed(); render();
  });
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- navigation ----------
  const TITLES = { overview: 'Aperçu', editor: 'Éditeur visuel', products: 'Produits', categories: 'Catégories', settings: 'Annonces & contact', orders: 'Commandes' };
  function go(v) {
    view = TITLES[v] ? v : 'overview';
    history.replaceState(null, '', '#' + view);
    $$('#sideNav button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
    $('#viewTitle').textContent = TITLES[view];
    document.querySelector('.side').classList.remove('is-open');
    render();
  }
  $('#sideNav').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view); });
  $('#menuBtn').addEventListener('click', () => document.querySelector('.side').classList.toggle('is-open'));

  function render() {
    const v = $('#view');
    v.oninput = v.onchange = v.onclick = null;
    const fn = { overview: renderOverview, editor: renderEditor, products: renderProducts, categories: renderCategories, settings: renderSettings, orders: renderOrders }[view];
    fn();
  }

  // =====================================================================
  // APERÇU
  // =====================================================================
  async function loadOrders(force) {
    if (!orders || force) orders = (await api('GET', '/orders')).orders || [];
    return orders;
  }
  async function renderOverview() {
    const p = draft.products;
    $('#view').innerHTML = `
      <div class="stats" id="ovStats">
        <div class="stat"><b>…</b><span>Commandes aujourd'hui</span></div>
        <div class="stat"><b>…</b><span>À traiter (nouvelles)</span></div>
        <div class="stat"><b>…</b><span>Chiffre (hors annulées)</span></div>
        <div class="stat"><b>${p.filter((x) => !x.hidden).length}</b><span>Produits en ligne · ${p.filter((x) => x.hidden).length} masqués</span></div>
      </div>
      <div class="quick">
        <button type="button" data-go="editor"><b>✎ Modifier le site</b><span class="muted">Clique sur n'importe quel texte ou photo du site pour le changer.</span></button>
        <button type="button" data-go="products"><b>▦ Produits &amp; photos</b><span class="muted">Ajouter, modifier les prix, les photos, masquer un produit.</span></button>
        <button type="button" data-go="settings"><b>☰ Annonces &amp; contact</b><span class="muted">Bande d'annonces, WhatsApp, email, Instagram.</span></button>
      </div>`;
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    try {
      const list = await loadOrders(true);
      const today = new Date().toDateString();
      const s = $$('#ovStats .stat b');
      s[0].textContent = list.filter((o) => new Date(o.createdAt).toDateString() === today).length;
      s[1].textContent = list.filter((o) => o.status === 'new').length;
      s[2].textContent = money(list.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + (o.total || 0), 0));
    } catch (e) { $$('#ovStats .stat b').slice(0, 3).forEach((b) => { b.textContent = '—'; }); }
  }

  // =====================================================================
  // ÉDITEUR VISUEL
  // =====================================================================
  let ed = { page: 'index', info: null, tab: 'texts', mobile: false, q: '' };
  const S = () => draft.settings;

  function renderEditor() {
    $('#view').innerHTML = `
      <div class="ed">
        <div class="ed__stage">
          <div class="ed__bar">
            <div class="chips" id="edPages">${PAGES.map(([id, l]) => `<button class="chip${id === ed.page ? ' is-on' : ''}" type="button" data-p="${id}">${l}</button>`).join('')}</div>
            <span style="flex:1"></span>
            <div class="chips">
              <button class="chip${ed.mobile ? '' : ' is-on'}" type="button" data-dev="0">💻 Ordinateur</button>
              <button class="chip${ed.mobile ? ' is-on' : ''}" type="button" data-dev="1">📱 Mobile</button>
            </div>
          </div>
          <div class="ed__frame-wrap${ed.mobile ? ' is-mobile' : ''}" id="edWrap"><iframe class="ed__frame" id="edFrame" title="Aperçu du site" src="${ed.page}.html?icedit=1"></iframe></div>
        </div>
        <div class="ed__panel">
          <div class="ed__tabs" id="edTabs">
            <button type="button" data-t="texts">Textes</button><button type="button" data-t="images">Photos</button><button type="button" data-t="sections">Sections</button>
          </div>
          <div class="ed__hint">Clique directement sur un <b>texte</b> dans l'aperçu pour l'écrire, ou sur une <b>photo</b> pour la remplacer. Tout reste en brouillon jusqu'à <b>Publier</b>.</div>
          <div class="ed__list" id="edList"><p class="muted">Chargement de la page…</p></div>
        </div>
      </div>`;
    $('#edPages').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { ed.page = b.dataset.p; ed.info = null; renderEditor(); } });
    $$('[data-dev]').forEach((b) => b.addEventListener('click', () => { ed.mobile = b.dataset.dev === '1'; renderEditor(); }));
    $('#edTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { ed.tab = b.dataset.t; renderPanel(); } });
    renderPanel();
  }

  const frame = () => $('#edFrame');
  const toFrame = (m) => { const f = frame(); if (f && f.contentWindow) f.contentWindow.postMessage(Object.assign({ source: 'ic-admin' }, m), location.origin); };

  window.addEventListener('message', async (e) => {
    if (e.origin !== location.origin || !e.data || e.data.source !== 'ic-site' || view !== 'editor') return;
    const m = e.data;
    if (m.type === 'ready') {
      ed.info = m;
      const images = {};
      Object.entries(S().images || {}).forEach(([k, n]) => { images[k] = imgUrl(n); });
      toFrame({ type: 'apply', texts: S().texts || {}, images, hidden: S().hidden || [] });
      renderPanel();
    } else if (m.type === 'text') {
      setText(m.key, m.value, m.def);
      const inp = $(`#edList [data-key="${CSS.escape(m.key)}"]`);
      if (inp && document.activeElement !== inp) inp.value = m.value;
    } else if (m.type === 'pick-image') {
      replaceImage(m.key);
    } else if (m.type === 'section') {
      setHidden(m.key, m.hidden);
      if (ed.tab === 'sections') renderPanel();
    }
  });

  function setText(key, value, def) {
    const t = S().texts = S().texts || {};
    if (value == null || value === def) delete t[key]; else t[key] = value;
    changed();
  }
  function setHidden(key, hidden) {
    const h = new Set(S().hidden || []);
    hidden ? h.add(key) : h.delete(key);
    S().hidden = [...h];
    changed();
  }
  async function replaceImage(key) {
    const [file] = await pickFiles(false);
    if (!file) return;
    toast('Envoi de la photo…');
    try {
      const name = await upload(file, 1800);
      (S().images = S().images || {})[key] = name;
      toFrame({ type: 'set-image', key, url: imgUrl(name) });
      changed(); toast('Photo remplacée (brouillon).');
      if (ed.tab === 'images') renderPanel();
    } catch (err) { toast(err.message, true); }
  }

  function renderPanel() {
    $$('#edTabs button').forEach((b) => b.classList.toggle('is-on', b.dataset.t === ed.tab));
    const list = $('#edList');
    if (!list) return;
    if (!ed.info) { list.innerHTML = '<p class="muted">Chargement de la page…</p>'; return; }
    const byGroup = (items) => items.reduce((acc, it) => { (acc[it.group] = acc[it.group] || []).push(it); return acc; }, {});

    if (ed.tab === 'texts') {
      const q = ed.q.toLowerCase();
      const items = ed.info.texts.filter((t) => !q || t.def.toLowerCase().includes(q) || String((S().texts || {})[t.key] || '').toLowerCase().includes(q));
      const groups = byGroup(items);
      list.innerHTML = `<input class="input" id="edSearch" placeholder="Rechercher un texte…" value="${esc(ed.q)}">` +
        Object.entries(groups).map(([g, its]) => `<div class="ed__group">${esc(g)}</div>` + its.map((t) => {
          const cur = (S().texts || {})[t.key];
          const v = cur != null ? cur : t.def;
          const long = t.def.length > 60;
          return `<div class="ed__item">${long
            ? `<textarea class="input${cur != null ? ' is-changed' : ''}" data-key="${esc(t.key)}" data-def="${esc(t.def)}" rows="3">${esc(v)}</textarea>`
            : `<input class="input${cur != null ? ' is-changed' : ''}" data-key="${esc(t.key)}" data-def="${esc(t.def)}" value="${esc(v)}">`}
            ${cur != null ? `<div class="row"><span class="muted">Original : ${esc(t.def.slice(0, 60))}</span><button class="mini-btn" type="button" data-reset="${esc(t.key)}">Rétablir</button></div>` : ''}</div>`;
        }).join('')).join('');
      const search = $('#edSearch');
      search.addEventListener('input', () => { ed.q = search.value; const pos = search.selectionStart; renderPanel(); const s2 = $('#edSearch'); s2.focus(); s2.setSelectionRange(pos, pos); });
      list.oninput = (e) => {
        const inp = e.target.closest('[data-key]');
        if (!inp) return;
        setText(inp.dataset.key, inp.value, inp.dataset.def);
        inp.classList.toggle('is-changed', inp.value !== inp.dataset.def);
        toFrame({ type: 'set-text', key: inp.dataset.key, value: inp.value });
      };
      list.onclick = (e) => {
        const b = e.target.closest('[data-reset]');
        if (!b) return;
        const t = ed.info.texts.find((x) => x.key === b.dataset.reset);
        setText(t.key, null, t.def);
        toFrame({ type: 'set-text', key: t.key, value: t.def });
        renderPanel();
      };
    } else if (ed.tab === 'images') {
      list.oninput = null;
      const groups = byGroup(ed.info.images);
      list.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([g, its]) => `<div class="ed__group">${esc(g)}</div>` + its.map((im) => {
        const cur = (S().images || {})[im.key];
        return `<div class="ed__img"><img src="${esc(cur ? imgUrl(cur, true) : srcUrl(im.def))}" alt="">
          <div class="row"><button class="mini-btn" type="button" data-img="${esc(im.key)}">Remplacer</button>${cur ? `<button class="mini-btn" type="button" data-imgreset="${esc(im.key)}" data-def="${esc(im.def)}">Rétablir</button>` : ''}</div></div>`;
      }).join('')).join('') : '<p class="muted">Pas de photo modifiable sur cette page.</p>';
      list.onclick = (e) => {
        const b = e.target.closest('[data-img]');
        if (b) return replaceImage(b.dataset.img);
        const r = e.target.closest('[data-imgreset]');
        if (r) { delete S().images[r.dataset.imgreset]; toFrame({ type: 'set-image', key: r.dataset.imgreset, url: srcUrl(r.dataset.def) }); changed(); renderPanel(); }
      };
    } else {
      list.oninput = null;
      const hidden = new Set(S().hidden || []);
      list.innerHTML = ed.info.sections.map((s) => `<div class="lrow card" style="padding:12px 14px"><span><b style="font-size:14px">${esc(s.group)}</b><br><span class="muted">${hidden.has(s.key) ? 'Masquée' : 'Visible'}</span></span>
        <button class="switch${hidden.has(s.key) ? '' : ' is-on'}" type="button" data-sec="${esc(s.key)}" aria-label="Afficher / masquer"></button></div>`).join('');
      list.onclick = (e) => {
        const b = e.target.closest('[data-sec]');
        if (!b) return;
        const hide = !hidden.has(b.dataset.sec);
        setHidden(b.dataset.sec, hide);
        const all = S().hidden || [];
        toFrame({ type: 'apply', hidden: all });
        renderPanel();
      };
    }
  }

  // =====================================================================
  // PRODUITS
  // =====================================================================
  let pf = { q: '', cat: 'all' };
  const catLabel = (id) => (draft.categories.find((c) => c.id === id) || {}).label || id;

  function renderProducts() {
    const list = draft.products.filter((p) => (pf.cat === 'all' || p.cat === pf.cat) && (!pf.q || (p.name + ' ' + p.color).toLowerCase().includes(pf.q.toLowerCase())));
    $('#view').innerHTML = `
      <div class="ptools">
        <input class="input" id="pSearch" placeholder="Rechercher…" value="${esc(pf.q)}">
        <div class="chips" id="pCats"><button class="chip${pf.cat === 'all' ? ' is-on' : ''}" type="button" data-c="all">Tous (${draft.products.length})</button>${draft.categories.map((c) => `<button class="chip${pf.cat === c.id ? ' is-on' : ''}" type="button" data-c="${esc(c.id)}">${esc(c.label)} (${draft.products.filter((p) => p.cat === c.id).length})</button>`).join('')}</div>
      </div>
      <div class="pgrid" id="pGrid">
        <button class="pitem pitem__add" type="button" data-new><div><span>＋</span>Nouveau produit</div></button>
        ${list.map((p) => `<button class="pitem${p.hidden ? ' is-hidden' : ''}" type="button" data-id="${esc(p.id)}">
          ${p.hidden ? '<span class="pitem__flag">MASQUÉ</span>' : p.badge ? `<span class="pitem__flag">${esc(p.badge)}</span>` : ''}
          <img src="${esc(imgUrl(p.images[0], true))}" alt="" loading="lazy">
          <div class="pitem__b"><b>${esc(p.name)}</b><span>${esc(catLabel(p.cat))} · ${esc(p.color)} · ${p.gender}</span><strong>${money(p.price)}${p.oldPrice ? ` <s class="muted">${money(p.oldPrice)}</s>` : ''}</strong></div>
        </button>`).join('')}
      </div>`;
    const s = $('#pSearch');
    s.addEventListener('input', () => { pf.q = s.value; const pos = s.selectionStart; renderProducts(); const s2 = $('#pSearch'); s2.focus(); s2.setSelectionRange(pos, pos); });
    $('#pCats').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { pf.cat = b.dataset.c; renderProducts(); } });
    $('#pGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-id],[data-new]');
      if (!b) return;
      openProduct(b.dataset.id ? draft.products.find((p) => p.id === b.dataset.id) : null);
    });
  }

  function openProduct(orig) {
    const isNew = !orig;
    const p = orig ? clone(orig) : { id: '', cat: pf.cat !== 'all' ? pf.cat : (draft.categories[0] || {}).id, name: '', gender: 'homme', color: 'Noir', price: 299, badge: 'New', images: [], sizes: ['S', 'M', 'L', 'XL', 'XXL'], desc: '' };
    const ovl = document.createElement('div'); ovl.className = 'dr-ovl';
    const dr = document.createElement('aside'); dr.className = 'dr';
    document.body.append(ovl, dr);
    const close = () => { ovl.remove(); dr.remove(); };
    ovl.addEventListener('click', close);

    function photosHTML() {
      return p.images.map((n, i) => `<div class="photo">${i === 0 ? '<span class="photo__tag">PRINCIPALE</span>' : ''}<img src="${esc(imgUrl(n, true))}" alt="">
        <div class="photo__ctl"><button type="button" data-mv="${i}" data-d="-1" title="Avant">←</button><button type="button" data-rm="${i}" title="Supprimer">✕</button><button type="button" data-mv="${i}" data-d="1" title="Après">→</button></div></div>`).join('') +
        `<div class="drop" id="pDrop"><div><b>＋</b>Ajouter des photos<br><span>(ou glisser-déposer)</span></div></div>`;
    }
    dr.innerHTML = `
      <div class="dr__head"><h3>${isNew ? 'Nouveau produit' : 'Modifier le produit'}</h3><button class="mini-btn" type="button" data-x>✕</button></div>
      <div class="dr__body">
        <div><span class="lbl">Photos (la 1re est la photo principale, la 2e apparaît au survol)</span><div class="photos" id="pPhotos">${photosHTML()}</div></div>
        <div><span class="lbl">Nom</span><input class="input" id="fName" value="${esc(p.name)}" placeholder="IRONCOLD …"></div>
        <div class="grid2">
          <div><span class="lbl">Catégorie</span><select class="input" id="fCat">${draft.categories.map((c) => `<option value="${esc(c.id)}"${c.id === p.cat ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
          <div><span class="lbl">Pour</span><select class="input" id="fGender">${[['homme', 'Homme'], ['femme', 'Femme'], ['mixte', 'Mixte']].map(([v, l]) => `<option value="${v}"${v === p.gender ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="grid2">
          <div><span class="lbl">Prix (MAD)</span><input class="input" id="fPrice" type="number" min="0" value="${esc(p.price)}"></div>
          <div><span class="lbl">Ancien prix barré (optionnel)</span><input class="input" id="fOld" type="number" min="0" value="${esc(p.oldPrice || '')}" placeholder="ex : 399"></div>
        </div>
        <div class="grid2">
          <div><span class="lbl">Couleur</span><input class="input" id="fColor" list="colorsList" value="${esc(p.color)}"><datalist id="colorsList"><option>Noir</option><option>Blanc</option><option>Gris chiné</option><option>Beige</option><option>Bleu</option></datalist></div>
          <div><span class="lbl">Badge</span><input class="input" id="fBadge" list="badgeList" value="${esc(p.badge)}" placeholder="aucun"><datalist id="badgeList"><option>New</option><option>Bestseller</option><option>Promo</option><option>Limited</option><option>-20%</option></datalist></div>
        </div>
        <div><span class="lbl">Tailles disponibles</span><div class="sizes-pick" id="fSizes">${SIZES.map((s) => `<button type="button" class="${p.sizes.includes(s) ? 'is-on' : ''}" data-s="${s}">${s}</button>`).join('')}</div></div>
        <div><span class="lbl">Description</span><textarea class="input" id="fDesc" rows="4">${esc(p.desc)}</textarea></div>
        <div class="lrow card" style="padding:12px 14px"><span><b style="font-size:14px">Visible sur le site</b><br><span class="muted">Masqué = le produit reste ici mais n'apparaît plus et ne peut plus être commandé.</span></span><button class="switch${p.hidden ? '' : ' is-on'}" type="button" id="fVisible"></button></div>
        <p class="co__err" id="fErr"></p>
      </div>
      <div class="dr__foot">
        ${isNew ? '' : '<button class="btn btn--ghost" type="button" data-del style="flex:0 0 auto">Supprimer</button><button class="btn btn--ghost" type="button" data-dup style="flex:0 0 auto">Dupliquer</button>'}
        <button class="btn btn--ice" type="button" data-save>${isNew ? 'Ajouter le produit' : 'Enregistrer'}</button>
      </div>`;

    const refreshPhotos = () => { $('#pPhotos', dr).innerHTML = photosHTML(); bindDrop(); };
    async function addFiles(files) {
      for (const f of files) {
        const ph = document.createElement('div'); ph.className = 'photo'; ph.innerHTML = '<div class="drop" style="border:0">Envoi…</div>';
        $('#pDrop', dr).before(ph);
        try { p.images.push(await upload(f, 900)); } catch (err) { toast(err.message, true); }
      }
      refreshPhotos();
    }
    function bindDrop() {
      const d = $('#pDrop', dr);
      d.addEventListener('click', async () => addFiles(await pickFiles(true)));
      d.addEventListener('dragover', (e) => { e.preventDefault(); d.classList.add('is-over'); });
      d.addEventListener('dragleave', () => d.classList.remove('is-over'));
      d.addEventListener('drop', (e) => { e.preventDefault(); d.classList.remove('is-over'); addFiles(Array.from(e.dataTransfer.files || [])); });
    }
    bindDrop();
    $('#pPhotos', dr).addEventListener('click', (e) => {
      const mv = e.target.closest('[data-mv]'), rm = e.target.closest('[data-rm]');
      if (mv) { const i = +mv.dataset.mv, j = i + (+mv.dataset.d); if (j >= 0 && j < p.images.length) { [p.images[i], p.images[j]] = [p.images[j], p.images[i]]; refreshPhotos(); } }
      if (rm) { p.images.splice(+rm.dataset.rm, 1); refreshPhotos(); }
    });
    $('#fSizes', dr).addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) b.classList.toggle('is-on'); });
    $('#fVisible', dr).addEventListener('click', (e) => e.currentTarget.classList.toggle('is-on'));
    $('[data-x]', dr).addEventListener('click', close);

    function collect() {
      p.name = $('#fName', dr).value.trim();
      p.cat = $('#fCat', dr).value;
      p.gender = $('#fGender', dr).value;
      p.price = Math.round(+$('#fPrice', dr).value || 0);
      const old = Math.round(+$('#fOld', dr).value || 0);
      if (old > p.price) p.oldPrice = old; else delete p.oldPrice;
      p.color = $('#fColor', dr).value.trim();
      p.badge = $('#fBadge', dr).value.trim();
      p.sizes = $$('#fSizes .is-on', dr).map((b) => b.dataset.s);
      p.desc = $('#fDesc', dr).value.trim();
      if ($('#fVisible', dr).classList.contains('is-on')) delete p.hidden; else p.hidden = true;
      const err = !p.name ? 'Donne un nom au produit.' : !p.images.length ? 'Ajoute au moins une photo.' : !p.sizes.length ? 'Choisis au moins une taille.' : p.price <= 0 ? 'Indique un prix.' : '';
      $('#fErr', dr).textContent = err;
      return !err;
    }
    const newId = (name) => (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'produit') + '-' + Math.random().toString(36).slice(2, 6);

    $('[data-save]', dr).addEventListener('click', () => {
      if (!collect()) return;
      if (isNew) { p.id = newId(p.name); draft.products.unshift(p); }
      else draft.products[draft.products.findIndex((x) => x.id === orig.id)] = p;
      changed(); close(); renderProducts(); toast('Produit enregistré (brouillon). Clique sur Publier.');
    });
    const del = $('[data-del]', dr);
    if (del) del.addEventListener('click', () => {
      if (!confirm(`Supprimer « ${orig.name} » ?`)) return;
      draft.products = draft.products.filter((x) => x.id !== orig.id);
      changed(); close(); renderProducts();
    });
    const dup = $('[data-dup]', dr);
    if (dup) dup.addEventListener('click', () => {
      if (!collect()) return;
      const c = clone(p); c.id = newId(p.name); c.name = p.name + ' (copie)';
      draft.products.splice(draft.products.findIndex((x) => x.id === orig.id) + 1, 0, c);
      changed(); close(); renderProducts(); openProduct(c);
    });
  }

  // =====================================================================
  // CATÉGORIES
  // =====================================================================
  function renderCategories() {
    const cats = draft.categories;
    const coverOptions = (sel) => draft.products.map((p) => p.images[0]).filter((v, i, a) => a.indexOf(v) === i)
      .map((n) => `<option value="${esc(n)}"${n === sel ? ' selected' : ''}>${esc(n.startsWith('m/') ? 'Photo importée ' + n.slice(2, 8) : n.replace(/^ironcold-/, ''))}</option>`).join('');
    $('#view').innerHTML = `<div class="stack">
      <p class="muted">L'ordre ici est l'ordre sur le site. Une catégorie ne peut être supprimée que si elle est vide.</p>
      ${cats.map((c, i) => `<div class="card cat-card" data-i="${i}">
        <img src="${esc(imgUrl(c.cover, true))}" alt="">
        <div class="stack">
          <div class="grid2">
            <div><span class="lbl">Nom</span><input class="input" data-f="label" value="${esc(c.label)}"></div>
            <div><span class="lbl">Nom court (cartes)</span><input class="input" data-f="short" value="${esc(c.short)}"></div>
          </div>
          <div><span class="lbl">Phrase</span><input class="input" data-f="tagline" value="${esc(c.tagline)}"></div>
          <div><span class="lbl">Photo de couverture</span><select class="input" data-f="cover">${coverOptions(c.cover)}</select></div>
          <div class="row">
            <span class="muted">${draft.products.filter((p) => p.cat === c.id).length} produits</span>
            <span style="flex:1"></span>
            <button class="mini-btn" type="button" data-mv="-1">↑</button><button class="mini-btn" type="button" data-mv="1">↓</button>
            <button class="mini-btn mini-btn--danger" type="button" data-del>Supprimer</button>
          </div>
        </div></div>`).join('')}
      <button class="btn btn--ghost" type="button" id="catAdd">＋ Nouvelle catégorie</button>
    </div>`;
    $('#view').oninput = (e) => {
      const f = e.target.closest('[data-f]'); if (!f) return;
      const i = +f.closest('[data-i]').dataset.i;
      cats[i][f.dataset.f] = f.value;
      if (f.dataset.f === 'cover') f.closest('.cat-card').querySelector('img').src = imgUrl(f.value, true);
      changed();
    };
    $('#view').onchange = $('#view').oninput;
    $('#view').onclick = (e) => {
      const card = e.target.closest('[data-i]');
      if (e.target.id === 'catAdd') {
        const label = prompt('Nom de la nouvelle catégorie (ex : Pantalons) ?');
        if (!label) return;
        const id = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
        if (cats.some((c) => c.id === id)) return toast('Cette catégorie existe déjà.', true);
        cats.push({ id, label, short: label, tagline: '', cover: (draft.products[0] || { images: [''] }).images[0] });
        changed(); renderCategories(); return;
      }
      if (!card) return;
      const i = +card.dataset.i;
      const mv = e.target.closest('[data-mv]');
      if (mv) { const j = i + (+mv.dataset.mv); if (j >= 0 && j < cats.length) { [cats[i], cats[j]] = [cats[j], cats[i]]; changed(); renderCategories(); } }
      if (e.target.closest('[data-del]')) {
        if (draft.products.some((p) => p.cat === cats[i].id)) return toast('Déplace ou supprime d’abord les produits de cette catégorie.', true);
        cats.splice(i, 1); changed(); renderCategories();
      }
    };
  }

  // =====================================================================
  // ANNONCES & CONTACT
  // =====================================================================
  function renderSettings() {
    const s = S();
    s.announcements = s.announcements || [];
    $('#view').innerHTML = `<div class="stack" style="max-width:820px">
      <div class="card"><h3>Bande d'annonces</h3><p class="muted" style="margin-bottom:12px">Les messages qui défilent tout en haut du site (IRONCOLD s'ajoute entre chaque message).</p>
        <div class="stack" id="annList">${s.announcements.map((a, i) => `<div class="ann-row" data-i="${i}"><input class="input" value="${esc(a)}"><button class="mini-btn" type="button" data-mv="-1">↑</button><button class="mini-btn" type="button" data-mv="1">↓</button><button class="mini-btn mini-btn--danger" type="button" data-rm>✕</button></div>`).join('')}</div>
        <button class="mini-btn" type="button" id="annAdd" style="margin-top:12px">＋ Ajouter un message</button></div>
      <div class="card"><h3>Contact</h3>
        <div class="stack">
          <div><span class="lbl">Numéro WhatsApp (format 2126…)</span><input class="input" id="sWa" value="${esc(s.whatsapp)}" inputmode="numeric"></div>
          <div class="grid2">
            <div><span class="lbl">Email</span><input class="input" id="sEmail" value="${esc(s.email)}"></div>
            <div><span class="lbl">Instagram (sans @)</span><input class="input" id="sInsta" value="${esc(s.instagram)}"></div>
          </div>
        </div></div>
      <div class="card"><h3>Remise à zéro</h3><p class="muted" style="margin-bottom:12px">${Object.keys(s.texts || {}).length} textes modifiés · ${Object.keys(s.images || {}).length} photos remplacées · ${(s.hidden || []).length} sections masquées.</p>
        <button class="mini-btn mini-btn--danger" type="button" id="resetContent">Remettre tous les textes, photos et sections d'origine</button></div>
    </div>`;
    const annList = $('#annList');
    annList.addEventListener('input', (e) => { const r = e.target.closest('[data-i]'); s.announcements[+r.dataset.i] = e.target.value; changed(); });
    annList.addEventListener('click', (e) => {
      const r = e.target.closest('[data-i]'); if (!r) return;
      const i = +r.dataset.i;
      const mv = e.target.closest('[data-mv]');
      if (mv) { const j = i + (+mv.dataset.mv); if (j >= 0 && j < s.announcements.length) { [s.announcements[i], s.announcements[j]] = [s.announcements[j], s.announcements[i]]; changed(); renderSettings(); } }
      if (e.target.closest('[data-rm]')) { s.announcements.splice(i, 1); changed(); renderSettings(); }
    });
    $('#annAdd').addEventListener('click', () => { s.announcements.push('Nouveau message'); changed(); renderSettings(); });
    $('#sWa').addEventListener('input', (e) => { s.whatsapp = e.target.value.replace(/\D/g, ''); changed(); });
    $('#sEmail').addEventListener('input', (e) => { s.email = e.target.value.trim(); changed(); });
    $('#sInsta').addEventListener('input', (e) => { s.instagram = e.target.value.trim().replace(/^@/, ''); changed(); });
    $('#resetContent').addEventListener('click', () => {
      if (!confirm('Remettre tous les textes, photos et sections comme à l’origine ?')) return;
      s.texts = {}; s.images = {}; s.hidden = [];
      changed(); renderSettings();
    });
  }

  // =====================================================================
  // COMMANDES
  // =====================================================================
  let of = 'all';
  async function renderOrders() {
    $('#view').innerHTML = '<p class="muted">Chargement des commandes…</p>';
    let list;
    try { list = await loadOrders(true); } catch (err) { $('#view').innerHTML = `<div class="empty-box">${esc(err.message)}</div>`; return; }
    const draw = () => {
      const shown = list.filter((o) => of === 'all' || o.status === of);
      $('#view').innerHTML = `
        <div class="ptools"><div class="chips" id="oF"><button class="chip${of === 'all' ? ' is-on' : ''}" type="button" data-f="all">Toutes (${list.length})</button>${Object.entries(STATUS).map(([k, [l]]) => `<button class="chip${of === k ? ' is-on' : ''}" type="button" data-f="${k}">${l} (${list.filter((o) => o.status === k).length})</button>`).join('')}</div>
        <button class="mini-btn" type="button" id="oRefresh">↻ Actualiser</button></div>
        <div class="orders">${shown.length ? shown.map((o) => {
          const [l, col] = STATUS[o.status] || STATUS.new;
          const ref = o.id.slice(-6).toUpperCase();
          const phone = String(o.phone || '');
          const intl = phone.replace(/\D/g, '').replace(/^0/, '212');
          const client = o.confirmedBy === 'client' ? ' · ✅ confirmée par le client' : o.cancelledBy === 'client' ? ' · ❌ annulée par le client' : '';
          return `<div class="order" data-id="${esc(o.id)}">
            <div>
              <div class="order__top"><b>${esc(o.name)}</b><span class="badge-st" style="background:${col}22;color:${col}">${l}</span><span class="muted">N° ${ref} · ${new Date(o.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${client}</span></div>
              <div class="muted" style="margin-top:4px">📍 ${esc(o.city)}, ${esc(o.address)} · 📞 <a href="tel:${esc(phone)}">${esc(phone)}</a> · <a href="https://wa.me/${esc(intl)}" target="_blank" rel="noopener">WhatsApp</a></div>
              <div class="order__items">${(o.items || []).map((i) => `• ${esc(i.name)} — ${esc(i.color)} — ${esc(i.size)} ×${i.qty}`).join('<br>')}</div>
            </div>
            <div class="order__side"><strong>${money(o.total)}</strong>
              <select class="input" data-st style="min-height:36px;width:auto">${Object.entries(STATUS).map(([k, [lab]]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${lab}</option>`).join('')}</select>
              <button class="mini-btn mini-btn--danger" type="button" data-del>Supprimer</button></div>
          </div>`;
        }).join('') : '<div class="empty-box">Aucune commande ici pour le moment.</div>'}</div>`;
      $('#oF').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { of = b.dataset.f; draw(); } });
      $('#oRefresh').addEventListener('click', renderOrders);
      $('#view').onchange = async (e) => {
        const sel = e.target.closest('[data-st]'); if (!sel) return;
        const id = sel.closest('[data-id]').dataset.id;
        try { await api('PATCH', '/orders', { id, status: sel.value }); list.find((o) => o.id === id).status = sel.value; toast('Statut mis à jour.'); draw(); }
        catch (err) { toast(err.message, true); }
      };
      $('#view').onclick = async (e) => {
        const b = e.target.closest('[data-del]'); if (!b) return;
        const id = b.closest('[data-id]').dataset.id;
        if (!confirm('Supprimer définitivement cette commande ?')) return;
        try { await api('DELETE', '/orders', { id }); list = list.filter((o) => o.id !== id); orders = list; draw(); toast('Commande supprimée.'); }
        catch (err) { toast(err.message, true); }
      };
    };
    $('#view').oninput = null;
    draw();
  }

  // ---------- start ----------
  const saved = localStorage.getItem('ic_admin_pass') || sessionStorage.getItem('ic_admin_pass');
  if (saved) login(saved, !!localStorage.getItem('ic_admin_pass')).catch(() => { localStorage.removeItem('ic_admin_pass'); sessionStorage.removeItem('ic_admin_pass'); });
})();
