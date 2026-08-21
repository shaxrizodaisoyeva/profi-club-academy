import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Course } from "../lib/types";

export default function CoursesManage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses((data ?? []) as Course[]);
  }
  useEffect(() => { load(); }, []);

  function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9а-яёў\s-]/gi, "").replace(/\s+/g, "-").slice(0, 60) || `course-${Date.now()}`;
  }

  async function createCourse() {
    if (!title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("courses")
      .insert({ title: title.trim(), slug: slugify(title), status: "draft", agenda: [] })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setTitle("");
      navigate(`/courses/${data.id}`);
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm("Курсни ва унинг барча модулларини ўчиришни тасдиқлайсизми? Бу амални қайтариб бўлмайди.")) return;
    await supabase.from("courses").delete().eq("id", id);
    load();
  }

  async function toggleStatus(c: Course) {
    const next = c.status === "published" ? "draft" : "published";
    await supabase.from("courses").update({ status: next }).eq("id", c.id);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Курслар</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Курсларни бошқариш</h1>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-8 flex gap-3">
        <input
          className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm"
          placeholder="Янги курс номи..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={createCourse} disabled={saving} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">
          + Курс яратиш
        </button>
      </div>

      <div className="space-y-3">
        {courses.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link to={`/courses/${c.id}`} className="font-display font-semibold text-sm hover:text-navy">{c.title}</Link>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.status === "published" ? "bg-green-50 text-sage" : "bg-gray-100 text-gray-400"}`}>
                  {c.status === "published" ? "Эълон қилинган" : c.status === "draft" ? "Қоралама" : "Архив"}
                </span>
              </div>
              <div className="text-xs text-gray-400">{c.short_description || "Тавсиф қўшилмаган"}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleStatus(c)} className="text-xs font-semibold text-navy border border-gray-200 rounded-lg px-3 py-1.5">
                {c.status === "published" ? "Қораламага ўтказиш" : "Эълон қилиш"}
              </button>
              <Link to={`/courses/${c.id}`} className="text-xs font-semibold text-navy border border-gray-200 rounded-lg px-3 py-1.5">Таҳрирлаш</Link>
              <button onClick={() => deleteCourse(c.id)} className="text-xs font-semibold text-clay border border-red-100 rounded-lg px-3 py-1.5">Ўчириш</button>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="text-sm text-gray-400">Ҳали курс йўқ. Юқорида биринчисини яратинг.</div>}
      </div>
    </div>
  );
}
