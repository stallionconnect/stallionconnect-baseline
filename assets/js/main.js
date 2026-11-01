/* Stallion Connect Pvt Ltd — site scripts (ES module) */

/*
 * Form submissions
 * Paste a form endpoint here (for example from formspree.io) to receive
 * enquiries and job applications by email. While it is empty the forms run
 * in demo mode: they show the thank-you message but nothing is sent.
 */
const FORM_ENDPOINT = '';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const isMobile = () => matchMedia('(max-width: 768px)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);

/* ---------- adaptive rem: scale up above the 1920px design width ---------- */
const FONT_BASE = 16, BASE_W = 1920, COEF = 0.6666;
function fitRoot() {
  const reduction = ((BASE_W - innerWidth) / BASE_W) * 100 * COEF;
  const size = FONT_BASE - (FONT_BASE * reduction) / 100;
  if (size > FONT_BASE) html.style.fontSize = size + 'px';
  else html.style.removeProperty('font-size');
}
fitRoot();
addEventListener('resize', fitRoot);

/* ---------- scrolling: the browser's own, which stays smooth while the page is busy ---------- */
let locks = 0;
function lock() {
  if (locks++ === 0) html.classList.add('locked');
}
function unlock() {
  if (locks > 0 && --locks === 0) html.classList.remove('locked');
}
// scroll-padding-top in the CSS leaves room for the fixed header
function scrollToEl(el) {
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* ---------- springs (tension / friction, integrated in 1ms steps) ---------- */
const springs = new Set();
function spring(init, [tension, friction], apply) {
  const s = { cur: { ...init }, vel: {}, tgt: { ...init }, tension, friction, apply, timer: 0 };
  for (const k in init) s.vel[k] = 0;
  s.to = (target, delay = 0) => {
    clearTimeout(s.timer);
    const go = () => { Object.assign(s.tgt, target); springs.add(s); kick(); };
    delay > 0 ? (s.timer = setTimeout(go, delay)) : go();
  };
  apply(s.cur, true);
  return s;
}
function stepSprings(dt) {
  const n = Math.max(1, Math.round(dt * 1000)), h = dt / n;
  for (const s of springs) {
    let moving = false;
    for (const k in s.tgt) {
      let x = s.cur[k], v = s.vel[k] || 0;
      const t = s.tgt[k];
      for (let i = 0; i < n; i++) {
        v += (-s.tension * (x - t) - s.friction * v) * h;
        x += v * h;
      }
      if (Math.abs(x - t) < 1e-3 && Math.abs(v) < 1e-2) { x = t; v = 0; } else moving = true;
      s.cur[k] = x; s.vel[k] = v;
    }
    s.apply(s.cur, !moving);
    if (!moving) springs.delete(s);
  }
}

/* ---------- main loop: runs only while a spring is moving or the parallax needs updating ---------- */
let looping = false, lastFrame = 0, parallaxDirty = false;
function frame(t) {
  const dt = lastFrame ? Math.min(0.064, Math.max(0, (t - lastFrame) / 1000)) : 1 / 60;
  lastFrame = t;
  if (springs.size) stepSprings(dt);
  if (parallaxDirty) { parallaxDirty = false; updateParallax(); }
  if (springs.size) requestAnimationFrame(frame);
  else { looping = false; lastFrame = 0; }
}
function kick() {
  if (!looping) { looping = true; requestAnimationFrame(frame); }
}

// 3D (its own GPU layer) only while moving; at rest a 2D transform, or none at all,
// so revealed elements don't each keep a layer
function tf(el, extra = '') {
  return (v, settled = false) => {
    if ('opacity' in v) el.style.opacity = v.opacity;
    const x = v.x || 0, y = v.y || 0, scale = v.scale ?? 1, rotate = v.rotate || 0;
    if (!settled) el.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${rotate}deg) ${extra}`;
    else if (x || y || scale !== 1 || rotate) el.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rotate}deg) ${extra}`;
    else el.style.transform = extra || 'none';
  };
}
const IDENTITY = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 };
const toIdentity = (from) => Object.fromEntries(Object.keys(from).map((k) => [k, IDENTITY[k]]));

