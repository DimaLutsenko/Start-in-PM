import asyncio, sys, glob, os
from playwright.async_api import async_playwright
async def m():
  ids=sys.argv[1:]
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for w in (1280,390):
      pg=await b.new_page(viewport={"width":w,"height":900})
      for lid in ids:
        errs=[]; pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
        await pg.goto(f"file:///home/claude/sprintzero-academy.github.io/pm/lessons/{lid}.html#start"); await pg.wait_for_timeout(300)
        n=await pg.evaluate("document.querySelectorAll('section.screen').length")
        bad=[]
        for i in range(n):
          await pg.evaluate(f"Stepper.show({i})"); await pg.wait_for_timeout(60)
          sw=await pg.evaluate("document.documentElement.scrollWidth")
          if sw>w+1:
            sid=await pg.evaluate(f"document.querySelectorAll('section.screen')[{i}].id")
            wide=await pg.evaluate(f"[...document.querySelectorAll('section.screen:not([hidden]) *')].filter(e=>e.getBoundingClientRect().right>{w}+1).slice(0,2).map(e=>e.tagName+'.'+e.className)")
            bad.append((sid,sw,wide))
        q=await pg.evaluate("document.querySelectorAll('.qz-q, .quiz .qz-item, .quiz > *').length")
        print(w,lid,n,"screens","quiz",q,"errs",errs[:2],"overflow",bad[:3])
      await pg.close()
    await b.close()
asyncio.run(m())
