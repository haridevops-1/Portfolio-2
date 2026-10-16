(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  $('#themeToggle').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.add('theme-anim');
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { }
    setTimeout(() => document.body.classList.remove('theme-anim'), 500);
  });

  /* ---------- Intro loader ---------- */
  const loader = $('#loader');
  $$('.loader-name span').forEach((s, i) => s.style.setProperty('--n', i));
  document.body.classList.add('loading');
  let pageLoaded = false;
  addEventListener('load', () => { pageLoaded = true; });

  const startReveal = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('active'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  };
  const finishLoader = () => {
    loader.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(startReveal, 450);
    setTimeout(() => loader.classList.add('gone'), 1400);
  };

  const count = $('#loaderCount'), line = $('#loaderLine');
  const DURATION = reduce ? 0 : 2300;
  const t0 = performance.now();
  (function tick(now) {
    const p = DURATION ? Math.min(1, Math.max(0, (now - t0) / DURATION)) : 1;
    const eased = 1 - Math.pow(1 - p, 3);
    const shown = Math.round(eased * 100);
    count.textContent = shown;
    line.style.transform = `scaleX(${eased})`;
    if (p < 1 || !pageLoaded) {
      // never finish before the page itself has loaded
      if (p >= 1) { count.textContent = 100; line.style.transform = 'scaleX(1)'; }
      requestAnimationFrame(tick);
    } else {
      setTimeout(finishLoader, 250);
    }
  })(t0);

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Scroll: progress, header, timeline ---------- */
  const bar = $('#scrollProgress'), header = $('#header');
  const tl = $('#timeline'), tlFill = $('#timelineFill'), tlItems = $$('.tl-item', tl);
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    header.classList.toggle('scrolled', scrollY > 20);
    const r = tl.getBoundingClientRect();
    tlFill.style.height = Math.min(100, Math.max(0, (innerHeight * 0.6 - r.top) / r.height * 100)) + '%';
    tlItems.forEach((s) => s.classList.toggle('lit', s.getBoundingClientRect().top < innerHeight * 0.6));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Nav ---------- */
  const nav = $('#nav'), burger = $('#burger');
  const navItems = $$('.nav-item');
  const setActive = (id) => navItems.forEach((n) => n.classList.toggle('active', n.getAttribute('href') === '#' + id));
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('section[id]').forEach((s) => secIO.observe(s));
  setActive('home');
  const closeMenu = () => { nav.classList.remove('open'); header.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  navItems.forEach((n) => n.addEventListener('click', closeMenu));

  /* ---------- Skills tabs (glider, staggered tiles, count-up) ---------- */
  const tabs = $$('.tab'), panels = $$('.panel'), glider = $('#tabGlider');
  const activeTab = () => tabs.find((t) => t.classList.contains('active'));
  const moveGlider = (t) => {
    if (!t) return;
    glider.style.width = t.offsetWidth + 'px';
    glider.style.transform = `translateX(${t.offsetLeft - 6}px)`;
  };
  const snapGlider = () => {
    glider.style.transition = 'none';
    moveGlider(activeTab());
    requestAnimationFrame(() => requestAnimationFrame(() => { glider.style.transition = ''; }));
  };
  const countUp = (panel) => {
    const b = $('.count b', panel);
    if (!b) return;
    const to = +b.dataset.to;
    if (reduce) { b.textContent = to; return; }
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, Math.max(0, (now - t0) / 900));
      b.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    if (t.classList.contains('active')) return;
    tabs.forEach((x) => x.classList.toggle('active', x === t));
    panels.forEach((p) => {
      p.classList.remove('active');
      if (p.dataset.p === t.dataset.p) { void p.offsetWidth; p.classList.add('active'); countUp(p); }
    });
    moveGlider(t);
  }));
  snapGlider();
  addEventListener('resize', snapGlider);
  addEventListener('load', snapGlider);
  document.fonts && document.fonts.ready.then(snapGlider);
  const skillsIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { countUp($('.panel.active')); skillsIO.disconnect(); }
  }), { threshold: 0.3 });
  skillsIO.observe($('.skills-wrap'));

  /* ---------- Skills marquee (built from all tiles, runs right to left) ---------- */
  const track = $('#marqueeTrack');
  if (track) {
    const chips = $$('.tile').map((t) => {
      const c = document.createElement('span');
      if (t.classList.contains('zoho')) {
        const img = $('img', t);
        c.className = 'm-chip logo';
        c.innerHTML = `<img src="${img.getAttribute('src')}" alt="" />`;
      } else {
        const img = $('.t-ico img', t);
        c.className = 'm-chip';
        c.innerHTML = `<img src="${img.getAttribute('src')}" alt="" ${img.classList.contains('icon-invert') ? 'class="icon-invert"' : ''} />` + $('b', t).textContent;
      }
      return c;
    });
    chips.forEach((c) => track.appendChild(c));
    chips.forEach((c) => track.appendChild(c.cloneNode(true)));
  }

  /* ---------- Memory lightbox ---------- */
  const lb = $('#lightbox');
  const openLb = (m) => {
    const img = $('img', m);
    $('#lbImg').src = img.src; $('#lbImg').alt = img.alt;
    $('#lbTag').textContent = m.dataset.tag;
    $('#lbTitle').textContent = m.dataset.title;
    $('#lbText').textContent = m.dataset.text;
    const link = $('#lbLink');
    if (m.dataset.link) { link.href = m.dataset.link; link.style.display = ''; $('#lbCta').textContent = m.dataset.cta || 'View Details'; }
    else link.style.display = 'none';
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    label.classList.remove('show');
  };
  const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  $$('.memory').forEach((m) => m.addEventListener('click', () => openLb(m)));
  $$('[data-close]', lb).forEach((el) => el.addEventListener('click', closeLb));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeLb());

  /* ---------- Hover: soft aura + "View story" label ---------- */
  const aura = $('#cursorAura'), label = $('#cursorLabel');
  if (fine && !reduce) {
    document.body.classList.add('has-aura');
    let ax = innerWidth / 2, ay = innerHeight / 2, tx = ax, ty = ay, lx = 0, ly = 0;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; lx = tx; ly = ty + 34; });
    (function loop() {
      ax += (tx - ax) * .08; ay += (ty - ay) * .08;
      aura.style.transform = `translate(${ax}px,${ay}px)`;
      label.style.transform = `translate(calc(${lx}px - 50%), calc(${ly}px - 50%))`;
      requestAnimationFrame(loop);
    })();
    $$('.memory').forEach((m) => {
      m.addEventListener('mouseenter', () => label.classList.add('show'));
      m.addEventListener('mouseleave', () => label.classList.remove('show'));
    });
  }
})();
