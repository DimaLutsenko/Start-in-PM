/* Робочий зошит: нотатки, виділення з коментарями, поля завдань, експорт/імпорт.
   Усе зберігається в localStorage цього браузера. */
const WB = (() => {
  const KEY = "pmz-workbook-v1";
  const PROGRESS_KEY = "pmz-progress-v1";
  const empty = () => ({ notes: {}, fields: {}, highlights: {}, meta: {} });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === "object") return Object.assign(empty(), s);
    } catch (e) {}
    return empty();
  }
  let db = load();

  /* ---------- збереження і статус ---------- */
  let pill, saveTimer;
  function flash(text) {
    if (!pill) {
      pill = document.createElement("div");
      pill.className = "wb-status";
      pill.setAttribute("role", "status");
      document.body.appendChild(pill);
    }
    pill.textContent = text;
    pill.classList.add("show");
    clearTimeout(pill._t);
    pill._t = setTimeout(() => pill.classList.remove("show"), 1500);
  }
  function persist(quiet) {
    db.meta.updated = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      if (!quiet) flash("Збережено");
      return true;
    } catch (e) {
      flash("Не вдалося зберегти: браузер блокує сховище");
      return false;
    }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persist(false), 500);
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function autoGrow(el) {
    if (el.tagName !== "TEXTAREA") return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }

  /* ---------- поля завдань ---------- */
  function initFields(lid) {
    const store = db.fields[lid] || (db.fields[lid] = {});
    document.querySelectorAll("[data-field]").forEach((el, i) => {
      const id = el.dataset.field;
      const label = el.dataset.label || id;
      if (store[id]) el.value = store[id].v;
      requestAnimationFrame(() => autoGrow(el));
      el.addEventListener("input", () => {
        if (el.value.trim()) store[id] = { v: el.value, label, order: i };
        else delete store[id];
        autoGrow(el);
        saveSoon();
      });
    });
    const growAll = () => document.querySelectorAll("textarea[data-field]").forEach(autoGrow);
    let t;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(growAll, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(growAll);
  }

  /* ---------- текст уроку як один рядок ---------- */
  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.parentElement.closest("textarea, input, script, style, .wb-ignore")
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const list = [];
    let n;
    while ((n = walker.nextNode())) list.push(n);
    return list;
  }
  function textMap(root) {
    let text = "";
    const map = [];
    textNodes(root).forEach((n) => { map.push({ n, start: text.length }); text += n.nodeValue; });
    return { text, map };
  }
  function pointToOffset(container, offset, map) {
    if (container.nodeType === 3) {
      const e = map.find((m) => m.n === container);
      return e ? e.start + offset : null;
    }
    const child = container.childNodes[offset];
    if (child) {
      for (const m of map) {
        if (m.n === child || child.contains(m.n) || (child.compareDocumentPosition(m.n) & Node.DOCUMENT_POSITION_FOLLOWING)) return m.start;
      }
      return null;
    }
    let last = null;
    for (const m of map) if (container.contains(m.n)) last = m;
    return last ? last.start + last.n.nodeValue.length : null;
  }

  /* ---------- виділення ---------- */
  let root, lessonId;
  const hls = () => db.highlights[lessonId] || (db.highlights[lessonId] = []);

  function locate(h, text) {
    let best = -1, bestScore = -1, i = text.indexOf(h.quote);
    while (i !== -1) {
      let score = 0;
      const pre = text.slice(Math.max(0, i - h.prefix.length), i);
      const suf = text.slice(i + h.quote.length, i + h.quote.length + h.suffix.length);
      for (let k = 1; k <= Math.min(pre.length, h.prefix.length); k++) { if (pre[pre.length - k] === h.prefix[h.prefix.length - k]) score++; else break; }
      for (let k = 0; k < Math.min(suf.length, h.suffix.length); k++) { if (suf[k] === h.suffix[k]) score++; else break; }
      if (score > bestScore) { bestScore = score; best = i; }
      i = text.indexOf(h.quote, i + 1);
    }
    return best;
  }

  function wrap(start, end, h) {
    const { map } = textMap(root);
    const segs = [];
    map.forEach((m) => {
      const len = m.n.nodeValue.length;
      const s = Math.max(start, m.start) - m.start;
      const e = Math.min(end, m.start + len) - m.start;
      if (e > s) segs.push({ n: m.n, s, e });
    });
    segs.forEach(({ n, s, e }) => {
      if (!n.nodeValue.slice(s, e).trim()) return;
      const mid = s > 0 ? n.splitText(s) : n;
      if (e - s < mid.nodeValue.length) mid.splitText(e - s);
      const mark = document.createElement("mark");
      mark.className = "hl" + (h.comment ? " has-comment" : "");
      mark.dataset.hl = h.id;
      mark.tabIndex = 0;
      mid.parentNode.insertBefore(mark, mid);
      mark.appendChild(mid);
    });
  }
  function unwrap(id) {
    root.querySelectorAll(`mark[data-hl="${id}"]`).forEach((m) => {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  function renderHighlights() {
    let changed = false;
    hls().forEach((h) => {
      const { text } = textMap(root);
      const at = locate(h, text);
      const orphan = at < 0;
      if (!!h.orphan !== orphan) { h.orphan = orphan; changed = true; }
      if (!orphan) wrap(at, at + h.quote.length, h);
    });
    if (changed) persist(true);
  }

  function currentSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    const anc = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (anc.closest("textarea, input, .wb-ignore")) return null;
    const { text, map } = textMap(root);
    const s = pointToOffset(range.startContainer, range.startOffset, map);
    const e = pointToOffset(range.endContainer, range.endOffset, map);
    if (s == null || e == null || e - s < 2) return null;
    const quote = text.slice(s, e);
    if (!quote.trim()) return null;
    return { s, e, quote, prefix: text.slice(Math.max(0, s - 32), s), suffix: text.slice(e, e + 32) };
  }

  function addHighlight(withComment) {
    const cur = currentSelection();
    if (!cur) return;
    const h = { id: uid(), quote: cur.quote, prefix: cur.prefix, suffix: cur.suffix, comment: "", created: new Date().toISOString() };
    hls().push(h);
    wrap(cur.s, cur.e, h);
    window.getSelection().removeAllRanges();
    hideToolbar();
    persist(false);
    renderPanelList();
    if (withComment) openSheet(h.id);
  }

  /* ---------- панель виділення ---------- */
  let toolbar;
  function buildToolbar() {
    toolbar = document.createElement("div");
    toolbar.className = "wb-toolbar wb-ignore";
    toolbar.hidden = true;
    toolbar.innerHTML = '<button type="button" data-act="hl">Виділити</button><button type="button" data-act="hlc">Виділити з коментарем</button>';
    toolbar.addEventListener("pointerdown", (e) => e.preventDefault());
    toolbar.addEventListener("mousedown", (e) => e.preventDefault());
    toolbar.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act) addHighlight(act === "hlc");
    });
    document.body.appendChild(toolbar);
    document.addEventListener("selectionchange", () => {
      clearTimeout(toolbar._t);
      toolbar._t = setTimeout(() => { toolbar.hidden = !currentSelection(); fab.hidden = !toolbar.hidden; }, 120);
    });
  }
  function hideToolbar() { toolbar.hidden = true; fab.hidden = false; }

  /* ---------- коментар до виділення ---------- */
  let sheet;
  function buildSheet() {
    sheet = document.createElement("div");
    sheet.className = "wb-sheet wb-ignore";
    sheet.hidden = true;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "Виділення");
    sheet.innerHTML = `
      <div class="wb-sheet-head"><span class="label">Виділення</span><button type="button" class="wb-x" data-act="close" aria-label="Закрити">×</button></div>
      <blockquote class="wb-quote"></blockquote>
      <label class="label" for="wb-comment">Коментар</label>
      <textarea id="wb-comment" rows="3" placeholder="Твоя думка, питання або приклад"></textarea>
      <div class="wb-row"><button type="button" class="btn" data-act="save">Зберегти</button><button type="button" class="btn ghost" data-act="del">Прибрати виділення</button></div>`;
    sheet.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      const id = sheet.dataset.id;
      const h = hls().find((x) => x.id === id);
      if (act === "close") closeSheet();
      if (act === "save" && h) {
        h.comment = sheet.querySelector("textarea").value.trim();
        root.querySelectorAll(`mark[data-hl="${id}"]`).forEach((m) => m.classList.toggle("has-comment", !!h.comment));
        persist(false); renderPanelList(); closeSheet();
      }
      if (act === "del" && h) {
        unwrap(id);
        db.highlights[lessonId] = hls().filter((x) => x.id !== id);
        persist(false); renderPanelList(); closeSheet();
      }
    });
    document.body.appendChild(sheet);
    root.addEventListener("click", (e) => {
      const m = e.target.closest("mark.hl");
      if (m && window.getSelection().isCollapsed) openSheet(m.dataset.hl);
    });
    root.addEventListener("keydown", (e) => {
      const m = e.target.closest && e.target.closest("mark.hl");
      if (m && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openSheet(m.dataset.hl); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSheet(); closePanel(); } });
  }
  function openSheet(id) {
    const h = hls().find((x) => x.id === id);
    if (!h) return;
    closePanel();
    sheet.dataset.id = id;
    sheet.querySelector(".wb-quote").textContent = h.quote;
    const ta = sheet.querySelector("textarea");
    ta.value = h.comment || "";
    sheet.hidden = false;
    ta.focus();
  }
  function closeSheet() { sheet.hidden = true; }

  /* ---------- нотатки до уроку ---------- */
  let fab, panel;
  function buildPanel() {
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "wb-fab wb-ignore";
    fab.innerHTML = 'Нотатки<span class="wb-count"></span>';
    fab.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
    document.body.appendChild(fab);

    panel = document.createElement("aside");
    panel.className = "wb-panel wb-ignore";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Мої нотатки");
    panel.innerHTML = `
      <div class="wb-sheet-head"><span class="label">Мої нотатки до уроку</span><button type="button" class="wb-x" aria-label="Закрити">×</button></div>
      <textarea id="wb-notes" rows="8" placeholder="Думки, питання, що незрозуміло, що хочеш спробувати"></textarea>
      <p class="wb-hint">Зберігається автоматично. Усі нотатки зібрані в розділі <a href="${document.body.dataset.root || ""}zoshyt.html">Мій зошит</a>.</p>
      <span class="label">Виділення в цьому уроці</span>
      <ul class="wb-list"></ul>
      <p class="wb-hint">Щоб виділити текст, просто виділи його мишкою або пальцем.</p>`;
    panel.querySelector(".wb-x").addEventListener("click", closePanel);
    const ta = panel.querySelector("textarea");
    ta.value = db.notes[lessonId] || "";
    ta.addEventListener("input", () => {
      if (ta.value.trim()) db.notes[lessonId] = ta.value; else delete db.notes[lessonId];
      saveSoon(); updateCount();
    });
    panel.querySelector(".wb-list").addEventListener("click", (e) => {
      const li = e.target.closest("[data-go]");
      if (!li) return;
      const m = root.querySelector(`mark[data-hl="${li.dataset.go}"]`);
      if (m) { closePanel(); m.scrollIntoView({ behavior: "smooth", block: "center" }); m.classList.add("flash"); setTimeout(() => m.classList.remove("flash"), 1200); }
    });
    document.body.appendChild(panel);
    renderPanelList();
  }
  function renderPanelList() {
    if (!panel) return;
    const list = hls();
    panel.querySelector(".wb-list").innerHTML = list.length
      ? list.map((h) => `<li${h.orphan ? "" : ` data-go="${h.id}"`} class="${h.orphan ? "orphan" : ""}"><q>${esc(h.quote)}</q>${h.comment ? `<span>${esc(h.comment)}</span>` : ""}${h.orphan ? '<small>Текст уроку змінився, виділення не знайдено</small>' : ""}</li>`).join("")
      : '<li class="empty">Поки немає виділень</li>';
    updateCount();
  }
  function updateCount() {
    const n = hls().length + (db.notes[lessonId] ? 1 : 0);
    fab.querySelector(".wb-count").textContent = n ? n : "";
  }
  function openPanel() { closeSheet(); panel.hidden = false; panel.querySelector("textarea").focus(); requestAnimationFrame(() => autoGrow(panel.querySelector("textarea"))); }
  function closePanel() { if (panel) panel.hidden = true; }

  /* Конструктор job story: три поля → готове речення */
  function initBuilders() {
    document.querySelectorAll(".builder").forEach((b) => {
      const f = b.querySelectorAll("input"), pv = b.querySelector(".preview");
      if (!pv || f.length < 3 || b.dataset.ready) return;
      b.dataset.ready = "1";
      const words = (b.dataset.words || "Коли|, я хочу|, щоб|.").split("|");
      const u = () => {
        const v = [...f].map((i) => i.value.trim());
        pv.textContent = v.some(Boolean) ? `${words[0]} ${v[0] || "…"}${words[1]} ${v[1] || "…"}${words[2]} ${v[2] || "…"}${words[3]}` : "";
      };
      f.forEach((i) => i.addEventListener("input", u));
      u();
    });
  }

  function initLesson() {
    lessonId = document.body.dataset.lesson;
    root = document.querySelector(".lesson-body");
    if (!lessonId || !root) return;
    initFields(lessonId);
    initBuilders();
    renderHighlights();
    buildPanel();
    buildToolbar();
    buildSheet();
  }

  /* ---------- експорт / імпорт ---------- */
  function snapshot() {
    let progress = null;
    try { progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)); } catch (e) {}
    return { app: "produkt-z-nulya", version: 1, exported: new Date().toISOString(), workbook: db, progress };
  }
  function download() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `produkt-z-nulya-zoshyt-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    db.meta.backup = new Date().toISOString();
    persist(true);
  }
  function restore(data) {
    if (!data || data.app !== "produkt-z-nulya" || !data.workbook) throw new Error("bad");
    localStorage.setItem(KEY, JSON.stringify(Object.assign(empty(), data.workbook)));
    if (data.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
  }
  function clearAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    db = empty();
  }

  /* Поля, якими керує скрипт уроку (наприклад, матриця). hidden — не показувати в зошиті. */
  function getField(lid, id) { const f = (db.fields[lid] || {})[id]; return f ? f.v : ""; }
  function setField(lid, id, v, label, order, hidden) {
    const s = db.fields[lid] || (db.fields[lid] = {});
    if (v) s[id] = { v, label, order: order || 0, hidden: !!hidden }; else delete s[id];
    saveSoon();
  }

  return { initLesson, get data() { return db; }, download, restore, clearAll, esc, getField, setField };
})();
