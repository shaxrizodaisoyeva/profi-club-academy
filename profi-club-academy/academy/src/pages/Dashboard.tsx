import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Course, Enrollment, ModuleProgress } from "../lib/types";

interface EnrolledCourse extends Course {
  moduleCount: number;
  doneCount: number;
}

export default function Dashboard() {
  const { employee } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [certCount, setCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    (async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, courses(*)")
        .eq("employee_id", employee.id);

      const { count: certs } = await supabase
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", employee.id);
      setCertCount(certs ?? 0);

      const result: EnrolledCourse[] = [];
      for (const row of (enrollments ?? []) as unknown as { course_id: string; courses: Course }[]) {
        const course = row.courses;
        const { data: modules } = await supabase.from("modules").select("id").eq("course_id", course.id);
        const moduleIds = (modules ?? []).map((m) => m.id);
        let doneCount = 0;
        if (moduleIds.length) {
          const { data: progress } = await supabase
            .from("module_progress")
            .select("module_id, completed")
            .eq("employee_id", employee.id)
            .in("module_id", moduleIds);
          doneCount = ((progress ?? []) as ModuleProgress[]).filter((p) => p.completed).length;
        }
        result.push({ ...course, moduleCount: moduleIds.length, doneCount });
      }
      setCourses(result);
      setLoading(false);
    })();
  }, [employee]);

  const totalDone = courses.reduce((s, c) => s + c.doneCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Дашборд</div>
        <h1 className="font-display text-2xl font-semibold text-navy-deep">Хуш келибсиз, {employee?.full_name?.split(" ")[0]}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Ёзилган курслар" value={courses.length} />
        <StatCard label="Тугалланган модуллар" value={totalDone} />
        <StatCard label="Сертификатлар" value={certCount} />
        <StatCard label="Лавозим" value={employee?.employee_role === "manager" ? "Менежер" : "Сотув вакили"} />
      </div>

      <h2 className="font-display text-lg font-semibold mb-4">Мен ёзилган курслар</h2>
      {loading ? (
        <div className="text-sm text-gray-400">Юкланмоқда...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          Ҳали ҳеч бир курсга ёзилмагансиз. <Link to="/courses" className="text-navy font-semibold">Каталогни кўринг →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => {
            const pct = c.moduleCount ? Math.round((c.doneCount / c.moduleCount) * 100) : 0;
            return (
              <Link key={c.id} to={`/courses/${c.slug}`} className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-display font-semibold text-sm mb-2">{c.title}</div>
                    <div className="h-1.5 bg-paper rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold-deep to-gold rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="font-mono text-xs text-navy">{pct}%</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
      <div className="font-display text-2xl font-semibold text-navy">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
