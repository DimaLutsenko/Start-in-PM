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
      return b;
    }

    function render() {
      el.querySelectorAll(".mx-chips").forEach((c) => (c.innerHTML = ""));
      opts.people.forEach((p) => box(place[p.id] || "pool").appendChild(chip(p)));
      const left = opts.people.filter((p) => !place[p.id]).length;
      el.querySelector(".mx-pool").classList.toggle("done", left === 0);
      el.querySelector(".mx-status").textContent = selected
        ? "Тепер натисни на квадрант, куди перемістити картку."
        : left ? `Залишилось розподілити: ${left} з ${opts.people.length}.` : "Усіх розподілено. Матриця збережена в зошиті.";
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
