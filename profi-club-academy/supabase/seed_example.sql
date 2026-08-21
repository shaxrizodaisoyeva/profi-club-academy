-- =====================================================================
-- OPTIONAL example content — just enough to click through and confirm
-- the schema + admin app work end-to-end before your real courses are
-- ready. Safe to skip entirely, or delete this course from the admin
-- app once you've verified everything. Written as a DO block so it
-- runs correctly in the Supabase SQL Editor (not just psql).
-- =====================================================================

do $$
declare
  v_course_id uuid;
  v_module_id uuid;
  v_question_id uuid;
begin
  insert into courses (slug, title, short_description, full_description, agenda, category, status, pass_threshold_pct)
  values (
    'sinov-kursi',
    'Синов курси',
    'Платформани текшириш учун намунавий қисқа курс.',
    'Бу курс фақат платформа тўғри ишлашини текшириш учун яратилган — асосий модул, тест ва сертификат оқимини синаб кўринг.',
    '[{"title":"Кириш","summary":"Платформа билан танишиш"}]'::jsonb,
    'Синов',
    'published',
    80
  )
  returning id into v_course_id;

  insert into modules (course_id, order_index, type, title, body)
  values (
    v_course_id,
    0,
    'article',
    'Биринчи модул',
    '<p>Бу — синов мақоласи. Ўқиб бўлгач, пастдаги тугма орқали тестга ўтинг.</p>'
  )
  returning id into v_module_id;

  insert into quiz_questions (module_id, order_index, question_text)
  values (v_module_id, 0, 'Бу синов саволи. Тўғри жавобни танланг:')
  returning id into v_question_id;

  insert into quiz_options (question_id, order_index, option_text, is_correct)
  values
    (v_question_id, 0, 'Тўғри жавоб', true),
    (v_question_id, 1, 'Нотўғри жавоб', false);
end $$;
