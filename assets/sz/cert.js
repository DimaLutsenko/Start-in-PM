/* Sprint Zero: відмальовка сертифіката (спільна для сторінки видачі і публічної сторінки). */
window.SZCert = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  function date(iso) { if (!iso) return "[ДАТА]"; var d = new Date(iso); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  var SKILLS = ["Дослідження користувачів", "Продуктові метрики", "Юніт-економіка", "Експерименти", "PRD", "Roadmap", "Продуктова стратегія"];
  function html(c) {
    var url = location.origin + "/cert/?id=" + (c.slug || "…");
    return '<div class="szc" role="img" aria-label="Сертифікат Sprint Zero для ' + esc(c.name_uk) + '">' +
      '<div class="szc-ring" aria-hidden="true"></div><div class="szc-in">' +
      '<div class="szc-top"><div class="szc-logo"><span class="szc-mark" aria-hidden="true"><i></i></span><span><b>SPRINT ZERO</b><small>ACADEMY</small></span></div>' +
      (c.first_cohort ? '<span class="szc-badge">★ Перший потік</span>' : "") + "</div>" +
      '<div class="szc-main"><span class="szc-kicker">СЕРТИФІКАТ ПРО ПРОХОДЖЕННЯ КУРСУ</span><span class="szc-pre">Цим підтверджується, що</span>' +
      "<h1>" + esc(c.name_uk || "Ім'я Прізвище") + "</h1>" +
      (c.name_lat ? '<span class="szc-lat">' + esc(c.name_lat) + "</span>" : "") +
      "<p>успішно пройшов(-ла) курс <strong>«Продакт з нуля»</strong>: 12 тижнів практики на наскрізному продукті, 36 уроків, 12 робочих артефактів і фінальна продуктова стратегія.</p></div>" +
      '<div class="szc-skills">' + SKILLS.map(function (s) { return "<span>" + s + "</span>"; }).join("") + "</div>" +
      '<div class="szc-foot"><div><small>ДАТА ВИДАЧІ</small><b>' + date(c.issued_at) + "</b></div>" +
      '<div><small>НОМЕР СЕРТИФІКАТА</small><b class="szc-mono">' + esc(c.number || "SZ-PM-0000") + "</b></div>" +
      '<div class="szc-sign"><b>Sprint Zero Academy</b><small>Перевірити: ' + esc(url.replace(/^https?:\/\//, "")) + "</small></div></div>" +
      "</div></div>";
  }
  /* масштабує сертифікат 1200×848 під ширину контейнера */
  function mount(box, c) {
    box.innerHTML = '<div class="szc-scale">' + html(c) + "</div>";
    var inner = box.firstChild;
    function fit() { var k = Math.min(1, box.clientWidth / 1200); inner.style.transform = "scale(" + k + ")"; box.style.height = 848 * k + "px"; }
    fit(); window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }
  function linkedIn(c) {
    var d = new Date(c.issued_at || Date.now());
    var q = new URLSearchParams({ startTask: "CERTIFICATION_NAME", name: "Продакт з нуля (Product Management)", organizationName: "Sprint Zero Academy",
      issueYear: String(d.getFullYear()), issueMonth: String(d.getMonth() + 1), certUrl: location.origin + "/cert/?id=" + c.slug, certId: c.number });
    return "https://www.linkedin.com/profile/add?" + q.toString();
  }
  return { html: html, mount: mount, date: date, linkedIn: linkedIn };
})();