/* ---------- loader gate: hero reveals wait for this ---------- */
let isReady = false;
const readyQueue = [];
const onReady = (f) => (isReady ? f() : readyQueue.push(f));
function setReady() {
  if (isReady) return;
  isReady = true;
  readyQueue.splice(0).forEach((f) => f());
}

/* ---------- in-view reveals ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    (e.target._seen || []).forEach((f) => f());
  }
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
function whenSeen(el, f) { (el._seen ||= []).push(f); io.observe(el); }

for (const el of $$('[data-iv]')) {
  const o = JSON.parse(el.dataset.iv);
  const s = spring({ ...o.f }, o.c, tf(el, el.dataset.tf || ''));
  whenSeen(el, () => (o.g ? onReady : (f) => f())(() => s.to(toIdentity(o.f), o.d || 0)));
}

/* ---------- hover springs (off on touch-sized screens) ---------- */
function hover(trigger, target, from, to, cfg, extra = '') {
  const s = spring({ ...from }, cfg, tf(target, extra));
  trigger.addEventListener('pointerenter', () => { if (!isMobile()) s.to(to); });
  trigger.addEventListener('pointerleave', () => s.to(from));
}
$$('.pill').forEach((b) => { const svg = $('svg', b); if (svg) hover(b, svg, { x: 0 }, { x: 5 }, [320, 20]); });
$$('.arrow-btn').forEach((b) => {
  const svg = $('svg', b);
  hover(b, svg, { scale: 1 }, { scale: 1.15 }, [320, 18], svg.hasAttribute('data-flip') ? 'scaleX(-1)' : '');
});
$$('.x-btn').forEach((b) => hover(b, $('svg', b), { rotate: 0 }, { rotate: 90 }, [300, 18]));
$$('.rows a').forEach((a) => { const svg = $('.row-arrow svg', a); if (svg) hover(a, svg, { x: 0, opacity: 0.55 }, { x: 8, opacity: 1 }, [300, 20]); });
$$('[data-lift]').forEach((c) => hover(c, c, { y: 0 }, { y: -8 }, [300, 22]));
$$('[data-zoom]').forEach((t) => { const img = $('img', t); if (img) hover(t, img, { scale: 1 }, { scale: 1.03 }, [300, 22]); });

/* ---------- text reveals ---------- */
function prepLines(el) {
  const stagger = +(el.dataset.stagger ?? 120), base = +(el.dataset.base ?? 0), dur = el.dataset.dur;
  $$('.ln > span, .wd > span', el).forEach((sp, i) => {
    sp.style.transitionDelay = base + i * stagger + 'ms';
    if (dur) sp.style.transitionDuration = dur + 'ms';
  });
}
function splitWords(el, cls) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const outer = document.createElement('span');
    if (cls === 'wd') { outer.className = 'wd'; outer.innerHTML = '<span></span>'; outer.firstChild.textContent = w; }
    else { outer.className = 'fw'; outer.textContent = w; }
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}
function refire(el) {
  el.classList.add('reset');
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.remove('reset');
  requestAnimationFrame(() => el.classList.add('on'));
}

// word-by-word clip reveal (hero titles)
for (const el of $$('[data-words]')) {
  if (!el.querySelector('.ln')) splitWords(el, 'wd');
  prepLines(el);
}
// headlines that must not run past their box
const fitEls = $$('[data-fit]');
function fitTitles() {
  for (const el of fitEls) {
    el.style.fontSize = '';
    const wrap = el.parentElement, cs = getComputedStyle(wrap);
    const avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const base = parseFloat(getComputedStyle(el).fontSize);
    if (el.scrollWidth > avail) el.style.fontSize = (base * avail / el.scrollWidth).toFixed(2) + 'px';
  }
}
fitTitles();
document.fonts?.ready.then(fitTitles);
addEventListener('resize', fitTitles);

// stacked line reveals
for (const el of $$('.sl')) {
  prepLines(el);
  if (!el.hasAttribute('data-gate')) whenSeen(el, () => el.classList.add('on'));
}
$$('[data-gate]').forEach((el) => onReady(() => el.classList.add('on')));

