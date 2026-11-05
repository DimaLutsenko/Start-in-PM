/* Структура курсу: єдине джерело правди для програми, навігації і прогресу. */
const COURSE = {
  title: "Продакт з нуля",
  weeks: [
    { n: 1, title: "Роль продакт-менеджера", goal: "Розібратися, що робить продакт і де межі ролі.", artifact: "Карта стейкхолдерів «Слота»", lessons: [
      { title: "Роль продакт-менеджера", desc: "Історія ролі, навіщо вона з'явилась, основні задачі, зони відповідальності, типи продактів і їхній робочий тиждень.", type: "theory", minutes: 60, status: "ready" },
      { title: "Продакт і команда: хто за що відповідає", desc: "Чим продакт відрізняється від проджекта і продакт-овнера, і хто ще працює поруч: від CEO до підтримки.", type: "theory", minutes: 60, status: "ready" },
      { title: "Практика: знайомство зі «Слотом»", desc: "Вивчаєш продукт курсу і складаєш карту стейкхолдерів його команди.", type: "practice" } ] },
    { n: 2, title: "Користувач і його задачі", goal: "Навчитися бачити продукт очима користувача.", artifact: "Сегменти і JTBD «Слота»", lessons: [
      { title: "Сегментація і персони", desc: "Як ділити користувачів на групи і коли персони більше шкодять, ніж допомагають.", type: "theory" },
      { title: "Jobs To Be Done", desc: "Яку «роботу» користувач доручає продукту і чому це важливіше за його вік і стать.", type: "theory" },
      { title: "Практика: сегменти і JTBD", desc: "Описуєш сегменти «Слота» і їхні ключові задачі.", type: "practice" } ] },
    { n: 3, title: "Дослідження користувачів", goal: "Збирати факти про поведінку, а не думки про ідею.", artifact: "Сценарій інтерв'ю і синтез інсайтів", lessons: [
      { title: "Custdev-інтерв'ю", desc: "Як питати так, щоб люди розповідали про реальний досвід, а не хвалили ідею.", type: "theory" },
      { title: "Кількісні дані і конкуренти", desc: "Опитування, продуктові дані і аналіз конкурентів.", type: "theory" },
      { title: "Практика: інтерв'ю та інсайти", desc: "Пишеш сценарій інтерв'ю і зводиш відповіді в інсайти.", type: "practice" } ] },
    { n: 4, title: "Від проблеми до гіпотези", goal: "Перетворювати інсайти на ідеї, які можна перевірити.", artifact: "Дерево можливостей «Слота»", lessons: [
      { title: "Формулювання проблеми", desc: "Чим проблема відрізняється від рішення і як її описати.", type: "theory" },
      { title: "Гіпотези і Opportunity Solution Tree", desc: "Як будувати гіпотези і пов'язувати їх із ціллю продукту.", type: "theory" },
      { title: "Практика: дерево можливостей", desc: "Будуєш дерево від цілі до гіпотез для «Слота».", type: "practice" } ] },
    { n: 5, title: "Метрики продукту", goal: "Вимірювати те, що справді показує цінність.", artifact: "Дерево метрик «Слота»", lessons: [
      { title: "North Star і дерево метрик", desc: "Одна головна метрика і як вона розкладається на ті, на які можна впливати.", type: "theory" },
      { title: "AARRR і воронки", desc: "Шлях користувача від першого контакту до оплати і де він губиться.", type: "theory" },
      { title: "Практика: система метрик", desc: "Обираєш North Star для «Слота» і будуєш дерево метрик.", type: "practice" } ] },
    { n: 6, title: "Юніт-економіка", goal: "Розуміти, чи заробляє продукт на кожному клієнті.", artifact: "Модель юніт-економіки в таблиці", lessons: [
      { title: "LTV, CAC і окупність", desc: "Скільки коштує залучити клієнта і скільки він приносить.", type: "theory" },
      { title: "Retention і когорти", desc: "Чому утримання важливіше за залучення і як читати когортну таблицю.", type: "theory" },
      { title: "Практика: модель юніт-економіки", desc: "Рахуєш юніт-економіку «Слота» в таблиці на вигаданих даних.", type: "practice" } ] },
    { n: 7, title: "Аналітика і експерименти", goal: "Приймати рішення на даних і не обманювати себе.", artifact: "Дизайн A/B-тесту", lessons: [
      { title: "Як читати дані без самообману", desc: "Кореляція і причина, вибірка, сезонність і інші пастки.", type: "theory" },
      { title: "A/B-тести простими словами", desc: "Як влаштований експеримент, що таке значущість і коли тест не потрібен.", type: "theory" },
      { title: "Практика: дизайн експерименту", desc: "Проєктуєш A/B-тест для однієї з гіпотез «Слота».", type: "practice" } ] },
    { n: 8, title: "Пріоритизація і roadmap", goal: "Вирішувати, що робити зараз, що потім, а що ніколи.", artifact: "Roadmap «Слота» на квартал", lessons: [
      { title: "RICE, ICE і Kano", desc: "Фреймворки пріоритизації, їхні сильні сторони і обмеження.", type: "theory" },
      { title: "Roadmap як інструмент комунікації", desc: "Види roadmap і чому це не план з датами.", type: "theory" },
      { title: "Практика: квартальний roadmap", desc: "Пріоритизуєш беклог і збираєш roadmap «Слота».", type: "practice" } ] },
    { n: 9, title: "Вимоги і робота з розробкою", goal: "Ставити задачі так, щоб команда зробила саме те, що потрібно.", artifact: "PRD для однієї фічі", lessons: [
      { title: "PRD і user stories", desc: "Як описати фічу: проблема, рішення, критерії приймання.", type: "theory" },
      { title: "Scrum, Kanban і спринти", desc: "Як живе команда розробки і яке місце в цьому процесі продакта.", type: "theory" },
      { title: "Практика: пишемо PRD", desc: "Пишеш повний PRD для фічі «Слота».", type: "practice" } ] },
    { n: 10, title: "Стейкхолдери і комунікація", goal: "Домовлятися з бізнесом, продажами і командою.", artifact: "Продуктовий апдейт для керівництва", lessons: [
      { title: "Карта впливу і домовленості", desc: "Хто впливає на продукт і як вибудувати з ними роботу.", type: "theory" },
      { title: "Як казати «ні» і захищати рішення", desc: "Аргументація, компроміси і робота із запитами «зробіть під клієнта».", type: "theory" },
      { title: "Практика: продуктовий апдейт", desc: "Готуєш апдейт для CEO «Слота» про результати і плани.", type: "practice" } ] },
    { n: 11, title: "Запуск і зростання", goal: "Довести фічу до користувача і до результату.", artifact: "План запуску фічі", lessons: [
      { title: "Go-to-Market і позиціонування", desc: "Кому, як і з яким повідомленням ми запускаємо продукт або фічу.", type: "theory" },
      { title: "Онбординг, активація і ціна", desc: "Перший досвід користувача, момент цінності і моделі ціноутворення.", type: "theory" },
      { title: "Практика: план запуску", desc: "Складаєш план запуску нової фічі «Слота».", type: "practice" } ] },
    { n: 12, title: "AI, кар'єра і фінальний проєкт", goal: "Зібрати все в портфоліо і підготуватися до роботи.", artifact: "Продуктова стратегія «Слота»", lessons: [
      { title: "AI в роботі продакта", desc: "Дослідження, аналіз, прототипи і рутина з AI-інструментами.", type: "theory" },
      { title: "Співбесіда і кар'єра PM", desc: "Як проходять співбесіди, продуктові кейси і як рости в ролі.", type: "theory" },
      { title: "Фінальний проєкт", desc: "Збираєш усі артефакти курсу в продуктову стратегію «Слота».", type: "practice" } ] }
  ]
};

