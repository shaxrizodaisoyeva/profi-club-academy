import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Module, QuizQuestion } from "../lib/types";

interface EditableQuestion {
  id?: string;
  question_text: string;
  options: { id?: string; option_text: string; is_correct: boolean }[];
}

export default function ModuleEditor() {
  const { courseId, moduleId } = useParams();
  const [module, setModule] = useState<Module | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [saved, setSaved] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  async function load() {
    if (!moduleId) return;
    const { data: m } = await supabase.from("modules").select("*").eq("id", moduleId).single();
    setModule(m as Module);

    const { data: qRows } = await supabase.from("quiz_questions").select("*, quiz_options(*)").eq("module_id", moduleId).order("order_index");
    const editable: EditableQuestion[] = ((qRows ?? []) as QuizQuestion[]).map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.quiz_options
        .sort((a, b) => a.order_index - b.order_index)
        .map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
    }));
    setQuestions(editable.length ? editable : [emptyQuestion()]);
  }
  useEffect(() => { load(); }, [moduleId]);

  function emptyQuestion(): EditableQuestion {
    return { question_text: "", options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }] };
  }

  function updateModuleField<K extends keyof Module>(key: K, value: Module[K]) {
    if (!module) return;
    setModule({ ...module, [key]: value });
  }

  async function saveModule() {
    if (!module) return;
    await supabase
      .from("modules")
      .update({
        title: module.title,
        type: module.type,
        video_url: module.video_url,
        body: module.body,
        doc_name: module.doc_name,
        doc_url: module.doc_url,
      })
      .eq("id", module.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateQuestionText(qi: number, text: string) {
    const next = [...questions];
    next[qi] = { ...next[qi], question_text: text };
    setQuestions(next);
  }
  function updateOptionText(qi: number, oi: number, text: string) {
    const next = [...questions];
    next[qi].options[oi] = { ...next[qi].options[oi], option_text: text };
    setQuestions(next);
  }
  function setCorrect(qi: number, oi: number) {
    const next = [...questions];
    next[qi].options = next[qi].options.map((o, idx) => ({ ...o, is_correct: idx === oi }));
    setQuestions(next);
  }
  function addQuestion() {
    setQuestions([...questions, emptyQuestion()]);
  }
  function removeQuestion(qi: number) {
    setQuestions(questions.filter((_, i) => i !== qi));
  }

  async function saveQuiz() {
    if (!module) return;
    setSavingQuiz(true);
    // Simplest reliable approach for an MVP admin tool: wipe and re-insert
    // this module's questions/options on every save. Fine at this scale;
    // swap for diff-based upserts later if quizzes get large.
    await supabase.from("quiz_questions").delete().eq("module_id", module.id);

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      if (!q.question_text.trim()) continue;
      const { data: qRow, error } = await supabase
        .from("quiz_questions")
        .insert({ module_id: module.id, order_index: qi, question_text: q.question_text.trim() })
        .select()
        .single();
      if (error || !qRow) continue;

      const optionRows = q.options
        .filter((o) => o.option_text.trim())
        .map((o, oi) => ({ question_id: qRow.id, order_index: oi, option_text: o.option_text.trim(), is_correct: o.is_correct }));
      if (optionRows.length) await supabase.from("quiz_options").insert(optionRows);
    }
    setSavingQuiz(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  if (!module) return <div className="max-w-3xl mx-auto px-8 py-16 text-sm text-gray-400">Юкланмоқда...</div>;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link to={`/courses/${courseId}`} className="text-xs text-gray-400 hover:text-navy mb-6 inline-block">← Курсга қайтиш</Link>

      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Модулни таҳрирлаш</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">{module.title || "Номсиз модул"}</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 space-y-4">
        <Field label="Модул номи">
          <input className="input" value={module.title} onChange={(e) => updateModuleField("title", e.target.value)} />
        </Field>
        <Field label="Тури">
          <select className="input" value={module.type} onChange={(e) => updateModuleField("type", e.target.value as Module["type"])}>
            <option value="video">Видео</option>
            <option value="article">Мақола</option>
          </select>
        </Field>
        {module.type === "video" && (
          <Field label="Видео URL (YouTube embed / MP4)">
            <input className="input" value={module.video_url ?? ""} onChange={(e) => updateModuleField("video_url", e.target.value)} placeholder="https://www.youtube.com/embed/..." />
          </Field>
        )}
        <Field label="Мазмун матни (HTML рухсат этилади: <p>, <strong>, <ul><li>)">
          <textarea className="input min-h-[160px] font-mono text-xs" value={module.body ?? ""} onChange={(e) => updateModuleField("body", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ҳужжат номи (ихтиёрий)">
            <input className="input" value={module.doc_name ?? ""} onChange={(e) => updateModuleField("doc_name", e.target.value)} placeholder="Чек-лист.pdf" />
          </Field>
          <Field label="Ҳужжат URL">
            <input className="input" value={module.doc_url ?? ""} onChange={(e) => updateModuleField("doc_url", e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        <button onClick={saveModule} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5">Модулни сақлаш</button>
      </div>

      <h2 className="font-display text-lg font-semibold mb-4">Тест саволлари</h2>
      <div className="space-y-4 mb-4">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white border border-gray-100 rounded-xl p-5 relative">
            <button onClick={() => removeQuestion(qi)} className="absolute top-4 right-4 text-clay text-xs">✕ ўчириш</button>
            <div className="font-mono text-[11px] text-gold-deep mb-2">САВОЛ {qi + 1}</div>
            <input className="input mb-3" placeholder="Савол матни" value={q.question_text} onChange={(e) => updateQuestionText(qi, e.target.value)} />
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2 mb-1.5">
                <input type="radio" name={`correct-${qi}`} checked={opt.is_correct} onChange={() => setCorrect(qi, oi)} />
                <input className="input-sm" placeholder={`Вариант ${oi + 1}`} value={opt.option_text} onChange={(e) => updateOptionText(qi, oi, e.target.value)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={addQuestion} className="text-xs font-semibold text-navy border border-gray-200 rounded-lg px-4 py-2">+ Савол қўшиш</button>
        <button onClick={saveQuiz} disabled={savingQuiz} className="bg-gold text-navy-deep text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">
          {savingQuiz ? "Сақланмоқда..." : "Тестни сақлаш"}
        </button>
        {saved && <span className="text-xs text-sage">Сақланди ✓</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