// soft word fade for body copy
for (const el of $$('.fade-words')) {
  splitWords(el, 'fw');
  $$('.fw', el).forEach((w, i) => (w.style.transitionDelay = 250 + i * 28 + 'ms'));
  whenSeen(el, () => el.classList.add('on'));
}

/* ---------- carousel dots ---------- */
function renderDots(el, count, active, onPick, label) {
  el.innerHTML = Array.from({ length: count }, (_, i) =>
    `<button type="button" aria-label="${label} ${i + 1}"${i === active ? ' aria-current="true"' : ''}><i></i></button>`).join('');
  $$('button', el).forEach((b, i) => b.addEventListener('click', () => onPick(i)));
}
function setDots(el, active) {
  $$('button', el).forEach((b, i) => (i === active ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- hero card slider (home) ---------- */
const collStage = $('#coll-stage');
if (collStage) {
  const slides = JSON.parse(collStage.dataset.slides);
  const dots = $('#coll-dots');
  const HIDDEN = { opacity: 0, y: 16, scale: 0.96 }, SHOWN = { opacity: 1, y: 0, scale: 1 };
  let ci = 0, timer = 0, cur = null;
  const show = (i, first = false) => {
    if (cur) {
      const { el, s } = cur;
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      s.to(HIDDEN);
      setTimeout(() => el.remove(), 900);
    }
    ci = i;
    const d = slides[i];
    const el = document.createElement('div');
    el.className = 'coll-card glass';
    el.innerHTML = `<img src="${esc(d.img)}" alt="${esc(d.alt)}" loading="lazy">
      <div><div class="b">${esc(d.brand)}</div><div class="t">${esc(d.title)}</div><a href="${esc(d.href)}">${esc(d.cta)} →</a></div>`;
    collStage.appendChild(el);
    const s = spring(first ? { ...SHOWN } : { ...HIDDEN }, [210, 24], tf(el));
    s.to(SHOWN);
    cur = { el, s };
    setDots(dots, i);
  };
  const start = () => { clearInterval(timer); timer = setInterval(() => show((ci + 1) % slides.length), 3800); };
  renderDots(dots, slides.length, 0, (i) => { if (i !== ci) { show(i); if (isReady) start(); } }, 'Show slide');
  show(0, true);
  onReady(start);
}

/* ---------- ghost-word carousel ---------- */
const ghost = $('#ghost-title');
if (ghost) {
  const slides = JSON.parse(ghost.dataset.slides);
  const words = $$('.gw .ln > span', ghost);
  const imgs = $('#coach-imgs'), dots = $('#ghost-dots');
  let gi = 0, seen = false;
  whenSeen(ghost, () => { seen = true; ghost.classList.add('on'); });
  const set = (i) => {
    gi = (i + slides.length) % slides.length;
    const d = slides[gi];
    words.forEach((w, k) => (w.textContent = d.words[k]));
    if (seen) refire(ghost);
    $('#coach-name').textContent = d.name;
    $('#coach-role').textContent = d.role;
    const img = new Image();
    img.src = d.img;
    img.alt = d.alt;
    img.style.opacity = 0;
    imgs.appendChild(img);
    spring({ opacity: 0 }, [260, 26], (v) => (img.style.opacity = v.opacity)).to({ opacity: 1 });
    const olds = [...imgs.children].slice(0, -1);
    setTimeout(() => olds.forEach((o) => o.remove()), 900);
    setDots(dots, gi);
  };
  renderDots(dots, slides.length, 0, (i) => i !== gi && set(i), 'Show slide');
  $('#ghost-prev').addEventListener('click', () => set(gi - 1));
  $('#ghost-next').addEventListener('click', () => set(gi + 1));
}

/* ---------- scroll parallax ---------- */
const parallax = [];
$$('[data-parallax]').forEach((el) => {
  const [a, b] = el.dataset.parallax.split(',').map(Number);
  parallax.push({ el, section: el.closest('section, .cta-tile') || el.parentElement, from: a, to: b, fmt: (v) => `translate3d(0,${v}%,0)` });
});
$$('[data-px]').forEach((el) => {
  const [a, b] = el.dataset.px.split(',').map(Number);
  parallax.push({ el, section: el.closest('section'), from: a, to: b, fmt: (v) => `translate3d(${v}%,0,0)` });
});
// section positions are cached (re-measured on resize and layout changes), so scrolling reads no layout
function measureParallax() {
  for (const p of parallax) {
    const r = p.section.getBoundingClientRect();
    p.top = r.top + scrollY;
    p.height = r.height;
  }
}
function updateParallax() {
  const vh = innerHeight, y = scrollY;
  for (const p of parallax) {
    const top = p.top - y;
    if (top + p.height < -50 || top > vh + 50) continue;
    const prog = Math.min(1, Math.max(0, (vh - top) / (vh + p.height)));
    p.el.style.transform = p.fmt(p.from + (p.to - p.from) * prog);
  }
}
function requestParallax() { parallaxDirty = true; kick(); }
function remeasureParallax() { measureParallax(); requestParallax(); }
addEventListener('scroll', requestParallax, { passive: true });
addEventListener('resize', remeasureParallax);
new ResizeObserver(remeasureParallax).observe(document.body);
measureParallax();
requestParallax();

/* ---------- same-page anchors ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (!a || a.closest('#menu')) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  scrollToEl(target);
  history.replaceState(null, '', url.hash);
});

/* ---------- fixed header: floats as a pill once the page scrolls ---------- */
const siteHeader = $('#site-header');
const updateHeader = () => siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
addEventListener('scroll', updateHeader, { passive: true });

/* ---------- fullscreen menu ---------- */
const menu = $('#menu'), burger = $('#burger');
let menuOpen = false;
const menuBack = spring({ opacity: 0 }, [260, 30], (v) => ($('#menu-back').style.opacity = v.opacity));
const menuPanel = spring({ opacity: 0, y: -24 }, [220, 28], tf($('#menu-panel')));
const menuLinks = $$('#menu-nav a').map((a) => ({ a, s: spring({ opacity: 0, y: 28 }, [200, 26], tf(a)) }));
function openMenu() {
  if (menuOpen) return;
  menuOpen = true;
  menu.inert = false; menu.classList.add('open');
  burger.setAttribute('aria-expanded', 'true');
  lock();
  menuBack.to({ opacity: 1 });
  menuPanel.to({ opacity: 1, y: 0 });
  menuLinks.forEach(({ s }, i) => s.to({ opacity: 1, y: 0 }, 120 + i * 70));
  setTimeout(() => $('#menu-close').focus(), 60);
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menu.inert = true; menu.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  menuBack.to({ opacity: 0 });
  menuPanel.to({ opacity: 0, y: -24 });
  menuLinks.forEach(({ s }) => s.to({ opacity: 0, y: 28 }));
  unlock();
  burger.focus({ preventScroll: true });
}
burger.addEventListener('click', openMenu);
$('#menu-close').addEventListener('click', closeMenu);
$('#menu-back').addEventListener('click', closeMenu);
$$('#menu a').forEach((a) => a.addEventListener('click', (e) => {
  const url = new URL(a.href, location.href);
  if (url.pathname === location.pathname && url.hash) {
    const target = document.getElementById(url.hash.slice(1));
    if (target) { e.preventDefault(); closeMenu(); scrollToEl(target); return; }
  }
  if (url.pathname === location.pathname && !url.hash) { e.preventDefault(); closeMenu(); }
}));
$('#menu-quote').addEventListener('click', () => { closeMenu(); openModal(); });

/* ---------- quote modal ---------- */
const modal = $('#modal'), quoteForm = $('#quote-form'), quoteSuccess = $('#quote-success');
let modalOpen = false, resetTimer = 0;
const modalBack = spring({ opacity: 0 }, [240, 30], (v) => ($('#modal-back').style.opacity = v.opacity));
const modalPanel = spring({ opacity: 0, y: 28, scale: 0.96 }, [240, 26], tf($('#modal-panel')));
const modalTitle = $('#modal-title');
prepLines(modalTitle);
function openModal() {
  if (modalOpen) return;
  modalOpen = true;
  clearTimeout(resetTimer);
  modal.inert = false; modal.classList.add('open');
  lock();
  modalBack.to({ opacity: 1 });
  modalPanel.to({ opacity: 1, y: 0, scale: 1 });
  refire(modalTitle);
  setTimeout(() => $('#q-name').focus({ preventScroll: true }), 120);
}
function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  modal.inert = true; modal.classList.remove('open');
  modalBack.to({ opacity: 0 });
  modalPanel.to({ opacity: 0, y: 28, scale: 0.96 });
  unlock();
  resetTimer = setTimeout(() => {
    quoteForm.reset();
    quoteForm.hidden = false;
    quoteSuccess.hidden = true;
    $('.form-status', quoteForm).textContent = '';
  }, 350);
}
$$('[data-open-modal]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
$('#modal-close').addEventListener('click', closeModal);
$('#modal-back').addEventListener('click', closeModal);
$('#quote-done').addEventListener('click', closeModal);
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOpen) closeModal();
  else if (menuOpen) closeMenu();
});

