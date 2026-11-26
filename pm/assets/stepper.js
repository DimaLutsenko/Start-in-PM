/* Кроковий формат уроку: один екран — одна думка, 4 кроки, прогрес і навігація. */
const Stepper = (() => {
  let screens = [], steps = [], idx = 0, lessonId = "", article;
  const KEY = (id) => `pmz-pos-${id}`;
  const PICKS = "pmz-picks-v1";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const arrowL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';

  const stepOf = (s) => +s.dataset.step || 0;
  const nameOf = (s) => s.dataset.name || (s.querySelector("h2, h1") || {}).textContent || "";
  const inStep = (k) => screens.filter((s) => stepOf(s) === k);

  function renderTop() {
    const cur = screens[idx], k = stepOf(cur);
    const box = document.getElementById("ls-steps");
    box.innerHTML = steps.map((name, i) => {
      const n = i + 1, list = inStep(n);
      const pos = list.indexOf(cur);
      const pct = k > n ? 100 : k === n ? ((pos + 1) / list.length) * 100 : 0;
      const state = k > n ? "done" : k === n ? "on" : "";
      return `<button type="button" class="st ${state}" data-jump="${n}"><span class="track"><span class="fill" style="width:${pct}%"></span></span><span class="nm">${n} · ${name}${k > n ? " ✓" : ""}</span></button>`;
    }).join("");
    const cnt = document.getElementById("ls-count");
    if (k === 0) cnt.textContent = "Старт уроку";
    else { const list = inStep(k); cnt.textContent = `Крок ${k} · екран ${list.indexOf(cur) + 1} з ${list.length}`; }
  }

  function renderFoot() {
    const foot = document.getElementById("ls-foot");
    const cur = screens[idx], k = stepOf(cur), next = screens[idx + 1], prev = screens[idx - 1];
    const list = k ? inStep(k) : [];
    const dots = list.map((s) => `<span class="dot ${s === cur ? "on" : list.indexOf(s) < list.indexOf(cur) ? "past" : ""}"></span>`).join("");
    let nextLabel = "";
    if (next) nextLabel = stepOf(next) !== k ? `Крок ${stepOf(next)}: ${steps[stepOf(next) - 1]}` : `Далі: ${nameOf(next)}`;
    foot.hidden = !!cur.dataset.nofoot;
    foot.innerHTML = `<div class="in">
      ${prev ? `<button type="button" class="btn ghost" data-prev>${arrowL}<span>Назад</span></button>` : "<span></span>"}
      <div class="dots" aria-hidden="true">${dots}</div>
      ${next ? `<button type="button" class="btn" data-next><span>${nextLabel}</span>${arrow}</button>` : "<span></span>"}
    </div>`;
  }

  function show(i, opts = {}) {
    idx = Math.max(0, Math.min(screens.length - 1, i));
    screens.forEach((s, j) => { s.hidden = j !== idx; });
    renderTop(); renderFoot();
    store.set(KEY(lessonId), screens[idx].id);
    try { history.replaceState(null, "", "#" + screens[idx].id); } catch (e) {}
    if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: opts.smooth ? "smooth" : "auto" });
    window.dispatchEvent(new Event("resize"));
  }
  const showId = (id) => { const j = screens.findIndex((s) => s.id === id); if (j >= 0) show(j); };

  function initPicks(rootEl) {
    let saved = {};
    try { saved = JSON.parse(store.get(PICKS)) || {}; } catch (e) {}
    rootEl.querySelectorAll(".pick").forEach((p, n) => {
      const key = `${lessonId}:${p.id || n}`;
      const out = p.querySelector(".pick-out");
      const opts = [...p.querySelectorAll(".pick-opt")];
      const choose = (b, persist) => {
        opts.forEach((o) => { o.classList.remove("chosen", "ok", "no"); o.setAttribute("aria-pressed", "false"); });
        b.classList.add("chosen", b.dataset.ok ? "ok" : "no");
        b.setAttribute("aria-pressed", "true");
        if (!b.dataset.ok) opts.filter((o) => o.dataset.ok).forEach((o) => o.classList.add("ok"));
        if (out) {
          out.hidden = false;
          out.className = "pick-out " + (b.dataset.ok ? "ok" : "no");
          out.innerHTML = `<b>${b.dataset.ok ? (p.dataset.yes || "Так.") : (p.dataset.nope || "Не зовсім.")}</b> ${b.dataset.say || ""}`;
        }
        if (persist) { saved[key] = opts.indexOf(b); store.set(PICKS, JSON.stringify(saved)); }
      };
      opts.forEach((b) => b.addEventListener("click", () => choose(b, true)));
      if (saved[key] != null && opts[saved[key]]) choose(opts[saved[key]], false);
    });
  }

  function initTabs(rootEl) {
    rootEl.querySelectorAll(".tabs").forEach((t) => {
      const btns = [...t.querySelectorAll("[data-tab]")];
      const panels = [...t.querySelectorAll("[data-panel]")];
      const sel = (v) => {
        btns.forEach((b) => { const on = b.dataset.tab === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
        panels.forEach((p) => { p.hidden = p.dataset.panel !== v; });
      };
      btns.forEach((b) => b.addEventListener("click", () => sel(b.dataset.tab)));
      if (btns[0]) sel((btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.tab);
    });
  }

  /* Стрічка часу: показує одну епоху, над нею — перемикач років */
  function initEras(rootEl) {
    rootEl.querySelectorAll(".eras").forEach((wrap) => {
      const items = [...wrap.querySelectorAll("ol.timeline > li")];
      if (!items.length) return;
      const nav = document.createElement("div");
      nav.className = "era-nav";
      nav.innerHTML = items.map((li, i) => {
        const yr = (li.querySelector(".yr") || {}).textContent || "";
        const [y, who] = yr.split("·").map((x) => x.trim());
        const add = li.dataset.add || "";
        return `<button type="button" data-era="${i}"><span class="pt"></span><span class="y">${y || ""}</span><span class="w">${who || ""}</span>${add ? `<span class="a">${add}</span>` : ""}</button>`;
      }).join("");
      wrap.insertBefore(nav, wrap.firstChild);
      const ctrl = document.createElement("div");
      ctrl.className = "era-ctrl";
      wrap.appendChild(ctrl);
      let cur = 0;
      const sel = (i) => {
        cur = (i + items.length) % items.length;
        items.forEach((li, j) => { li.hidden = j !== cur; });
        nav.querySelectorAll("button").forEach((b, j) => { b.classList.toggle("on", j === cur); b.classList.toggle("past", j < cur); });
        const nx = items[cur + 1];
        ctrl.innerHTML = `<span class="muted">Етап ${cur + 1} з ${items.length}</span>` +
          `<span class="row">${cur > 0 ? `<button type="button" class="btn ghost sm" data-era-go="${cur - 1}">${arrowL}<span>Попередній</span></button>` : ""}` +
          (nx ? `<button type="button" class="btn ghost sm" data-era-go="${cur + 1}"><span>${((nx.querySelector(".yr") || {}).textContent || "Далі").trim()}</span>${arrow}</button>` : "") + `</span>`;
      };
      nav.addEventListener("click", (e) => { const b = e.target.closest("[data-era]"); if (b) sel(+b.dataset.era); });
      ctrl.addEventListener("click", (e) => { const b = e.target.closest("[data-era-go]"); if (b) sel(+b.dataset.eraGo); });
      sel(0);
    });
  }

  function init() {
    article = document.querySelector(".lesson-body");
    if (!article) return;
    lessonId = document.body.dataset.lesson;
    steps = (article.dataset.steps || "Розбираємось|На прикладі «Слота»|Пробуємо|Перевіряємо").split("|");
    screens = [...article.querySelectorAll(":scope > section.screen")];
    initPicks(article); initTabs(article); initEras(article);

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-next]")) return show(idx + 1);
      if (e.target.closest("[data-prev]")) return show(idx - 1);
      const j = e.target.closest("[data-jump]");
      if (j) { const s = screens.find((x) => stepOf(x) === +j.dataset.jump); if (s) show(screens.indexOf(s)); return; }
      const g = e.target.closest("[data-goto]");
      if (g) { e.preventDefault(); return showId(g.dataset.goto); }
    });
    /* виділення з панелі нотаток: спершу відкриваємо потрібний екран */
    document.addEventListener("click", (e) => {
      const li = e.target.closest(".wb-list [data-go]");
      if (!li) return;
      const m = article.querySelector(`mark[data-hl="${li.dataset.go}"]`);
      const s = m && m.closest("section.screen");
      if (s && s.hidden) show(screens.indexOf(s), { keepScroll: true });
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight" && idx < screens.length - 1) show(idx + 1);
      if (e.key === "ArrowLeft" && idx > 0) show(idx - 1);
    });
    window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (id && screens[idx].id !== id) showId(id); });

    const want = location.hash.slice(1) || store.get(KEY(lessonId));
    const j = screens.findIndex((s) => s.id === want);
    show(j >= 0 ? j : 0);
  }

  return { init, show, showId };
})();
