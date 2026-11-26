# Sprint Zero Academy

Платформа практичних курсів. Сайт: https://sprintzero-academy.github.io

## Структура
- `index.html` — головна Sprint Zero
- `pm/` — курс «Продакт з нуля» (див. `pm/README.md`, збірка уроків — `pm/_build/`)
- `cert/` — публічна сторінка сертифіката (`/cert/?id=<код>`)
- `admin/` — адмінка (тільки для акаунтів з `is_admin`)
- `privacy.html`, `terms.html` — політика конфіденційності і умови
- `assets/sz/` — спільний код платформи:
  - `config.js` — адреса Supabase, публічний ключ, посилання на Telegram
  - `boot.js` — синхронний старт: дзеркалить дані курсу (`pmz-*` у localStorage) і режим перегляду адміном
  - `app.js` — вхід через Google, синхронізація з базою, онбординг, підказки, фідбек, самоперевірка, аналітика
  - `cert.js`, `cert.css` — відмальовка сертифіката
- `supabase/` — SQL-міграції бази (запускаються в Supabase → SQL Editor)

## Нова сторінка курсу
У `<head>`: `sz.css`, `config.js`, `boot.js` (до скриптів курсу). Перед `</body>`: supabase-js з CDN і `app.js`.
Шаблон уроків у `pm/_build/v2build.py` уже містить ці підключення.
