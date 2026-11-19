#!/usr/bin/env python3
"""Генерує шаблон V2/<id>.html для уроку зі старого формату і збирає його через v2build."""
import sys, re, json, pathlib, html as H
from bs4 import BeautifulSoup
S = pathlib.Path(__file__).parent
sys.path.insert(0, str(S))
import v2build

SKIP_T = {"goal", "slot", "case", "mistakes", "task", "check", "more"}
ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
OK = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>'

def kids(sec):
    return sec.find_all(recursive=False)

def gen(lid):
    soup = BeautifulSoup((S / "orig" / f"{lid}.html").read_text(), "html.parser")
    head = soup.select_one("header.lesson-head")
    code = head.select_one(".label").get_text().replace("Урок", "").strip()
    title = head.h1.get_text().strip()
    desc = head.select_one("p.muted").get_text().strip() if head.select_one("p.muted") else ""
    tags = [t.get_text().strip() for t in head.select(".tag")]
    crumb = soup.select("nav.crumbs a")[-1]
    week = int(re.search(r"week-(\d+)", crumb["href"]).group(1))
    week_title = crumb.get_text().split(".", 1)[-1].strip()
    js = [n for n in ("tools", "matrix") if f"assets/{n}.js" in str(soup)]
    secs = soup.select("article.lesson-body > section")
    ids = [s["id"] for s in secs]
    practice = lid.endswith("-3")
    steps = ["Контекст", "Робимо", "Розбір", "Перевіряємо"] if practice else ["Розбираємось", "На прикладі «Слота»", "Пробуємо", "Перевіряємо"]

    # розподіл секцій по кроках
    plan = []  # (id, step)
    first_step = next((i for i, x in enumerate(ids) if x.startswith("step")), None)
    for i, sid in enumerate(ids):
        if sid in ("goal", "check", "more", "next", "final", "case"):
            continue
        if practice:
            if sid in ("criteria", "review"): k = 3
            elif first_step is not None and i >= first_step: k = 2
            else: k = 1
        else:
            if sid in ("slot", "mistakes"): k = 2
            elif sid == "task": k = 3
            else: k = 1
        plan.append((sid, k))
    # теорія без Слота/помилок: крок 2 порожній — тоді «Слот» відсутній, лишаємо як є
    case_home = None
    if "case" in ids and not practice:
        case_home = "mistakes" if "mistakes" in ids else ("slot" if "slot" in ids else None)

    out = [f'<!--{json.dumps({"code": code, "title": H.unescape(title), "week": week, "js": js, "steps": "|".join(steps)}, ensure_ascii=False)}-->']

    # старт
    goal = soup.select_one("#goal")
    gk = kids(goal)
    p_idx = [i for i, k in enumerate(gk) if k.name == "p"]
    panel_i = next((i for i, k in enumerate(gk) if "panel" in (k.get("class") or []) and k.find("ol")), None)
    other_idx = [i for i, k in enumerate(gk) if i and i not in p_idx and i != panel_i]
    outcomes = [li.get_text(" ", strip=True) for li in gk[panel_i].select("ol > li")] if panel_i is not None else []
    counts = {k: sum(1 for _, s in plan if s == k) for k in (1, 2, 3)}
    names = {k: [] for k in (1, 2, 3)}
    for sid, k in plan:
        h2 = soup.select_one(f"#{sid} > h2")
        names[k].append(h2.get_text(" ", strip=True) if h2 else sid)
    def plural(n):
        return "екран" if n % 10 == 1 and n % 100 != 11 else ("екрани" if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14) else "екранів")
    plan_btns = ""
    for k in (1, 2, 3, 4):
        if k == 4:
            txt, meta = "Тест з поясненнями і підсумок уроку.", "Тест · 5 хв"
        else:
            if not counts[k]: continue
            txt = ", ".join(names[k][:4]) + ("…" if len(names[k]) > 4 else ".")
            meta = f"{counts[k]} {plural(counts[k])}"
        plan_btns += f'<button type="button" data-jump="{k}"><i>{k}</i><b>{steps[k-1]}</b><span>{H.escape(txt)}</span><small>{meta}</small></button>\n'
    chips = "".join(f'<span class="chip">{H.escape(t.capitalize())}</span>' for t in tags) + '<span class="chip">4 кроки</span>'
    out.append(f'''<section class="screen" id="start" data-step="0" data-name="Старт" data-nofoot="1">
  <div class="start-hero">
    <div>
      <span class="eyebrow">Тиждень {week} · {H.escape(week_title)} · Урок {code}</span>
      <h1>{title}</h1>
      <p class="lead">{H.escape(desc)}</p>
      <div class="chips">{chips}</div>
      {"".join(f'<take sel="#goal" i="{i}"></take>' for i in p_idx)}
      <button type="button" class="btn" data-next style="align-self:flex-start">{"Почати практику" if practice else "Почати урок"} {ARROW}</button>
    </div>
    <aside class="big-note"><span class="label">Після уроку ти зможеш</span><ol>{"".join(f"<li><span>{H.escape(o)}</span></li>" for o in outcomes)}</ol></aside>
  </div>
  {"".join(f'<take sel="#goal" i="{i}"></take>' for i in other_idx)}
  <span class="label">Як пройде {"практика" if practice else "урок"}</span>
  <div class="steps-plan">
{plan_btns}  </div>
</section>''')

    # контентні екрани
    for sid, k in plan:
        sec = soup.select_one(f"#{sid}")
        ks = kids(sec)
        h2 = sec.find("h2", recursive=False)
        name = h2.get_text(" ", strip=True) if h2 else sid
        summ = [i for i, x in enumerate(ks) if "summary" in (x.get("class") or []) and len(x.get_text()) < 450]
        lift = summ[0] if len(summ) == 1 else None
        body_idx = [i for i, x in enumerate(ks) if x is not h2 and i != lift]
        if lift is not None:
            top = f'<div class="head-row"><div><h2>{h2.decode_contents() if h2 else name}</h2></div><take sel="#{sid}" i="{lift}"></take></div>'
        else:
            top = f"<h2>{h2.decode_contents() if h2 else name}</h2>"
        extra = ""
        if sid == case_home:
            extra = '<take sel="#case" i="1"></take>' if len(kids(soup.select_one("#case"))) > 1 else ""
        out.append(f'''<section class="screen" id="{sid}" data-step="{k}" data-name="{H.escape(name)}">
  {top}
  {"".join(f'<take sel="#{sid}" i="{i}"></take>' for i in body_idx)}
  {extra}
</section>''')

    # тест
    chk = soup.select_one("#check")
    ck = kids(chk)
    cl_idx = [i for i, x in enumerate(ck) if "checklist" in (x.get("class") or [])]
    q_idx = [i for i, x in enumerate(ck) if i and i not in cl_idx]
    out.append(f'''<section class="screen" id="check" data-step="4" data-name="Тест">
  <h2>{ck[0].decode_contents() if ck and ck[0].name == "h2" else "Самоперевірка"}</h2>
  {"".join(f'<take sel="#check" i="{i}"></take>' for i in q_idx)}
</section>''')

    # фініш
    nxt = next((x for x in ("next", "final") if x in ids), None)
    left_extra = ""
    if nxt:
        nk = kids(soup.select_one(f"#{nxt}"))
        left_extra = "".join(f'<take sel="#{nxt}" i="{i}"></take>' for i in range(1, len(nk)))
    right = ""
    if "more" in ids:
        mk = kids(soup.select_one("#more"))
        right += '<span class="label">Що почитати далі · за бажанням</span>' + "".join(f'<take sel="#more" i="{i}"></take>' for i in range(1, len(mk)))
    if practice and "case" in ids and len(kids(soup.select_one("#case"))) > 1:
        right += '<take sel="#case" i="1"></take>'
    head_txt = f"Тиждень {week} завершено" if practice else f"Урок {code} пройдено"
    out.append(f'''<section class="screen" id="finish" data-step="4" data-name="Підсумок" data-nofoot="1">
  <div class="split">
    <div>
      <div class="finish-head"><span class="ok">{OK}</span><div><span class="label" style="color:var(--done)">Урок {code} · фініш</span><h2 style="font-size:32px">{head_txt}</h2></div></div>
      {left_extra}
      <span class="label">Перевір себе</span>
      {"".join(f'<take sel="#check" i="{i}"></take>' for i in cl_idx)}
      <button class="btn" id="done-btn" type="button">Позначити як пройдений</button>
    </div>
    <div>
      {right}
      <a class="btn ghost" href="../zoshyt.html">Відкрити «Мій зошит»</a>
      <div class="pager" id="pager"></div>
      <button type="button" class="btn ghost sm" data-prev style="align-self:flex-start">Назад до тесту</button>
    </div>
  </div>
</section>''')
    (S / "V2" / f"{lid}.html").write_text("\n\n".join(out) + "\n")
    v2build.build(lid)

if __name__ == "__main__":
    for lid in sys.argv[1:]:
        gen(lid)
