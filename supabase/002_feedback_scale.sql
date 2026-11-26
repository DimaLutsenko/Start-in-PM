-- Фінальний відгук використовує шкалу 0–10 («чи порекомендуєш курс»).
alter table public.feedback drop constraint if exists feedback_rating_check;
alter table public.feedback add constraint feedback_rating_check check (rating between 0 and 10);
