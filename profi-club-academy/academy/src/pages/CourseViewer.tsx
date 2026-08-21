import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Course, Module, ModuleProgress, QuizQuestion } from "../lib/types";
import StarRating from "../components/StarRating";

export default function CourseViewer() {
  const { slug } = useParams();
  const { employee } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({});
  const [current, setCurrent] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ passed: boolean; scorePct: number } | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const [courseComplete, setCourseComplete] = useState(false);
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  async function loadAll() {
    if (!slug || !employee) return;
    const { data: courseData } = await supabase.from("courses").select("*").eq("slug", slug).single();
    if (!courseData) return;
    setCourse(courseData as Course);

    const { data: moduleRows } = await supabase.from("modules").select("*").eq("course_id", courseData.id).order("order_index");
    setModules((moduleRows ?? []) as Module[]);

    const moduleIds = (moduleRows ?? []).map((m) => m.id);
    if (moduleIds.length) {
      const { data: progressRows } = await supabase
        .from("module_progress")
        .select("*")
        .eq("employee_id", employee.id)
        .in("module_id", moduleIds);
      const map: Record<string, ModuleProgress> = {};
      (progressRows ?? []).forEach((p) => (map[(p as ModuleProgress).module_id] = p as ModuleProgress));
      setProgress(map);

      const allDone = moduleIds.every((id) => map[id]?.completed);
      setCourseComplete(allDone);
      if (allDone) {
        const { data: cert } = await supabase
          .from("certificates")
          .select("cert_number")
          .eq("employee_id", employee.id)
          .eq("course_id", courseData.id)
          .maybeSingle();
        setCertNumber(cert?.cert_number ?? null);

        const { data: fb } = await supabase
          .from("course_feedback")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("course_id", courseData.id)
          .maybeSingle();
        setFeedbackSubmitted(!!fb);
      }
    }
  }

  useEffect(() => {
    loadAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, employee]);

  const activeModule = modules[current];

  function isUnlocked(idx: number) {
    if (idx === 0) return true;
    return !!progress[modules[idx - 1]?.id]?.completed;
  }

  async function openModule(idx: number) {
    setCurrent(idx);
    setShowQuiz(false);
    setAnswers({});
    setQuizResult(null);
    setVideoPlaying(false);
  }

  async function revealQuiz() {
    if (!activeModule) return;
    const { data } = await supabase
      .from("quiz_questions")
      .select("*, quiz_options(*)")
      .eq("module_id", activeModule.id)
      .order("order_index");
    setQuestions((data ?? []) as QuizQuestion[]);
    setShowQuiz(true);
    setAnswers({});
    setQuizResult(null);
  }

  async function submitQuiz() {
    if (!activeModule || !employee || !course) return;
    if (Object.keys(answers).length < questions.length) return;

    let correct = 0;
    questions.forEach((q) => {
      const selectedOptionId = answers[q.id];
      const opt = q.quiz_options.find((o) => o.id === selectedOptionId);
      if (opt?.is_correct) correct++;
    });
    const scorePct = Math.round((correct / questions.length) * 100);
    const passed = scorePct >= course.pass_threshold_pct;

    await supabase.from("quiz_attempts").insert({ employee_id: employee.id, module_id: activeModule.id, score_pct: scorePct, passed });

    const existing = progress[activeModule.id];
    await supabase.from("module_progress").upsert(
      {
        employee_id: employee.id,
        module_id: activeModule.id,
        completed: passed || existing?.completed || false,
        best_score_pct: Math.max(scorePct, existing?.best_score_pct ?? 0),
        attempts: (existing?.attempts ?? 0) + 1,
        completed_at: passed ? new Date().toISOString() : existing?.completed_at ?? null,
      },
      { onConflict: "employee_id,module_id" }
    );

    setQuizResult({ passed, scorePct });
    if (passed) await loadAll();
  }

  async function submitFeedback() {
    if (!employee || !course || feedbackRating === 0) return;
    await supabase.from("course_feedback").insert({
      employee_id: employee.id,
      course_id: course.id,
      rating: feedbackRating,
      comment: feedbackComment.trim() || null,
    });
    setFeedbackSubmitted(true);
  }

  async function downloadCertificate() {
    if (!employee || !course) return;
    let number = certNumber;
    if (!number) {
      number = "PPS-" + Math.floor(100000 + Math.random() * 899999);
      await supabase.from("certificates").insert({ employee_id: employee.id, course_id: course.id, cert_number: number });
      setCertNumber(number);
    }
    const el = document.getElementById("cert-render");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 3, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 3, canvas.height / 3] });
    pdf.addImage(img, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
    pdf.save(`Profi-Club-sertifikat-${course.slug}.pdf`);
  }

  if (!course || !activeModule) return <div className="max-w-6xl mx-auto px-6 py-16 text-sm text-gray-400">Юкланмоқда...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link to={`/courses/${course.slug}`} className="text-xs text-gray-400 hover:text-navy mb-5 inline-block">← Курс ҳақида</Link>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <div className="bg-navy-deep rounded-2xl p-5 text-white h-fit">
          <h4 className="font-display font-semibold text-sm mb-4">{course.title}</h4>
          <div className="space-y-1">
            {modules.map((m, i) => {
              const done = progress[m.id]?.completed;
              const unlocked = isUnlocked(i);
              return (
                <button
                  key={m.id}
                  disabled={!unlocked}
                  onClick={() => openModule(i)}
                  className={`w-full flex items-center gap-2 text-left text-xs px-2.5 py-2.5 rounded-lg transition ${
                    i === current ? "bg-white/15" : unlocked ? "hover:bg-white/8" : "opacity-40"
                  }`}
                >
                  <span className="font-mono text-[10px] text-sky-100/60 w-4">0{i + 1}</span>
                  <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border ${done ? "bg-sage border-sage" : "border-sky-100/40"}`} />
                  <span className="flex-1">{m.title}</span>
                  {!unlocked && <span className="text-[10px]">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 min-h-[420px]">
          {!showQuiz ? (
            <>
              <div className="font-mono text-xs text-gold-deep mb-2">МОДУЛ 0{current + 1} · {activeModule.type === "video" ? "ВИДЕО" : "МАҚОЛА"}</div>
              <h2 className="font-display text-xl font-semibold mb-4">{activeModule.title}</h2>

              {activeModule.type === "video" && (
                <div
                  onClick={() => setVideoPlaying(true)}
                  className="aspect-video rounded-xl bg-gradient-to-br from-navy-deep to-black flex items-center justify-center cursor-pointer mb-5 relative"
                >
                  {!videoPlaying ? (
                    <div className="w-16 h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                      <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[15px] border-l-white ml-1" />
                    </div>
                  ) : activeModule.video_url ? (
                    <iframe src={activeModule.video_url} className="w-full h-full rounded-xl" allowFullScreen title={activeModule.title} />
                  ) : (
                    <span className="text-white text-xs font-mono">Видео URL қўшилмаган</span>
                  )}
                </div>
              )}

              {activeModule.body && <div className="text-sm text-gray-600 leading-relaxed mb-5" dangerouslySetInnerHTML={{ __html: activeModule.body }} />}

              {activeModule.doc_url && (
                <a href={activeModule.doc_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-paper rounded-xl px-4 py-3 mb-5 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-navy text-white flex items-center justify-center font-mono text-[10px]">PDF</span>
                  {activeModule.doc_name ?? "Ҳужжат"}
                </a>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-5">
                <button onClick={revealQuiz} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5">Тестга ўтиш</button>
              </div>
            </>
          ) : (
            <QuizPanel
              questions={questions}
              answers={answers}
              setAnswers={setAnswers}
              quizResult={quizResult}
              passThreshold={course.pass_threshold_pct}
              onSubmit={submitQuiz}
            />
          )}
        </div>
      </div>

      {courseComplete && (
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-8">
          <h3 className="font-display text-lg font-semibold mb-1">Табриклаймиз! Курс якунланди 🎉</h3>
          <p className="text-sm text-gray-500 mb-5">Сертификатингизни юклаб олишингиз ва курс ҳақида фикр билдиришингиз мумкин.</p>

          <button onClick={downloadCertificate} className="bg-gold text-navy-deep text-sm font-semibold rounded-lg px-5 py-2.5 mb-8">Сертификатни юклаб олиш (PDF)</button>

          <div id="cert-render" className="hidden">
            <div style={{ width: 680, padding: 40, border: "2px solid #0B3A82", borderRadius: 10, textAlign: "center", background: "#fff" }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 12, letterSpacing: 2, color: "#C9A22F", textTransform: "uppercase", marginBottom: 6 }}>Курсни тамомлаш сертификати</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, color: "#082B62", marginBottom: 20 }}>Profi Club Академияси</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, color: "#082B62", marginBottom: 20 }}>{employee?.full_name}</div>
              <div style={{ fontSize: 13, color: "#5B6478", marginBottom: 20 }}>қуйидаги курсни муваффақиятли тамомлади</div>
              <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 15, color: "#082B62", marginBottom: 20 }}>«{course.title}»</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5B6478", fontFamily: "monospace" }}>
                <span>{new Date().toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span>ID: {certNumber}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-display text-sm font-semibold mb-3">Курс ҳақида фикр билдиринг</h4>
            {feedbackSubmitted ? (
              <div className="text-sm text-sage">Раҳмат! Фикрингиз юборилди.</div>
            ) : (
              <div className="space-y-3 max-w-md">
                <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[80px]"
                  placeholder="Таклиф, изоҳ ёки фикрингизни ёзинг..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
                <button onClick={submitFeedback} disabled={feedbackRating === 0} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-40">
                  Юбориш
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizPanel({
  questions, answers, setAnswers, quizResult, passThreshold, onSubmit,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  quizResult: { passed: boolean; scorePct: number } | null;
  passThreshold: number;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="bg-paper rounded-xl px-4 py-3 text-xs text-gray-500 mb-5">📝 {questions.length} саволли тест — {passThreshold}% тўғри жавоб талаб этилади.</div>
      {questions.map((q, qi) => (
        <div key={q.id} className="mb-5">
          <div className="text-sm font-semibold mb-2.5">{qi + 1}. {q.question_text}</div>
          {q.quiz_options.map((opt) => (
            <label key={opt.id} className={`flex items-center gap-2.5 border rounded-lg px-3.5 py-2.5 mb-1.5 text-sm cursor-pointer ${answers[q.id] === opt.id ? "border-navy bg-paper font-semibold" : "border-gray-200"}`}>
              <input type="radio" name={q.id} checked={answers[q.id] === opt.id} onChange={() => setAnswers({ ...answers, [q.id]: opt.id })} />
              {opt.option_text}
            </label>
          ))}
        </div>
      ))}

      {quizResult && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium mb-4 ${quizResult.passed ? "bg-green-50 text-sage" : "bg-red-50 text-clay"}`}>
          Натижа: {quizResult.scorePct}% — {quizResult.passed ? "тест ўтилди! Кейинги модул очилди." : `камида ${passThreshold}% керак, қайта уриниб кўринг.`}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-100 pt-5">
        <button onClick={onSubmit} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5">Жавобларни юбориш</button>
      </div>
    </div>
  );
}
