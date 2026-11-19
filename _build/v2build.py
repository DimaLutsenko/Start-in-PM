#!/usr/bin/env python3
"""Збирає урок у новому кроковому форматі.
Шаблон V2/<id>.html: перший рядок — JSON-мета в коментарі, далі екрани.
<take sel="#essence" i="1-3"></take> — діти секції оригіналу з індексами 1..3 (h2 має індекс 0).
<take sel="#history > ol.timeline" add="a|b"></take> — сам елемент; add — data-add для li.
"""
import sys, re, json, pathlib
from bs4 import BeautifulSoup

S = pathlib.Path(__file__).parent
REPO = pathlib.Path("/home/claude/start-in-pm")
VER = "19"

def build(lid):
    orig_html = (S / "orig" / f"{lid}.html").read_text()
    orig = BeautifulSoup(orig_html, "html.parser")
    tpl = (S / "V2" / f"{lid}.html").read_text()
    meta = json.loads(re.match(r"<!--(.*?)-->", tpl, re.S).group(1))
    body = tpl[tpl.index("-->") + 3:]

    def take(m):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        sel = attrs["sel"]
        if "i" in attrs:
            sec = orig.select_one(sel)
            assert sec is not None, sel
            kids = sec.find_all(recursive=False)
            a, _, b = attrs["i"].partition("-")
            a = int(a); b = int(b) if b else a
            return "\n".join(str(k) for k in kids[a:b + 1])
        els = orig.select(sel)
        assert els, sel
        if "add" in attrs:
            for el in els:
                for li, t in zip(el.find_all("li", recursive=False), attrs["add"].split("|")):
                    li["data-add"] = t
        return "\n".join(str(e) for e in els)

    body = re.sub(r"<take ((?:[^>\"]|\"[^\"]*\")*)></take>", take, body)
    script = orig_html[orig_html.rindex("<script>") + 8: orig_html.rindex("</script>")]
    extra_js = "".join(f'<script src="../assets/{j}.js?v={VER}"></script>\n' for j in meta.get("js", []))
    html = f"""<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Урок {meta['code']} · {meta['title']}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Unbounded:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../assets/style.css?v={VER}">
<link rel="stylesheet" href="../assets/v2.css?v={VER}">
</head>
<body class="v2" data-root="../" data-lesson="{lid}">
<header class="ls-top"><div class="in">
  <div class="ls-bar">
    <div class="l"><a class="ls-close" href="../program.html#week-{meta['week']}" aria-label="До програми"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a>
    <span class="ls-title">Урок {meta['code']} · <b>{meta['title']}</b></span></div>
    <span class="ls-count" id="ls-count"></span>
  </div>
  <div class="ls-steps" id="ls-steps"></div>
</div></header>
<main class="ls-main">
<article class="lesson-body" data-steps="{meta.get('steps', 'Розбираємось|На прикладі «Слота»|Пробуємо|Перевіряємо')}">
{body.strip()}
</article>
</main>
<nav class="ls-foot" id="ls-foot" aria-label="Навігація уроком"></nav>
<script src="../assets/course.js?v={VER}"></script>
<script src="../assets/quiz.js?v={VER}"></script>
<script src="../assets/workbook.js?v={VER}"></script>
{extra_js}<script src="../assets/stepper.js?v={VER}"></script>
<script>{script}
Stepper.init();</script>
</body>
</html>
"""
    (REPO / "lessons" / f"{lid}.html").write_text(html)
    print(lid, "screens:", html.count('class="screen"'))

if __name__ == "__main__":
    for lid in sys.argv[1:]:
        build(lid)
