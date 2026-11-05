/* Інтерактивні інструменти уроків: перевірка числових відповідей, калькулятор юніт-економіки, когортна таблиця. */
const Tools = (() => {
  const fmt = (n, d = 0) => (isFinite(n) ? n.toLocaleString("uk-UA", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");
  const num = (v) => parseFloat(String(v).replace(/\s/g, "").replace(",", "."));

  /* ---------- Перевірка числових відповідей ---------- */
  function initChecks(root = document) {
    root.querySelectorAll(".num-check").forEach((box) => {
      const btn = box.querySelector("[data-check]");
      if (!btn) return;
      btn.addEventListener("click", () => {
        let ok = 0, total = 0;
        box.querySelectorAll("input[data-answer]").forEach((inp) => {
          total++;
          const v = num(inp.value), a = num(inp.dataset.answer), tol = num(inp.dataset.tol || "0.5");
          const row = inp.closest(".nc-row");
          const good = isFinite(v) && Math.abs(v - a) <= tol;
          if (good) ok++;
          row.classList.remove("ok", "no");
          row.classList.add(good ? "ok" : "no");
          const mark = row.querySelector(".nc-mark");
          if (mark) mark.textContent = good ? "✓ Правильно" : isFinite(v) ? `✗ Правильна відповідь: ${fmt(a, inp.dataset.dec ? +inp.dataset.dec : 0)}` : "✗ Введи число";
        });
        const res = box.querySelector(".nc-result");
        res.hidden = false;
        res.querySelector(".nc-score").textContent = `${ok} з ${total}`;
        box.querySelectorAll(".nc-explain").forEach((e) => (e.hidden = false));
      });
    });
  }

  /* ---------- Калькулятор юніт-економіки ---------- */
  function initCalc(el) {
    if (!el) return;
    const $ = (id) => el.querySelector(`[data-in="${id}"]`);
    const out = (id, v) => { const o = el.querySelector(`[data-out="${id}"]`); if (o) o.textContent = v; };

    function calc() {
      const price = num($("price").value), cost = num($("cost").value), churn = num($("churn").value) / 100;
      const spend = num($("spend").value), clients = num($("clients").value), cap = $("cap").checked;
      const margin = price - cost;
      const marginPct = price ? (margin / price) * 100 : NaN;
      const lifeRaw = churn > 0 ? 1 / churn : Infinity;
      const life = cap ? Math.min(lifeRaw, 36) : lifeRaw;
      const ltv = margin * life;
      const cac = clients > 0 ? spend / clients : NaN;
      const ratio = ltv / cac;
      const payback = margin > 0 ? cac / margin : Infinity;
      out("margin", `${fmt(margin)} грн`);
      out("marginPct", `${fmt(marginPct)}%`);
      out("life", isFinite(life) ? `${fmt(life, 1)} міс` : "∞");
      out("ltv", isFinite(ltv) ? `${fmt(ltv)} грн` : "∞");
      out("cac", `${fmt(cac)} грн`);
      out("ratio", isFinite(ratio) ? `${fmt(ratio, 1)} : 1` : "—");
      out("payback", isFinite(payback) ? `${fmt(payback, 1)} міс` : "не окупається");

      const verdict = el.querySelector(".calc-verdict");
      let cls, text;
      if (!(margin > 0)) { cls = "bad"; text = "Маржа нульова або від'ємна: кожен клієнт приносить збиток ще до витрат на залучення."; }
      else if (ratio < 1) { cls = "bad"; text = "LTV менший за CAC: кожен новий клієнт приносить збиток. Чим більше продаємо, тим більше втрачаємо."; }
      else if (ratio < 3) { cls = "mid"; text = "Клієнти окупаються, але із запасом замало. Будь-яке зростання CAC чи відтоку зробить модель збитковою."; }
      else { cls = "good"; text = "Здорова модель: клієнт приносить щонайменше втричі більше, ніж коштує його залучення."; }
      if (margin > 0 && isFinite(payback) && isFinite(life) && payback > life) { cls = "bad"; text = "Окупність довша за середній час життя клієнта: більшість клієнтів іде раніше, ніж окупиться."; }
      verdict.className = "calc-verdict " + cls;
      verdict.textContent = text;
    }
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", calc));
    el.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const p = JSON.parse(b.dataset.preset);
      Object.entries(p).forEach(([k, v]) => { const i = $(k); if (i) i.value = v; });
      el.querySelectorAll("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      calc();
    }));
    calc();
  }

  /* ---------- Когортна таблиця ---------- */
  const COHORTS = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень"];
  const BASE = {
    private: [100, 74, 65, 52, 43, 36, 31, 27, 24],
    small: [100, 88, 82, 76, 71, 67, 63, 60, 57],
    large: [100, 97, 94, 92, 90, 88, 86, 84, 82],
  };
  const WEIGHT = { private: 0.45, small: 0.42, large: 0.13 };
  const BETTER = { private: 1.15, small: 1.05, large: 1.0 }; // онбординг-дзвінок з липня
  const LAST = 8; // дані до вересня включно: календарний місяць 8

  function cell(seg, i, k) {
    if (i + k > LAST) return null;
    if (seg === "all") return Object.keys(WEIGHT).reduce((s, g) => s + WEIGHT[g] * cell(g, i, k), 0);
    let r = BASE[seg][k];
    if (k >= 1 && i >= 6) r = Math.min(100, r * BETTER[seg]);
    if (k >= 1 && i <= 4 && i + k >= 5) r = r * (seg === "large" ? 0.98 : 0.93); // збій оплати в червні
    return r;
  }

  function initCohort(el) {
    if (!el) return;
    let seg = "all";
    const table = el.querySelector(".ch-table");
    const chart = el.querySelector(".ch-chart");

    function render() {
      let h = '<table><thead><tr><th>Когорта</th>';
      for (let k = 0; k <= LAST; k++) h += `<th>Міс. ${k}</th>`;
      h += "</tr></thead><tbody>";
      COHORTS.forEach((c, i) => {
        h += `<tr><th scope="row">${c}</th>`;
        for (let k = 0; k <= LAST; k++) {
          const v = cell(seg, i, k);
          if (v == null) { h += '<td class="empty"></td>'; continue; }
          const mix = Math.round(10 + v * 0.75);
          const cls = (i + k === 5 && k >= 1 && i <= 4) ? " june" : "";
          h += `<td class="v${cls}" style="--mix:${mix}%" title="${c}, місяць ${k}: ${fmt(v)}%">${fmt(v)}%</td>`;
        }
        h += "</tr>";
      });
      table.innerHTML = h + "</tbody></table>";
      drawChart();
    }

    function drawChart() {
      const W = 560, H = 252, L = 44, R = 14, T = 14, B = 46;
      const x = (k) => L + (k / LAST) * (W - L - R);
      const y = (v) => T + (1 - v / 100) * (H - T - B);
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Криві утримання за сегментами">`;
      [0, 25, 50, 75, 100].forEach((v) => {
        s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
      });
      for (let k = 0; k <= LAST; k++) s += `<text class="tick" x="${x(k)}" y="${H - 28}" text-anchor="middle">${k}</text>`;
      const lines = [["private", "Приватні майстри"], ["small", "Малі салони"], ["large", "Великі салони"]];
      lines.forEach(([g, name]) => {
        const pts = BASE[g].map((v, k) => `${x(k)},${y(v)}`).join(" ");
        const on = seg === "all" || seg === g;
        s += `<polyline class="ln ln-${g}${on ? "" : " off"}" points="${pts}"/>`;
        s += `<circle class="dot ln-${g}${on ? "" : " off"}" cx="${x(LAST)}" cy="${y(BASE[g][LAST])}" r="4"/>`;
        s += `<text class="lbl ln-${g}${on ? "" : " off"}" x="${x(LAST) - 6}" y="${y(BASE[g][LAST]) - 9}" text-anchor="end">${name} · ${BASE[g][LAST]}%</text>`;
      });
      s += `<text class="tick" x="${W - R}" y="${H - 6}" text-anchor="end">місяців з моменту підключення →</text>`;
      chart.innerHTML = s + "</svg>";
    }

    el.querySelectorAll("[data-seg]").forEach((b) => b.addEventListener("click", () => {
      seg = b.dataset.seg;
      el.querySelectorAll("[data-seg]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    }));
    render();
  }

  /* ---------- Калькулятор A/B-тесту (z-тест для двох часток) ---------- */
  function erfc(x) { // наближення Абрамовіца–Стіган
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function initAB(el) {
    if (!el) return;
    const $ = (id) => el.querySelector(`[data-in="${id}"]`);
    const out = (id, v) => { const o = el.querySelector(`[data-out="${id}"]`); if (o) o.textContent = v; };
    function calc() {
      const na = num($("na").value), xa = num($("xa").value), nb = num($("nb").value), xb = num($("xb").value);
      const pa = xa / na, pb = xb / nb, pp = (xa + xb) / (na + nb);
      const se = Math.sqrt(pp * (1 - pp) * (1 / na + 1 / nb));
      const z = (pb - pa) / se;
      const pv = erfc(Math.abs(z) / Math.SQRT2);
      out("pa", `${fmt(pa * 100, 2)}%`); out("pb", `${fmt(pb * 100, 2)}%`);
      out("diff", `${pb - pa >= 0 ? "+" : ""}${fmt((pb - pa) * 100, 2)} п.п.`);
      out("rel", isFinite(pa) && pa > 0 ? `${pb - pa >= 0 ? "+" : ""}${fmt(((pb - pa) / pa) * 100, 1)}%` : "—");
      out("pv", !isFinite(pv) ? "—" : pv < 0.001 ? "< 0,001" : fmt(pv, 3));
      const v = el.querySelector(".calc-verdict");
      if (!isFinite(pv)) { v.className = "calc-verdict mid"; v.textContent = "Введи кількість учасників і подій у кожній групі."; return; }
      if (pv < 0.05) { v.className = "calc-verdict good"; v.textContent = "Різниця статистично значуща: p-значення менше 0,05. Малоймовірно, що вона виникла випадково."; }
      else { v.className = "calc-verdict bad"; v.textContent = "Різниця не значуща: вона цілком могла виникнути випадково. Потрібно більше даних або ефекту немає."; }
    }
    el.querySelectorAll("input").forEach((i) => i.addEventListener("input", calc));
    el.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const pr = JSON.parse(b.dataset.preset);
      Object.entries(pr).forEach(([k, v]) => { const i = $(k); if (i) i.value = v; });
      el.querySelectorAll("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      calc();
    }));
    calc();
  }

  return { initChecks, initCalc, initCohort, initAB, cell };
})();
