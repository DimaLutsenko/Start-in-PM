/* Інтерактивна матриця «вплив / інтерес». Перетягування мишкою або «натисни картку → натисни квадрант».
   Розміщення зберігається в робочому зошиті (WB). */
const Matrix = (() => {
  function init(opts) {
    const el = opts.el, lid = opts.lesson;
    let place = {};
    try { place = JSON.parse(WB.getField(lid, "matrix-raw") || "{}"); } catch (e) {}
    let selected = null;
    const box = (z) => el.querySelector(`[data-zone="${z}"] .mx-chips`);

    function chip(p) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mx-chip" + (selected === p.id ? " selected" : "");
      b.draggable = true;
      b.dataset.id = p.id;
      b.setAttribute("aria-pressed", selected === p.id);
      b.innerHTML = `<b>${WB.esc(p.name)}</b><span>${WB.esc(p.role)}</span>`;
      b.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; b.classList.add("dragging"); });
      b.addEventListener("dragend", () => b.classList.remove("dragging"));
      b.addEventListener("click", (e) => { e.stopPropagation(); select(selected === p.id ? null : p.id); });
      if (checked && place[p.id]) {
        const r = grade(p.id);
        b.classList.add("res-" + r);
        b.insertAdjacentHTML("afterbegin", `<i class="mx-mark" aria-label="${LABELS[r]}">${ICONS[r]}</i>`);
      }
      return b;
    }

    /* ---------- перевірка ---------- */
    const answers = opts.answers || null;
    const ICONS = { best: "✓", alt: "≈", miss: "!" };
    const LABELS = { best: "збігається з розбором", alt: "можна обґрунтувати", miss: "варто переглянути" };
    let checked = false;
    function grade(id) {
      const a = answers[id], z = place[id];
      if (z === a.best) return "best";
      if ((a.ok || []).includes(z)) return "alt";
      return "miss";
    }

    let checkBtn, resultBox;
    if (answers) {
      const wrapEl = document.createElement("div");
      wrapEl.className = "mx-check";
      wrapEl.innerHTML = '<button type="button" class="btn">Перевірити матрицю</button><div class="mx-result" hidden></div>';
      el.appendChild(wrapEl);
      checkBtn = wrapEl.querySelector("button");
      resultBox = wrapEl.querySelector(".mx-result");
      checkBtn.addEventListener("click", () => {
        const left = opts.people.filter((p) => !place[p.id]).length;
        if (left) {
          checked = false;
          resultBox.hidden = false;
          resultBox.innerHTML = `<p>Спершу розподіли всіх: залишилось ${left}. Перевірка має сенс, коли матриця повна.</p>`;
          render();
          return;
        }
        checked = true;
        render();
        resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    function renderResult() {
      if (!answers || !checked) return;
      const res = { best: [], alt: [], miss: [] };
      opts.people.forEach((p) => res[grade(p.id)].push(p));
      const zt = (z) => opts.zones[z] || "";
      const item = (p, kind) => {
        const a = answers[p.id];
        const where = kind === "best" ? "" : `<small>Ти поставив у «${zt(place[p.id])}». У розборі — «${zt(a.best)}».</small>`;
        const note = kind === "miss" && a.miss ? a.miss : a.why;
        return `<li class="res-${kind}"><b>${WB.esc(p.name)}</b>${where}<span>${note}</span></li>`;
      };
      const block = (kind, title, hint) => !res[kind].length ? "" : kind === "best"
        ? `<details class="mx-res-group"><summary class="label">${ICONS[kind]} ${title} · ${res[kind].length} · показати пояснення</summary><ul>${res[kind].map((p) => item(p, kind)).join("")}</ul></details>`
        : `<div class="mx-res-group"><span class="label">${ICONS[kind]} ${title} · ${res[kind].length}</span>${hint ? `<p class="muted">${hint}</p>` : ""}<ul>${res[kind].map((p) => item(p, kind)).join("")}</ul></div>`;
      const total = opts.people.length, good = res.best.length + res.alt.length;
      resultBox.hidden = false;
      resultBox.innerHTML = `
        <div class="mx-score"><b>${good} з ${total}</b><span>рішень збігаються з розбором або їх можна обґрунтувати</span></div>
        <p class="muted">Єдиної правильної відповіді тут немає: два досвідчені продакти теж розставлять команду трохи по-різному. Перевірка показує, де твоя логіка збігається з розбором, а де варто подумати ще раз.</p>
        ${block("miss", "Варто переглянути", "Тут найчастіше помиляються. Прочитай пояснення і подумай, чи згоден.")}
        ${block("alt", "Можна обґрунтувати", "Не так, як у розборі, але аргументи на користь твого варіанту теж є. Запиши їх у поле нижче.")}
        ${block("best", "Збігається з розбором", "")}
        <p class="muted">Змінив розташування? Натисни «Перевірити матрицю» ще раз.</p>`;
    }

    function render() {
      el.querySelectorAll(".mx-chips").forEach((c) => (c.innerHTML = ""));
      opts.people.forEach((p) => box(place[p.id] || "pool").appendChild(chip(p)));
      const left = opts.people.filter((p) => !place[p.id]).length;
      el.querySelector(".mx-pool").classList.toggle("done", left === 0);
      el.querySelector(".mx-status").textContent = selected
        ? "Тепер натисни на квадрант, куди перемістити картку."
        : left ? `Залишилось розподілити: ${left} з ${opts.people.length}.` : "Усіх розподілено. Матриця збережена в зошиті.";
      if (checked) renderResult();
    }

    function select(id) {
      selected = id;
      el.classList.toggle("selecting", !!id);
      render();
      if (id) { const c = el.querySelector(`.mx-chip[data-id="${id}"]`); if (c) c.focus(); }
    }

    function move(id, zone) {
      if (zone === "pool") delete place[id]; else place[id] = zone;
      selected = null;
      if (checked) { checked = false; if (resultBox) resultBox.hidden = true; }
      el.classList.remove("selecting");
      save();
      render();
    }

    function save() {
      WB.setField(lid, "matrix-raw", JSON.stringify(place), "matrix", 0, true);
      const lines = Object.entries(opts.zones).map(([z, title]) => {
        const names = opts.people.filter((p) => place[p.id] === z).map((p) => p.name);
        return names.length ? `${title}: ${names.join(", ")}` : null;
      }).filter(Boolean);
      WB.setField(lid, "matrix", lines.join("\n"), opts.label || "Матриця «вплив / інтерес»", opts.order || 0);
    }

    el.querySelectorAll("[data-zone]").forEach((z) => {
      z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("over"); });
      z.addEventListener("dragleave", () => z.classList.remove("over"));
      z.addEventListener("drop", (e) => {
        e.preventDefault(); z.classList.remove("over");
        const id = e.dataTransfer.getData("text/plain");
        if (id) move(id, z.dataset.zone);
      });
      z.addEventListener("click", () => { if (selected) move(selected, z.dataset.zone); });
      z.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && selected && e.target === z) { e.preventDefault(); move(selected, z.dataset.zone); }
      });
    });
    render();
  }
  return { init };
})();
