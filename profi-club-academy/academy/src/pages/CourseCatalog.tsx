import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Course, CourseRating } from "../lib/types";

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ratings, setRatings] = useState<Record<string, CourseRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("*").eq("status", "published").order("created_at");
      setCourses((data ?? []) as Course[]);

      const { data: ratingRows } = await supabase.from("course_ratings").select("*");
      const map: Record<string, CourseRating> = {};
      (ratingRows ?? []).forEach((r) => (map[(r as CourseRating).course_id] = r as CourseRating));
      setRatings(map);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Курслар каталоги</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Барча курслар</h1>

      {loading ? (
        <div className="text-sm text-gray-400">Юкланмоқда...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          Ҳозирча курслар йўқ. Тез орада қўшилади.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => {
            const rating = ratings[c.id];
            return (
              <Link key={c.id} to={`/courses/${c.slug}`} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition">
                <div className="font-mono text-[11px] text-gold-deep mb-2">{c.category ?? "КУРС"}</div>
                <h3 className="font-display font-semibold text-base mb-2 leading-snug">{c.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-3">{c.short_description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  {rating ? <span>★ {rating.avg_rating} ({rating.rating_count})</span> : <span>Ҳали баҳо йўқ</span>}
                  <span className="text-sage font-semibold">Бошлаш →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
