/* Sprint Zero: вхід, синхронізація з базою, онбординг, аналітика, фідбек, самоперевірка.
   Підключається в кінці <body> після supabase-js і скриптів курсу. */
(function () {
  var C = window.SZ_CONFIG, B = window.SZB;
  if (!C || !B) return;
  var SB = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, storageKey: "sz-auth" } })
    : null;
  var readyResolve; 
  var SZ = window.SZ = { client: SB, user: null, profile: null, session: null, ready: new Promise(function (r) { readyResolve = r; }) };
  var lessonId = document.body.dataset.lesson || null;
  var course = location.pathname.indexOf("/pm/") === 0 ? "pm" : null;
  var REST = C.supabaseUrl + "/rest/v1/";

  /* ---------- дрібниці ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function jget(k, d) { try { var v = JSON.parse(B.rawGet(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { B.rawSet(k, JSON.stringify(v)); }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function headers(extra) {
    var h = { apikey: C.supabaseKey, "Content-Type": "application/json" };
    h.Authorization = "Bearer " + (SZ.session ? SZ.session.access_token : C.supabaseKey);
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }
  var ICON = {
    lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    cloud: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z"/></svg>',
    google: '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
  };

  /* ---------- аналітика ---------- */
  var evQueue = [], evTimer = null;
  function track(name, extra) {
    extra = extra || {};
    evQueue.push({
      name: name, course: extra.course || course, lesson: extra.lesson !== undefined ? extra.lesson : lessonId,
      props: extra.props || {}, anon_id: B.anon, user_id: SZ.user ? SZ.user.id : null
    });
    clearTimeout(evTimer); evTimer = setTimeout(flushEvents, 1500);
  }
  SZ.track = track;
  function flushEvents(keepalive) {
    while (B.events.length) { var e = B.events.shift(); track(e.name, { lesson: e.lesson, props: e.props }); }
    if (!evQueue.length) return;
    var batch = evQueue.splice(0, 50).map(function (e) { e.user_id = SZ.user ? SZ.user.id : null; return e; });
    try {
      fetch(REST + "events", { method: "POST", keepalive: !!keepalive, headers: headers({ Prefer: "return=minimal" }), body: JSON.stringify(batch) }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- синхронізація ---------- */
  var VER = "sz-ver", OWNER = "sz-owner";
  var pushTimer = null, statusEl = null;
  function pmzKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("pmz-") === 0) out.push(k); }
    return out;
  }
  function setStatus(t) { if (statusEl) statusEl.textContent = t; }

  function mergeProgress(a, b) {
    a = a || {}; b = b || {};
    var done = Object.assign({}, b.done || {}, a.done || {}), checks = Object.assign({}, b.checks || {}, a.checks || {});
    return { done: done, checks: checks };
  }
  function mergeWorkbook(server, local) {
    server = server || {}; local = local || {};
    var out = { notes: Object.assign({}, local.notes, server.notes), fields: {}, highlights: {}, meta: Object.assign({}, local.meta, server.meta) };
    var lids = {}; Object.keys(server.fields || {}).concat(Object.keys(local.fields || {})).forEach(function (k) { lids[k] = 1; });
    Object.keys(lids).forEach(function (lid) { out.fields[lid] = Object.assign({}, (local.fields || {})[lid], (server.fields || {})[lid]); });
    var hl = {}; Object.keys(server.highlights || {}).concat(Object.keys(local.highlights || {})).forEach(function (k) { hl[k] = 1; });
    Object.keys(hl).forEach(function (lid) {
      var seen = {}, arr = [];
      ((server.highlights || {})[lid] || []).concat((local.highlights || {})[lid] || []).forEach(function (h) { if (h && !seen[h.id]) { seen[h.id] = 1; arr.push(h); } });
      out.highlights[lid] = arr;
    });
    return out;
  }
  function mergeValue(key, serverVal, localVal) {
    if (localVal == null) return serverVal;
    if (serverVal == null) return localVal;
    try {
      if (key === "pmz-progress-v1") return JSON.stringify(mergeProgress(JSON.parse(serverVal), JSON.parse(localVal)));
      if (key === "pmz-workbook-v1") return JSON.stringify(mergeWorkbook(JSON.parse(serverVal), JSON.parse(localVal)));
      if (key === "pmz-picks-v1") return JSON.stringify(Object.assign({}, JSON.parse(localVal), JSON.parse(serverVal)));
    } catch (e) {}
    return serverVal;
  }

  function fetchState(withValues) {
    return fetch(REST + "user_state?select=key,updated_at" + (withValues ? ",value" : "") + "&user_id=eq." + SZ.user.id, { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error("state " + r.status); return r.json(); });
  }

  function reloadOnce() {
    if (sessionStorage.getItem("sz-reloaded")) return false;
    sessionStorage.setItem("sz-reloaded", "1");
    location.reload();
    return true;
  }

  function initialSync() {
    var uid = SZ.user.id, ver = jget(VER, {}), owner = B.rawGet(OWNER);
    return fetchState(owner !== uid).then(function (rows) {
      var server = {}; rows.forEach(function (r) { server[r.key] = r; });
      if (owner !== uid) {
        var localKeys = pmzKeys(), changed = false, newVer = {};
        if (!rows.length) {
          localKeys.forEach(function (k) { B.dirty[k] = true; });
          if (localKeys.length) track("data_migrated", { props: { keys: localKeys.length } });
        } else {
          var all = {}; localKeys.concat(Object.keys(server)).forEach(function (k) { all[k] = 1; });
          Object.keys(all).forEach(function (k) {
            var sv = server[k] ? server[k].value : null, lv = B.rawGet(k);
            var mv = mergeValue(k, sv, lv);
            if (mv !== lv) { B.rawSet(k, mv); changed = true; }
            if (mv !== sv) B.dirty[k] = true;
            if (server[k]) newVer[k] = server[k].updated_at;
          });
        }
        jset(VER, newVer); B.rawSet(OWNER, uid);
        return pushNow().then(function () { if (changed) reloadOnce(); });
      }
      /* той самий користувач: підтягуємо те, що змінилося на іншому пристрої */
      var newer = rows.filter(function (r) { return !B.dirty[r.key] && (!ver[r.key] || r.updated_at > ver[r.key]); });
      pmzKeys().forEach(function (k) { if (!server[k]) B.dirty[k] = true; });
      if (!newer.length) { schedulePush(); sessionStorage.removeItem("sz-reloaded"); return; }
      return fetch(REST + "user_state?select=key,value,updated_at&user_id=eq." + uid + "&key=in.(" + newer.map(function (r) { return '"' + r.key.replace(/"/g, "") + '"'; }).join(",") + ")", { headers: headers() })
        .then(function (r) { return r.json(); })
        .then(function (vals) {
          var changed = false;
          vals.forEach(function (r) { if (B.rawGet(r.key) !== r.value) { B.rawSet(r.key, r.value); changed = true; } ver[r.key] = r.updated_at; });
          jset(VER, ver);
          schedulePush();
          if (changed) reloadOnce(); else sessionStorage.removeItem("sz-reloaded");
        });
    }).catch(function () { setStatus("Немає зв'язку з сервером"); });
  }

  function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 1200); }
  function pushNow(keepalive) {
    clearTimeout(pushTimer);
    if (!SZ.user || B.viewAs) return Promise.resolve();
    var keys = Object.keys(B.dirty);
    if (!keys.length) return Promise.resolve();
    B.dirty = {};
    var uid = SZ.user.id, now = new Date().toISOString(), up = [], del = [];
    keys.forEach(function (k) { var v = B.rawGet(k); if (v == null) del.push(k); else up.push({ user_id: uid, key: k, value: v, updated_at: now }); });
    setStatus("Зберігаю…");
    var body = JSON.stringify(up), jobs = [];
    if (up.length) jobs.push(fetch(REST + "user_state?on_conflict=user_id,key", {
      method: "POST", keepalive: !!keepalive && body.length < 60000,
      headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }), body: body
    }).then(function (r) { if (!r.ok) throw new Error("push " + r.status); return r.json(); })
      .then(function (rows) { var ver = jget(VER, {}); rows.forEach(function (r) { ver[r.key] = r.updated_at; }); jset(VER, ver); }));
    del.forEach(function (k) {
      jobs.push(fetch(REST + "user_state?user_id=eq." + uid + "&key=eq." + encodeURIComponent(k), { method: "DELETE", keepalive: !!keepalive, headers: headers() }));
    });
    return Promise.all(jobs).then(function () { setStatus("Збережено в акаунті"); })
      .catch(function () { keys.forEach(function (k) { B.dirty[k] = true; }); setStatus("Не збережено, спробую ще"); pushTimer = setTimeout(pushNow, 8000); });
  }
  B.listeners.push(function () { if (SZ.user) schedulePush(); });
  SZ.push = function () { return pushNow(); };
  SZ.headers = headers; SZ.rest = REST;
  function flushAll() { flushEvents(true); if (SZ.user) pushNow(true); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushAll(); });
  window.addEventListener("pagehide", flushAll);

  /* ---------- профіль ---------- */
  function afterLogin() {
    var uid = SZ.user.id;
    return fetch(REST + "profiles?select=*&id=eq." + uid, { headers: headers() }).then(function (r) { return r.json(); }).then(function (rows) {
      var p = rows[0] || {}; SZ.profile = p;
      var patch = { last_seen_at: new Date().toISOString() };
      var consent = jget("sz-consent", null);
      if (consent) {
        if (consent.terms) patch.terms_accepted_at = consent.at;
        patch.marketing_consent = !!consent.marketing; patch.consent_at = consent.at;
        B.rawRemove("sz-consent");
      }
      var ob = jget("sz-onboarding", null);
      if (ob && (!p.onboarding || !Object.keys(p.onboarding).length)) patch.onboarding = ob;
      var utm = jget("sz-utm", null);
      if (utm && (!p.utm || !Object.keys(p.utm).length)) patch.utm = utm;
      if (p.created_at && Date.now() - new Date(p.created_at).getTime() < 10 * 60 * 1000 && !B.rawGet("sz-signup-" + uid)) {
        B.rawSet("sz-signup-" + uid, "1"); track("signup", { props: { utm: utm || null } });
      }
      return fetch(REST + "profiles?id=eq." + uid, { method: "PATCH", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify(patch) })
        .then(function (r) { return r.json(); }).then(function (rr) { if (rr && rr[0]) SZ.profile = rr[0]; });
    }).catch(function () {});
  }

  /* ---------- модальні вікна ---------- */
  function modal(html, opts) {
    opts = opts || {};
    var wrap = el('<div class="sz-modal" role="dialog" aria-modal="true"><div class="sz-card">' + (opts.closable === false ? "" : '<button type="button" class="sz-x" aria-label="Закрити">×</button>') + html + "</div></div>");
    document.body.appendChild(wrap);
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); if (opts.onClose) opts.onClose(); }
    function onKey(e) { if (e.key === "Escape" && opts.closable !== false) close(); }
    document.addEventListener("keydown", onKey);
    var x = $(".sz-x", wrap); if (x) x.addEventListener("click", close);
    var f = $("button, input, a", $(".sz-card", wrap)); if (f && f.focus) setTimeout(function () { f.focus(); }, 30);
    return { el: wrap, close: close };
  }

  function authHtml(intro) {
    return '<span class="sz-eyebrow">' + (intro && intro.eyebrow || "Sprint Zero") + '</span><h2>' + (intro && intro.title || "Збережи свій прогрес") + "</h2>" +
      '<p class="sz-muted">' + (intro && intro.text || "Увійди через Google, і твої відповіді, нотатки та прогрес збережуться в акаунті. Продовжиш з будь-якого пристрою, а наприкінці отримаєш сертифікат.") + "</p>" +
      '<label class="sz-check"><input type="checkbox" data-terms> <span>Я погоджуюсь з <a href="/terms.html" target="_blank">умовами</a> і <a href="/privacy.html" target="_blank">політикою конфіденційності</a></span></label>' +
      '<label class="sz-check"><input type="checkbox" data-mkt> <span>Хочу отримувати новини Sprint Zero і нові курси (можна відписатися будь-коли)</span></label>' +
      '<button type="button" class="sz-google" data-google disabled>' + ICON.google + "<span>Увійти через Google</span></button>" +
      '<p class="sz-small sz-err" data-err hidden></p>';
  }
  function bindAuth(root) {
    var terms = $("[data-terms]", root), btn = $("[data-google]", root), err = $("[data-err]", root);
    terms.addEventListener("change", function () { btn.disabled = !terms.checked; });
    btn.addEventListener("click", function () {
      if (!SB) { err.hidden = false; err.textContent = "Не вдалося завантажити вхід. Перевір інтернет і онови сторінку."; return; }
      jset("sz-consent", { terms: true, marketing: $("[data-mkt]", root).checked, at: new Date().toISOString() });
      track("login_click"); flushEvents(true);
      var back = location.origin + location.pathname + location.search.replace(/([?&])(code|error[^=]*)=[^&]*/g, "");
      SB.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } }).then(function (r) {
        if (r.error) { err.hidden = false; err.textContent = "Не вдалося почати вхід: " + r.error.message; }
      });
    });
  }
  function openAuth(intro) { var m = modal(authHtml(intro)); bindAuth(m.el); track("auth_open"); return m; }
  SZ.openAuth = openAuth;

  /* ---------- онбординг ---------- */
  var Q = [
    { k: "role", q: "Хто ти зараз?", o: ["Студент(ка)", "Переходжу з іншої професії", "Початківець у продакті", "Працюю поруч із продуктом: дизайн, розробка, маркетинг", "Просто цікаво"] },
    { k: "goal", q: "Яка твоя головна ціль?", o: ["Знайти першу роботу продактом", "Рости в поточній ролі", "Розібратися, чим займається продакт", "Запустити власний продукт"] },
    { k: "hours", q: "Скільки годин на тиждень готовий(-а) приділяти?", o: ["До 2 годин", "2–4 години", "4–6 годин", "Більше 6 годин"] }
  ];
  function progressCount() { var p = jget("pmz-progress-v1", {}); return Object.keys((p && p.done) || {}).length; }
  function needOnboarding() { return course === "pm" && !B.viewAs && !B.rawGet("sz-onboarding") && !(SZ.profile && SZ.profile.onboarding && Object.keys(SZ.profile.onboarding).length) && progressCount() === 0; }

  function runOnboarding(then) {
    var answers = {}, step = 0;
    var m = modal('<div data-ob></div>', { onClose: function () { track("onboarding_close", { props: { step: step } }); } });
    var box = $("[data-ob]", m.el);
    track("onboarding_start");
    function render() {
      if (step === 0) {
        box.innerHTML = '<span class="sz-eyebrow">Ласкаво просимо до Sprint Zero</span><h2>Продакт з нуля: що на тебе чекає</h2>' +
          '<ul class="sz-list"><li><b>12 тижнів, 36 уроків.</b> Щотижня два уроки теорії і практика.</li>' +
          '<li><b>3–4 години на тиждень.</b> Проходиш у своєму темпі, прогрес зберігається.</li>' +
          '<li><b>Наскрізний продукт «Слот».</b> Весь курс ти — продакт сервісу онлайн-запису для барбершопів.</li>' +
          '<li><b>На виході:</b> портфоліо з 12 робочих артефактів, продуктова стратегія і сертифікат.</li></ul>' +
          '<div class="sz-actions"><button type="button" class="btn" data-go>Далі: 3 короткі питання</button></div>';
        $("[data-go]", box).addEventListener("click", function () { step = 1; render(); });
      } else if (step === 1) {
        box.innerHTML = '<span class="sz-eyebrow">Крок 2 з 3 · Знайомство</span><h2>Розкажи трохи про себе</h2><p class="sz-muted">Це допоможе зробити курс кращим. Відповіді бачить тільки автор курсу.</p>' +
          Q.map(function (q) {
            return '<fieldset class="sz-q"><legend>' + q.q + '</legend><div class="sz-opts">' + q.o.map(function (o) {
              return '<button type="button" class="sz-opt" data-k="' + q.k + '" data-v="' + esc(o) + '" aria-pressed="false">' + esc(o) + "</button>";
            }).join("") + "</div></fieldset>";
          }).join("") +
          '<div class="sz-actions"><button type="button" class="btn" data-go disabled>Далі</button><button type="button" class="sz-link" data-skip>Пропустити</button></div>';
        var go = $("[data-go]", box);
        $$(".sz-opt", box).forEach(function (b) {
          b.addEventListener("click", function () {
            $$('.sz-opt[data-k="' + b.dataset.k + '"]', box).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
            b.setAttribute("aria-pressed", "true"); answers[b.dataset.k] = b.dataset.v;
            go.disabled = Q.some(function (q) { return !answers[q.k]; });
          });
        });
        function finish(skipped) {
          answers.at = new Date().toISOString(); if (skipped) answers.skipped = true;
          jset("sz-onboarding", answers);
          track("onboarding_done", { props: answers });
          if (SZ.user) fetch(REST + "profiles?id=eq." + SZ.user.id, { method: "PATCH", headers: headers(), body: JSON.stringify({ onboarding: answers }) });
          step = 2; render();
        }
        go.addEventListener("click", function () { finish(false); });
        $("[data-skip]", box).addEventListener("click", function () { finish(true); });
      } else {
        if (SZ.user) { m.close(); if (then) then(); return; }
        box.innerHTML = authHtml({ eyebrow: "Крок 3 з 3", title: "Створи акаунт, щоб нічого не загубити", text: "Курс безкоштовний. Акаунт потрібен, щоб твої відповіді і прогрес зберігалися і були доступні з будь-якого пристрою." }) +
          '<button type="button" class="sz-link" data-later>Продовжити без входу (дані збережуться лише в цьому браузері)</button>';
        bindAuth(box);
        $("[data-later]", box).addEventListener("click", function () { track("auth_later"); m.close(); if (then) then(); });
      }
    }
    render();
  }

  function initOnboardingHooks() {
    if (course !== "pm" || B.viewAs) return;
    if (lessonId && needOnboarding()) { runOnboarding(function () { maybeTips(); }); return; }
    if (!lessonId) {
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href*="lessons/"]');
        if (!a || !needOnboarding()) return;
        e.preventDefault();
        runOnboarding(function () { location.href = a.href; });
      }, true);
    }
  }

  /* ---------- підказки по інтерфейсу (перший урок) ---------- */
  function maybeTips() {
    if (lessonId !== "01-1" || B.viewAs || B.rawGet("sz-tips")) return;
    var tips = [
      { sel: "#ls-steps", t: "Урок поділений на 4 кроки. Смужка показує, де ти зараз. Можна повертатися до будь-якого кроку." },
      { sel: ".wb-fab", t: "Виділи будь-який текст в уроці, щоб підсвітити його або додати коментар. Тут — усі твої нотатки до уроку." },
      { sel: ".sz-acct", t: "Тут твій акаунт. Відповіді й прогрес зберігаються автоматично. Наприкінці кожного уроку — коротка оцінка: вона дуже допомагає покращувати курс." }
    ];
    var i = 0, pop = null;
    function show() {
      if (pop) pop.remove();
      var tip = tips[i];
      while (tip && !$(tip.sel)) { i++; tip = tips[i]; }
      if (!tip) { B.rawSet("sz-tips", "1"); return; }
      var target = $(tip.sel), r = target.getBoundingClientRect();
      pop = el('<div class="sz-tip" role="dialog" aria-live="polite"><p>' + tip.t + '</p><div class="sz-actions"><span class="sz-small">' + (i + 1) + " з " + tips.length + '</span><button type="button" class="btn sm" data-n>' + (i === tips.length - 1 ? "Зрозуміло" : "Далі") + "</button></div></div>");
      document.body.appendChild(pop);
      var top = r.bottom + 10, left = Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, r.left));
      if (top + pop.offsetHeight > window.innerHeight - 12) top = Math.max(12, r.top - pop.offsetHeight - 10);
      pop.style.top = top + "px"; pop.style.left = left + "px";
      target.classList.add("sz-glow"); setTimeout(function () { target.classList.remove("sz-glow"); }, 2400);
      $("[data-n]", pop).addEventListener("click", function () { i++; if (i >= tips.length) { pop.remove(); B.rawSet("sz-tips", "1"); track("tips_done"); } else show(); });
    }
    setTimeout(show, 600);
  }

  /* ---------- акаунт у шапці ---------- */
  function renderAccount() {
    var host = $(".hd .in") || $(".ls-bar");
    if (!host) return;
    var old = $(".sz-acct"); if (old) old.remove();
    var box = el('<div class="sz-acct"></div>');
    if (SZ.user) {
      var name = (SZ.profile && SZ.profile.full_name) || SZ.user.email || "Акаунт";
      box.innerHTML = '<button type="button" class="sz-avatar" aria-haspopup="menu" aria-expanded="false" title="' + esc(name) + '">' + esc(name.trim().charAt(0).toUpperCase()) + "</button>" +
        '<div class="sz-menu" role="menu" hidden><div class="sz-menu-head"><b>' + esc(name) + "</b><span>" + esc(SZ.user.email || "") + '</span><span class="sz-sync" data-status>' + ICON.cloud + " Збережено в акаунті</span></div>" +
        '<a role="menuitem" href="/pm/zoshyt.html">Мій зошит</a><a role="menuitem" href="/pm/certificate.html">Сертифікат</a>' +
        (SZ.profile && SZ.profile.is_admin ? '<a role="menuitem" href="/admin/">Адмінка</a>' : "") +
        '<button type="button" role="menuitem" data-logout>Вийти</button></div>';
      var btn = $(".sz-avatar", box), menu = $(".sz-menu", box);
      btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
      document.addEventListener("click", function (e) { if (!box.contains(e.target)) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
      $("[data-logout]", box).addEventListener("click", logout);
      statusEl = $("[data-status]", box);
    } else {
      box.innerHTML = '<button type="button" class="sz-login">Увійти</button>';
      $(".sz-login", box).addEventListener("click", function () { openAuth(); });
    }
    if (host.classList.contains("ls-bar")) host.insertBefore(box, $("#ls-count", host) || null); else host.appendChild(box);
    var ft = $(".ft .in span:last-child") || $(".site-footer .wrap span:last-child");
    if (ft && /браузері/.test(ft.textContent)) ft.textContent = SZ.user ? "Прогрес зберігається в акаунті" : "Прогрес зберігається в цьому браузері. Увійди, щоб не загубити його";
  }

  function logout() {
    flushAll();
    var go = function () {
      pmzKeys().forEach(function (k) { B.rawRemove(k); });
      [OWNER, VER].forEach(B.rawRemove);
      location.reload();
    };
    pushNow().then(function () { return SB.auth.signOut(); }).then(go, go);
  }

  /* ---------- нагадування увійти ---------- */
  function maybeNudge() {
    if (SZ.user || B.viewAs || sessionStorage.getItem("sz-nudged") || !lessonId) return;
    var wb = jget("pmz-workbook-v1", {}), n = 0;
    Object.keys(wb.fields || {}).forEach(function (l) { n += Object.keys(wb.fields[l]).length; });
    if (n < 3 && progressCount() < 1) return;
    sessionStorage.setItem("sz-nudged", "1");
    var bar = el('<div class="sz-nudge" role="status"><span>' + ICON.cloud + ' Твої відповіді зберігаються лише в цьому браузері. Увійди, щоб не загубити їх.</span><button type="button" class="btn sm" data-in>Увійти</button><button type="button" class="sz-x" aria-label="Закрити">×</button></div>');
    document.body.appendChild(bar);
    $("[data-in]", bar).addEventListener("click", function () { bar.remove(); openAuth(); });
    $(".sz-x", bar).addEventListener("click", function () { bar.remove(); });
  }

  /* ---------- самоперевірка: еталон після власної відповіді ---------- */
  function weekOf(lid) { return lid ? String(+lid.split("-")[0]) : null; }
  function discussUrl() { var w = weekOf(lessonId); return (C.telegramTopics && C.telegramTopics[w]) || C.telegramGroup || null; }
  function initSelfCheck() {
    if (!lessonId) return;
    $$("details.more").forEach(function (d) {
      var sum = $("summary", d);
      if (!sum || !/Самоперевірка|Еталон/i.test(sum.textContent)) return;
      var scope = d.closest(".screen") || d.parentElement;
      var fields = $$("[data-field]", scope).filter(function (f) { return !d.contains(f); });
      if (!fields.length || B.viewAs) { addDiscuss(d); return; }
      var hint = el('<span class="sz-lock">' + ICON.lock + " Відкриється після твоєї відповіді вище</span>");
      sum.appendChild(hint);
      function filled() { return fields.some(function (f) { return (f.value || "").trim().length >= 3; }); }
      function paint() { var ok = filled(); d.classList.toggle("sz-locked", !ok); hint.hidden = ok; }
      paint();
      fields.forEach(function (f) { f.addEventListener("input", paint); });
      sum.addEventListener("click", function (e) {
        if (!filled()) { e.preventDefault(); hint.classList.remove("sz-shake"); void hint.offsetWidth; hint.classList.add("sz-shake"); var f = fields.find(function (x) { return !(x.value || "").trim(); }) || fields[0]; if (f && f.focus) f.focus(); }
        else if (!d.open) track("selfcheck_open", { props: { screen: scope.id || null } });
      });
      addDiscuss(d);
    });
  }
  function addDiscuss(d) {
    var url = discussUrl(); if (!url) return;
    var body = $("div", d) || d;
    body.appendChild(el('<p class="sz-discuss"><a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(url) + '">Обговорити в групі тижня ' + weekOf(lessonId) + "</a></p>"));
    $(".sz-discuss a", body).addEventListener("click", function () { track("discuss_click"); });
  }

  /* ---------- фідбек ---------- */
  function initFeedback() {
    if (!lessonId || B.viewAs) return;
    var done = $("#done-btn"); if (!done) return;
    var host = done.parentElement;
    var isPractice = /-3$/.test(lessonId), week = weekOf(lessonId);
    var blocks = [isPractice ? { scope: "week", ref: week, title: "Як тобі тиждень " + week + "?", scale: 5 } : { scope: "lesson", ref: lessonId, title: "Як тобі цей урок?", scale: 5 }];
    if (lessonId === "12-3") blocks.push({ scope: "final", ref: "pm", title: "Наскільки ймовірно, що ти порекомендуєш курс другу?", scale: 10 });
    blocks.forEach(function (b) {
      var sentKey = "sz-fb-" + b.scope + "-" + b.ref;
      var nums = []; for (var i = b.scale === 10 ? 0 : 1; i <= b.scale; i++) nums.push(i);
      var box = el('<div class="sz-fb" data-scope="' + b.scope + '"><span class="label">Твій відгук</span><b class="sz-fb-t">' + b.title + "</b>" +
        '<div class="sz-rate" role="radiogroup" aria-label="Оцінка">' + nums.map(function (n) { return '<button type="button" role="radio" aria-checked="false" data-r="' + n + '">' + n + "</button>"; }).join("") + "</div>" +
        '<div class="sz-rate-legend"><span>' + (b.scale === 10 ? "Точно ні" : "Погано") + "</span><span>" + (b.scale === 10 ? "Точно так" : "Чудово") + "</span></div>" +
        '<label class="sz-small" for="fb-' + b.scope + '">Що було незрозуміло або що варто покращити? (за бажанням)</label>' +
        '<textarea id="fb-' + b.scope + '" rows="3" class="wb-ignore"></textarea>' +
        '<div class="sz-actions"><button type="button" class="btn sm" data-send disabled>Надіслати</button><span class="sz-small" data-msg></span></div></div>');
      host.appendChild(box);
      if (B.rawGet(sentKey)) { box.innerHTML = '<span class="label">Твій відгук</span><p class="sz-thanks">Дякуємо за відгук! Він допомагає робити курс кращим.</p>'; return; }
      var rating = null, send = $("[data-send]", box), msg = $("[data-msg]", box), ta = $("textarea", box);
      $$("[data-r]", box).forEach(function (btn) {
        btn.addEventListener("click", function () {
          rating = +btn.dataset.r; send.disabled = false;
          $$("[data-r]", box).forEach(function (x) { x.setAttribute("aria-checked", String(x === btn)); });
        });
      });
      send.addEventListener("click", function () {
        if (!SZ.user) {
          sessionStorage.setItem("sz-fb-draft", JSON.stringify({ scope: b.scope, rating: rating, comment: ta.value }));
          openAuth({ title: "Увійди, щоб надіслати відгук", text: "Відгук прив'язується до акаунту, щоб ми могли зрозуміти, на якому етапі курсу ти зараз. Твій прогрес теж збережеться." });
          return;
        }
        send.disabled = true; msg.textContent = "Надсилаю…";
        fetch(REST + "feedback", { method: "POST", headers: headers({ Prefer: "return=minimal" }), body: JSON.stringify({ user_id: SZ.user.id, course: "pm", scope: b.scope, ref: b.ref, rating: rating, comment: ta.value.trim() || null }) })
          .then(function (r) {
            if (!r.ok) throw 0;
            B.rawSet(sentKey, "1"); track("feedback_sent", { props: { scope: b.scope, rating: rating } });
            box.innerHTML = '<span class="label">Твій відгук</span><p class="sz-thanks">Дякуємо за відгук! Він допомагає робити курс кращим.</p>';
          })
          .catch(function () { send.disabled = false; msg.textContent = "Не вдалося надіслати. Спробуй ще раз."; });
      });
      try {
        var dr = JSON.parse(sessionStorage.getItem("sz-fb-draft") || "null");
        if (dr && dr.scope === b.scope) { ta.value = dr.comment || ""; var rb = $('[data-r="' + dr.rating + '"]', box); if (rb) rb.click(); sessionStorage.removeItem("sz-fb-draft"); }
      } catch (e) {}
    });
    if (lessonId === "12-3") host.appendChild(el('<a class="btn" href="/pm/certificate.html">Отримати сертифікат</a>'));
  }

  /* ---------- режим перегляду адміном ---------- */
  function initViewAs() {
    if (!B.viewAs) return;
    var bar = el('<div class="sz-viewbar" role="status">Перегляд як <b>' + esc(B.viewAs.name || "студент") + '</b> · тільки читання <button type="button" class="btn sm">Вийти з перегляду</button></div>');
    document.body.appendChild(bar);
    $("button", bar).addEventListener("click", function () { sessionStorage.removeItem("sz-viewas"); location.href = "/admin/#u=" + B.viewAs.uid; });
    function lock() { $$("textarea, input, select").forEach(function (x) { if (!x.closest(".sz-viewbar")) { x.readOnly = true; if (x.type === "checkbox" || x.type === "radio") x.disabled = true; } }); }
    lock(); setTimeout(lock, 800);
    $$("details.more").forEach(function (d) { d.open = true; });
  }

  /* ---------- старт ---------- */
  function start(session) {
    SZ.session = session || null; SZ.user = session ? session.user : null;
    var p = SZ.user ? afterLogin() : Promise.resolve();
    return p.then(function () {
      renderAccount();
      if (SZ.user && !B.viewAs) return initialSync();
    });
  }

  initViewAs();
  initSelfCheck();
  initFeedback();
  track("page_view", { props: { path: location.pathname, ref: document.referrer ? document.referrer.slice(0, 120) : null } });
  setInterval(function () { if (B.events.length) flushEvents(); }, 5000);

  if (!SB) { renderAccount(); initOnboardingHooks(); readyResolve(SZ); return; }
  SB.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    if (location.search.indexOf("code=") >= 0) { try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {} if (s) track("login", { props: {} }); }
    return start(s);
  }).then(function () { readyResolve(SZ); initOnboardingHooks(); maybeNudge(); if (!needOnboarding()) maybeTips(); }, function () { readyResolve(SZ); });
  SB.auth.onAuthStateChange(function (ev, s) {
    if (ev === "TOKEN_REFRESHED") SZ.session = s;
    if (ev === "SIGNED_IN" && !SZ.user && s) start(s);
  });
})();