const PMZ = (() => {
  const KEY = "pmz-progress-v1";
  const pad = (n) => String(n).padStart(2, "0");

  const lessons = [];
  COURSE.weeks.forEach((w) => w.lessons.forEach((l, i) => {
    l.id = `${pad(w.n)}-${i + 1}`;
    l.code = `${w.n}.${i + 1}`;
    l.week = w;
    l.minutes = l.minutes || (l.type === "practice" ? 90 : 40);
    l.status = l.status || "draft";
    lessons.push(l);
  }));

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return { done: s.done, checks: s.checks || {} }; } catch (e) {}
    return { done: {}, checks: {} };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  let state = load();

  const root = () => document.body.dataset.root || "";
  const href = (l) => `${root()}lessons/${l.id}.html`;
  const isDone = (id) => !!state.done[id];
  const typeTag = (l) => l.type === "practice" ? '<span class="tag practice">практика</span>' : '<span class="tag">теорія</span>';
  const doneCount = () => lessons.filter((l) => isDone(l.id)).length;
  const nextLesson = () => lessons.find((l) => !isDone(l.id));

  function renderSummary(el) {
    if (!el) return;
    const d = doneCount(), total = lessons.length, nx = nextLesson();
    el.innerHTML = `
      <span class="label">Твій прогрес</span>
      <span class="big">${d} / ${total}</span>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${d}"><span style="width:${(d / total) * 100}%"></span></div>
      <p>${nx ? `Далі: <a href="${href(nx)}">${nx.code} ${nx.title}</a>` : "Курс пройдено повністю."}</p>`;
  }

  function renderProgram(el) {
    if (!el) return;
    el.innerHTML = COURSE.weeks.map((w) => {
      const all = w.lessons.every((l) => isDone(l.id));
      return `<article class="week" id="week-${w.n}">
        <div class="week-num ${all ? "complete" : ""}">${pad(w.n)}</div>
        <div class="week-body">
          <div><span class="label">Тиждень ${w.n}</span><h2>${w.title}</h2></div>
          <p class="goal">${w.goal}</p>
          <ul class="lessons">${w.lessons.map((l) => `
            <li class="lesson-row"><a href="${href(l)}">
              <span class="check ${isDone(l.id) ? "on" : ""}" aria-label="${isDone(l.id) ? "Пройдено" : "Не пройдено"}"></span>
              <span class="code">${l.code}</span>
              <span class="t"><span>${l.title}</span><small>${l.desc}</small></span>
              <span class="meta">${typeTag(l)}<span class="tag">${l.minutes} хв</span>${l.status === "draft" ? '<span class="tag draft">чернетка</span>' : ""}</span>
            </a></li>`).join("")}
          </ul>
          <p class="artifact-line">Артефакт тижня: <b>${w.artifact}</b></p>
        </div></article>`;
    }).join("");
  }

  function renderPortfolio(el) {
    if (!el) return;
    el.innerHTML = COURSE.weeks.map((w) => `<li><span class="mono">${pad(w.n)}</span><span>${w.artifact}</span></li>`).join("");
  }

  function initReset(btn, confirmBox) {
    if (!btn || !confirmBox) return;
    btn.addEventListener("click", () => { confirmBox.hidden = false; btn.hidden = true; });
    confirmBox.querySelector("[data-yes]").addEventListener("click", () => {
      state = { done: {}, checks: {} }; save(state); location.reload();
    });
    confirmBox.querySelector("[data-no]").addEventListener("click", () => { confirmBox.hidden = true; btn.hidden = false; });
  }

  function initLesson() {
    const id = document.body.dataset.lesson;
    const idx = lessons.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const l = lessons[idx];

    const btn = document.getElementById("done-btn");
    const paint = () => {
      btn.textContent = isDone(id) ? "Урок пройдено ✓" : "Позначити як пройдений";
      btn.classList.toggle("is-done", isDone(id));
      btn.setAttribute("aria-pressed", isDone(id));
    };
    btn.addEventListener("click", () => {
      if (isDone(id)) delete state.done[id]; else state.done[id] = new Date().toISOString().slice(0, 10);
      save(state); paint();
    });
    paint();

    document.querySelectorAll(".checklist input").forEach((cb) => {
      const k = `${id}:${cb.id}`;
      cb.checked = !!state.checks[k];
      cb.addEventListener("change", () => { if (cb.checked) state.checks[k] = 1; else delete state.checks[k]; save(state); });
    });

    const prev = lessons[idx - 1], next = lessons[idx + 1];
    const pager = document.getElementById("pager");
    pager.innerHTML =
      (prev ? `<a class="prev" href="${prev.id}.html"><span class="label">← Попередній</span><span>${prev.code} ${prev.title}</span></a>` : "") +
      (next ? `<a class="next" href="${next.id}.html"><span class="label">Наступний →</span><span>${next.code} ${next.title}</span></a>` : `<a class="next" href="../program.html"><span class="label">Кінець курсу</span><span>До програми</span></a>`);

    const links = [...document.querySelectorAll(".toc a")];
    if ("IntersectionObserver" in window && links.length) {
      const obs = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      }), { rootMargin: "0px 0px -70% 0px" });
      document.querySelectorAll(".lesson-body section[id]").forEach((s) => obs.observe(s));
    }
  }

  return { lessons, renderSummary, renderProgram, renderPortfolio, initReset, initLesson };
})();
