import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  employees: { full_name: string };
  courses: { title: string };
}

export default function Feedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("course_feedback")
        .select("id, rating, comment, created_at, employees(full_name), courses(title)")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as unknown as FeedbackRow[]);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Фикр-мулоҳазалар</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Ходимлардан фикрлар</h1>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-400">Ҳали фикр-мулоҳаза йўқ.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{r.employees?.full_name}</div>
                <div className="text-gold text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              </div>
              <div className="text-xs text-gray-400 mb-2 font-mono">{r.courses?.title}</div>
              {r.comment && <div className="text-sm text-gray-600">{r.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
