import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Course, Module, AgendaItem } from "../lib/types";

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [saved, setSaved] = useState(false);

  async function load() {
    if (!id) return;
    const { data: c } = await supabase.from("courses").select("*").eq("id", id).single();
    setCourse(c as Course);
    const { data: m } = await supabase.from("modules").select("*").eq("course_id", id).order("order_index");
    setModules((m ?? []) as Module[]);
  }
  useEffect(() => { load(); }, [id]);

  async function save() {
    if (!course) return;
    await supabase
      .from("courses")
      .update({
        title: course.title,
        short_description: course.short_description,
        full_description: course.full_description,
        category: course.category,
        cover_image_url: course.cover_image_url,
        pass_threshold_pct: course.pass_threshold_pct,
        agenda: course.agenda,
      })
      .eq("id", course.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateField<K extends keyof Course>(key: K, value: Course[K]) {
    if (!course) return;
    setCourse({ ...course, [key]: value });
  }

  function addAgendaItem() {
    if (!course) return;
    updateField("agenda", [...(course.agenda || []), { title: "", summary: "" }] as AgendaItem[]);
  }
  function updateAgendaItem(i: number, field: keyof AgendaItem, value: string) {
    if (!course) return;
    const next = [...course.agenda];
    next[i] = { ...next[i], [field]: value };
    updateField("agenda", next);
  }
  function removeAgendaItem(i: number) {
    if (!course) return;
    updateField("agenda", course.agenda.filter((_, idx) => idx !== i));
  }

  async function addModule() {
    if (!course) return;
    const { data, error } = await supabase
      .from("modules")
      .insert({ course_id: course.id, order_index: modules.length, type: "article", title: "Янги модул" })
      .select()
      .single();
    if (!error && data) navigate(`/courses/${course.id}/modules/${data.id}`);
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Модулни ва унинг тестини ўчиришни тасдиқлайсизми?")) return;
    await supabase.from("modules").delete().eq("id", moduleId);
    load();
  }

  if (!course) return <div className="max-w-4xl mx-auto px-8 py-16 text-sm text-gray-400">Юкланмоқда...</div>;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <Link to="/courses" className="text-xs text-gray-400 hover:text-navy mb-6 inline-block">← Курслар рўйхати</Link>

      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Курсни таҳрирлаш</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">{course.title || "Номсиз курс"}</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 space-y-4">
        <Field label="Курс номи">
          <input className="input" value={course.title} onChange={(e) => updateField("title", e.target.value)} />
        </Field>
        <Field label="Категория">
          <input className="input" value={course.category ?? ""} onChange={(e) => updateField("category", e.target.value)} placeholder="Масалан: Савдо кўникмалари" />
        </Field>
        <Field label="Қисқа тавсиф (каталогда кўринади)">
          <textarea className="input min-h-[70px]" value={course.short_description ?? ""} onChange={(e) => updateField("short_description", e.target.value)} />
        </Field>
        <Field label="Тўлиқ тавсиф (курс саҳифасида кўринади)">
          <textarea className="input min-h-[110px]" value={course.full_description ?? ""} onChange={(e) => updateField("full_description", e.target.value)} />
        </Field>
        <Field label="Муқова расми URL (ихтиёрий)">
          <input className="input" value={course.cover_image_url ?? ""} onChange={(e) => updateField("cover_image_url", e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Тестдан ўтиш чегараси (%)">
          <input type="number" min={1} max={100} className="input w-28" value={course.pass_threshold_pct} onChange={(e) => updateField("pass_threshold_pct", Number(e.target.value))} />
        </Field>

        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2">Дастур (agenda)</div>
          <div className="space-y-2 mb-2">
            {(course.agenda || []).map((item, i) => (
              <div key={i} className="bg-paper rounded-lg p-3 flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input className="input-sm" placeholder="Сарлавҳа" value={item.title} onChange={(e) => updateAgendaItem(i, "title", e.target.value)} />
                  <input className="input-sm" placeholder="Қисқа изоҳ" value={item.summary} onChange={(e) => updateAgendaItem(i, "summary", e.target.value)} />
                </div>
                <button onClick={() => removeAgendaItem(i)} className="text-clay text-xs px-2">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addAgendaItem} className="text-xs font-semibold text-navy">+ Банд қўшиш</button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5">Сақлаш</button>
          {saved && <span className="text-xs text-sage">Сақланди ✓</span>}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Модуллар ({modules.length})</h2>
        <button onClick={addModule} className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2">+ Модул қўшиш</button>
      </div>

      <div className="space-y-2">
        {modules.map((m, i) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3">
            <span className="font-mono text-[10px] text-gold-deep bg-paper rounded-full px-2 py-1">{m.type === "video" ? "ВИДЕО" : "МАҚОЛА"}</span>
            <span className="flex-1 text-sm font-medium">{i + 1}. {m.title}</span>
            <Link to={`/courses/${course.id}/modules/${m.id}`} className="text-xs font-semibold text-navy border border-gray-200 rounded-lg px-3 py-1.5">Таҳрирлаш</Link>
            <button onClick={() => deleteModule(m.id)} className="text-xs font-semibold text-clay border border-red-100 rounded-lg px-3 py-1.5">Ўчириш</button>
          </div>
        ))}
        {modules.length === 0 && <div className="text-sm text-gray-400">Ҳали модул йўқ.</div>}
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
