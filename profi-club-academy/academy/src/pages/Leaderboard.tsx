import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Course, LeaderboardRow } from "../lib/types";

export default function Leaderboard() {
  const { employee } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("*").eq("status", "published").order("created_at");
      setCourses((data ?? []) as Course[]);
      if (data && data.length) setSelected(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await supabase.from("course_leaderboard").select("*").eq("course_id", selected).order("rank", { ascending: true });
      setRows((data ?? []) as LeaderboardRow[]);
    })();
  }, [selected]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Рейтинг</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-6">Курслар бўйича натижалар</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`text-xs font-semibold px-4 py-2 rounded-full transition ${selected === c.id ? "bg-navy text-white" : "bg-white border border-gray-200 text-gray-500"}`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-400">Бу курс бўйича ҳали натижалар йўқ.</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Ўрин</th>
                <th className="text-left px-5 py-3 font-semibold">Исм Фамилия</th>
                <th className="text-left px-5 py-3 font-semibold">Лавозим</th>
                <th className="text-left px-5 py-3 font-semibold">Модуллар</th>
                <th className="text-left px-5 py-3 font-semibold">Ўртача балл</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employee_id} className={`border-t border-gray-50 ${row.employee_id === employee?.id ? "bg-gold/10" : ""}`}>
                  <td className="px-5 py-3 font-mono text-xs">{row.rank}</td>
                  <td className="px-5 py-3 font-medium">{row.full_name}{row.employee_id === employee?.id ? " (сиз)" : ""}</td>
                  <td className="px-5 py-3 text-gray-500">{row.employee_role === "manager" ? "Менежер" : "Сотув вакили"}</td>
                  <td className="px-5 py-3 text-gray-500">{row.modules_completed}/{row.modules_total}</td>
                  <td className="px-5 py-3 text-navy font-semibold">{row.avg_score_pct ?? "—"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
