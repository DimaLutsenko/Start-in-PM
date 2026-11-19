import asyncio, sys
from playwright.async_api import async_playwright
S="/tmp/claude-0/-home-claude/a5d13250-5372-5fde-ae2c-2b2ff6cb63f0/scratchpad/shots"
import os; os.makedirs(S, exist_ok=True)
async def m():
  lid=sys.argv[1]; ids=sys.argv[2].split(','); w=int(sys.argv[3]) if len(sys.argv)>3 else 1280
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":w,"height":900}, color_scheme=os.environ.get("CS","light"))
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    url = "file:///home/claude/start-in-pm/"+(lid+".html" if lid in ("index","program","product","zoshyt") else f"lessons/{lid}.html")
    for sid in ids:
      await pg.goto(url+("#"+sid if sid!='-' else ''))
      await pg.wait_for_timeout(500)
      sw = await pg.evaluate("document.documentElement.scrollWidth")
      h = await pg.evaluate("document.documentElement.scrollHeight")
      await pg.screenshot(path=f"{S}/{lid}-{sid}-{w}.png", full_page=True)
      print(sid, "scrollW", sw, "H", h)
    print("errors", errs)
    await b.close()
asyncio.run(m())
