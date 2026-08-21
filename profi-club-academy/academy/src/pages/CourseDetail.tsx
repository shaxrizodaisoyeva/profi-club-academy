import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Course, CourseRating, LeaderboardRow, Module } from "../lib/types";

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [moduleCount, setModuleCount] = useState(0);
  const [rating, setRating] = useState<CourseRating | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!slug || !employee) return;
    (async () => {
      const { data: courseData } = await supabase.from("courses").select("*").eq("slug", slug).single();
      if (!courseData) return;
      setCourse(courseData as Course);

      const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseData.id);
      setModuleCount((modules ?? []).length);

      const { data: ratingRow } = await supabase.from("course_ratings").select("*").eq("course_id", courseData.id).maybeSingle();
      setRating(ratingRow as CourseRating | null);

      const { data: board } = await supabase
        .from("course_leaderboard")
        .select("*")
        .eq("course_id", courseData.id)
        .order("rank", { ascending: true });
      setLeaderboard((board ?? []) as LeaderboardRow[]);

      const { data: enr } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseData.id)
        .eq("employee_id", employee.id)
        .maybeSingle();
      setEnrolled(!!enr);
    })();
  }, [slug, employee]);

  async function handleEnroll() {
    if (!course || !employee) return;
    setEnrolling(true);
    await supabase.from("enrollments").insert({ course_id: course.id, employee_id: employee.id });
    setEnrolling(false);
    navigate(`/courses/${course.slug}/learn`);
  }

  if (!course) return <div className="max-w-4xl mx-auto px-6 py-16 text-sm text-gray-400">Юкланмоқда...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link to="/courses" className="text-xs text-gray-400 hover:text-navy mb-6 inline-block">← Каталогга қайтиш</Link>

      <div className="font-mono text-xs text-gold-deep uppercase tracking-widest mb-2">{course.category ?? "КУРС"}</div>
      <h1 className="font-display text-3xl font-semibold text-navy-deep mb-3">{course.title}</h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-2xl">{course.full_description ?? course.short_description}</p>

      <div className="flex items-center gap-6 text-xs text-gray-500 mb-8">
        <span>{moduleCount} модул</span>
        <span>{rating ? `★ ${rating.avg_rating} (${rating.rating_count} баҳо)` : "Ҳали баҳо йўқ"}</span>
        <span>{Math.round(course.pass_threshold_pct)}% — ўтиш чегараси</span>
      </div>

      <button
        onClick={() => (enrolled ? navigate(`/courses/${course.slug}/learn`) : handleEnroll())}
        disabled={enrolling}
        className="bg-navy text-white font-semibold text-sm rounded-lg px-6 py-3 mb-10 disabled:opacity-50"
      >
        {enrolled ? "Курсни давом эттириш" : enrolling ? "Ёзилмоқда..." : "Курсга ёзилиш"}
      </button>

      {course.agenda?.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold mb-4">Дастур (agenda)</h2>
          <div className="space-y-2">
            {course.agenda.map((item, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex gap-4">
                <span className="font-mono text-xs text-gold-deep flex-shrink-0 pt-0.5">0{i + 1}</span>
                <div>
                  <div className="font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.summary}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold mb-4">Рейтинг жадвали</h2>
        {leaderboard.length === 0 ? (
          <div className="text-sm text-gray-400">Ҳали ҳеч ким бу курсга ёзилмаган.</div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-semibold">Ўрин</th>
                  <th className="text-left px-5 py-3 font-semibold">Исм Фамилия</th>
                  <th className="text-left px-5 py-3 font-semibold">Модуллар</th>
                  <th className="text-left px-5 py-3 font-semibold">Ўртача балл</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.employee_id} className={`border-t border-gray-50 ${row.employee_id === employee?.id ? "bg-gold/10" : ""}`}>
                    <td className="px-5 py-3 font-mono text-xs">{row.rank}</td>
                    <td className="px-5 py-3 font-medium">{row.full_name}</td>
                    <td className="px-5 py-3 text-gray-500">{row.modules_completed}/{row.modules_total}</td>
                    <td className="px-5 py-3 text-navy font-semibold">{row.avg_score_pct ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
