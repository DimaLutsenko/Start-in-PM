/* Інтерактивний тест: вибір відповіді, пояснення, підсумок. Результат зберігається в зошиті. */
const Quiz = (() => {
  function init(opts) {
    const el = opts.el, lid = opts.lesson, qs = opts.questions;
    let answers = [];
    try { answers = JSON.parse(WB.getField(lid, "quiz-raw") || "[]"); } catch (e) {}

    function save() {
      WB.setField(lid, "quiz-raw", JSON.stringify(answers), "quiz", 0, true);
      const done = answers.filter((a) => a != null).length;
      const right = qs.filter((q, i) => answers[i] === q.correct).length;
      WB.setField(lid, "quiz", done === qs.length ? `${right} з ${qs.length} правильних відповідей` : "", "Тест", opts.order || 999);
    }

    function render() {
      const done = answers.filter((a) => a != null).length;
      const right = qs.filter((q, i) => answers[i] === q.correct).length;
      el.innerHTML = qs.map((q, i) => {
        const a = answers[i];
        const answered = a != null;
        return `<fieldset class="qz-q${answered ? " answered" : ""}">
          <legend><span class="label">Питання ${i + 1} з ${qs.length}</span><span class="qz-text">${q.q}</span></legend>
          <div class="qz-opts">${q.options.map((o, j) => {
            const cls = !answered ? "" : j === q.correct ? " correct" : j === a ? " wrong" : " dim";
            return `<button type="button" class="qz-opt${cls}" data-q="${i}" data-o="${j}" ${answered ? "disabled" : ""}>${o}</button>`;
          }).join("")}</div>
          ${answered ? `<div class="qz-explain ${a === q.correct ? "ok" : "no"}"><b>${a === q.correct ? "Правильно." : "Не зовсім."}</b> ${q.explain}</div>` : ""}
        </fieldset>`;
      }).join("") + `<div class="qz-total">${done === qs.length
        ? `<div class="mx-score"><b>${right} з ${qs.length}</b><span>${right === qs.length ? "Чудово, тему засвоєно." : right >= qs.length - 1 ? "Добре. Переглянь пояснення до помилки." : "Варто повернутися до теорії і пройти тест ще раз."}</span></div><button type="button" class="btn ghost" data-reset>Пройти ще раз</button>`
        : `<span class="saved-note">Відповідей: ${done} з ${qs.length}</span>`}</div>`;
    }

    el.addEventListener("click", (e) => {
      const b = e.target.closest(".qz-opt");
      if (b && !b.disabled) {
        answers[+b.dataset.q] = +b.dataset.o;
        save(); render();
        const fs = el.querySelectorAll(".qz-q")[+b.dataset.q];
        const ex = fs && fs.querySelector(".qz-explain");
        if (ex) ex.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (e.target.closest("[data-reset]")) {
        answers = []; save(); render();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    render();
  }
  return { init };
})();
