/* Sprint Zero: синхронний старт. Підключається в <head> до скриптів курсу.
   1) Стежить за змінами даних курсу (ключі pmz-*) у localStorage, щоб app.js відправив їх у базу.
   2) Режим «дивитися як юзер» для адміна: підміняє дані курсу даними студента, тільки читання. */
(function () {
  var LS = window.localStorage;
  var PREFIX = "pmz-";
  var SZB = window.SZB = { dirty: {}, events: [], viewAs: null, listeners: [] };
  var proto = Storage.prototype;
  var origGet = proto.getItem, origSet = proto.setItem, origRemove = proto.removeItem;

  function sget(k) { try { return origGet.call(sessionStorage, k); } catch (e) { return null; } }
  function lget(k) { try { return origGet.call(LS, k); } catch (e) { return null; } }
  function lset(k, v) { try { origSet.call(LS, k, v); } catch (e) {} }
  SZB.rawGet = lget; SZB.rawSet = lset;
  SZB.rawRemove = function (k) { try { origRemove.call(LS, k); } catch (e) {} };
  SZB.notify = function () { SZB.listeners.forEach(function (f) { try { f(); } catch (e) {} }); };

  /* анонімний ідентифікатор і UTM першого візиту */
  var anon = lget("sz-anon");
  if (!anon) { anon = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); lset("sz-anon", anon); }
  SZB.anon = anon;
  try {
    var q = new URLSearchParams(location.search), utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].forEach(function (k) { if (q.get(k)) utm[k] = q.get(k).slice(0, 100); });
    if (Object.keys(utm).length && !lget("sz-utm")) { utm.landing = location.pathname; utm.at = new Date().toISOString(); lset("sz-utm", JSON.stringify(utm)); }
  } catch (e) {}

  /* режим перегляду адміном */
  var va = null;
  try { va = JSON.parse(sget("sz-viewas") || "null"); } catch (e) {}
  if (va && va.state) {
    SZB.viewAs = va;
    document.documentElement.classList.add("sz-viewas");
    proto.getItem = function (k) {
      if (this === LS && String(k).indexOf(PREFIX) === 0) return Object.prototype.hasOwnProperty.call(va.state, k) ? va.state[k] : null;
      return origGet.apply(this, arguments);
    };
    proto.setItem = function (k) { if (this === LS && String(k).indexOf(PREFIX) === 0) return; return origSet.apply(this, arguments); };
    proto.removeItem = function (k) { if (this === LS && String(k).indexOf(PREFIX) === 0) return; return origRemove.apply(this, arguments); };
    return;
  }

  /* звичайний режим: позначаємо змінені ключі */
  function doneSet(v) { try { var s = JSON.parse(v || "null"); return (s && s.done) || {}; } catch (e) { return {}; } }
  proto.setItem = function (k, v) {
    if (this === LS && String(k).indexOf(PREFIX) === 0) {
      if (k === "pmz-progress-v1") {
        var before = doneSet(lget(k)), after = doneSet(v);
        Object.keys(after).forEach(function (id) { if (!before[id]) SZB.events.push({ name: "lesson_done", lesson: id }); });
        Object.keys(before).forEach(function (id) { if (!after[id]) SZB.events.push({ name: "lesson_undone", lesson: id }); });
      }
      if (k.indexOf("pmz-pos-") === 0 && lget(k) !== v) SZB.events.push({ name: "step_view", lesson: k.slice(8), props: { screen: String(v).slice(0, 40) } });
      var r = origSet.apply(this, arguments);
      SZB.dirty[k] = true; SZB.notify();
      return r;
    }
    return origSet.apply(this, arguments);
  };
  proto.removeItem = function (k) {
    if (this === LS && String(k).indexOf(PREFIX) === 0) { var r = origRemove.apply(this, arguments); SZB.dirty[k] = true; SZB.notify(); return r; }
    return origRemove.apply(this, arguments);
  };
})();