/* ---------- forms: browser validation first, then fetch ---------- */
$$('form[data-form]').forEach((form) => {
  const status = $('.form-status', form);
  const submit = $('[type="submit"]', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const label = submit.innerHTML;
    const firstName = (form.elements.name?.value.trim().split(/\s+/)[0]) || 'there';
    submit.disabled = true;
    submit.textContent = 'Sending…';
    status.className = 'form-status';
    status.textContent = '';
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        console.warn('Stallion Connect: FORM_ENDPOINT is empty, so this form ran in demo mode and nothing was sent.');
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      form.reset();
      if (form === quoteForm) {
        $('#quote-success-text').textContent = `Thanks, ${firstName} — our team will be in touch shortly with next steps.`;
        form.hidden = true;
        quoteSuccess.hidden = false;
        $('#quote-done').focus({ preventScroll: true });
      } else {
        status.textContent = form.dataset.success;
        status.classList.add('is-success');
      }
    } catch (err) {
      status.textContent = 'Sorry, something went wrong. Please call or email us instead.';
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = label;
    }
  });
});

/* ---------- services page: highlight the sub-nav pill in view ---------- */
const subnav = $('.subnav-track');
if (subnav) {
  const links = new Map($$('a', subnav).map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const active = links.get(entry.target.id);
      links.forEach((a) => a.classList.toggle('is-active', a === active));
      if (active) subnav.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  links.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
}

/* ---------- careers: "Apply" pre-selects the role ---------- */
$$('[data-apply]').forEach((btn) => btn.addEventListener('click', () => {
  const position = $('#position');
  if (position) position.value = btn.dataset.apply;
}));

/* ---------- contact: pre-select service from ?service=… ---------- */
const serviceSelect = $('#service');
const requestedService = new URLSearchParams(location.search).get('service');
if (serviceSelect && requestedService && [...serviceSelect.options].some((o) => o.value === requestedService)) {
  serviceSelect.value = requestedService;
}

/* ---------- footer year ---------- */
$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- loader (home only); other pages reveal straight away ---------- */
const loader = $('#loader');
if (!loader || html.classList.contains('skip-intro')) {
  loader?.remove();
  setReady();
} else {
  const MIN_VISIBLE_MS = reduceMotion ? 200 : 1400, MAX_VISIBLE_MS = 2600, EXIT_MS = reduceMotion ? 0 : 850;
  const fill = $('#loader-fill');
  lock();
  spring({ opacity: 0, y: 16 }, [200, 22], tf($('#loader-mark'))).to({ opacity: 1, y: 0 });
  if (reduceMotion) fill.style.transition = 'transform 150ms linear';
  requestAnimationFrame(() => requestAnimationFrame(() => fill.classList.add('go')));
  let started = false, finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    setReady();
    unlock();
    if (EXIT_MS) loader.classList.add('exit');
    setTimeout(() => loader.remove(), EXIT_MS);
  };
  const startCountdown = () => { if (!started) { started = true; setTimeout(finish, MIN_VISIBLE_MS); } };
  if (document.readyState === 'complete') startCountdown();
  else addEventListener('load', startCountdown, { once: true });
  setTimeout(finish, MAX_VISIBLE_MS);
}
