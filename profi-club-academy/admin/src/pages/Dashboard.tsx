import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface CompletionRow {
  course_id: string;
  title: string;
  enrolled_count: number;
  completed_count: number;
  completion_rate_pct: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ courses: 0, employees: 0, certs: 0 });
  const [rows, setRows] = useState<CompletionRow[]>([]);

  useEffect(() => {
    (async () => {
      const { count: courseCount } = await supabase.from("courses").select("id", { count: "exact", head: true });
      const { count: empCount } = await supabase.from("employees").select("id", { count: "exact", head: true });
      const { count: certCount } = await supabase.from("certificates").select("id", { count: "exact", head: true });
      setStats({ courses: courseCount ?? 0, employees: empCount ?? 0, certs: certCount ?? 0 });

      const { data } = await supabase.from("course_completion_stats").select("*");
      setRows((data ?? []) as CompletionRow[]);
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Умумий кўриниш</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Admin дашборд</h1>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Курслар" value={stats.courses} />
        <Stat label="Ходимлар" value={stats.employees} />
        <Stat label="Берилган сертификатлар" value={stats.certs} />
      </div>

      <h2 className="font-display text-lg font-semibold mb-4">Курслар бўйича тугатиш даражаси</h2>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-semibold">Курс</th>
              <th className="text-left px-5 py-3 font-semibold">Ёзилганлар</th>
              <th className="text-left px-5 py-3 font-semibold">Якунлаганлар</th>
              <th className="text-left px-5 py-3 font-semibold">Тугатиш %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.course_id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium">{r.title}</td>
                <td className="px-5 py-3 text-gray-500">{r.enrolled_count}</td>
                <td className="px-5 py-3 text-gray-500">{r.completed_count}</td>
                <td className="px-5 py-3 text-navy font-semibold">{r.completion_rate_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <div className="font-display text-2xl font-semibold text-navy">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
