import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Certificate, Course } from "../lib/types";

interface CertWithCourse extends Certificate {
  courses: Course;
}

export default function Certificates() {
  const { employee } = useAuth();
  const [certs, setCerts] = useState<CertWithCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    (async () => {
      const { data } = await supabase.from("certificates").select("*, courses(*)").eq("employee_id", employee.id).order("issued_at", { ascending: false });
      setCerts((data ?? []) as unknown as CertWithCourse[]);
      setLoading(false);
    })();
  }, [employee]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Сертификатлар</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Менинг сертификатларим</h1>

      {loading ? (
        <div className="text-sm text-gray-400">Юкланмоқда...</div>
      ) : certs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          Ҳали сертификат йўқ. Курсни якунлаб, биринчи сертификатингизни олинг.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {certs.map((cert) => (
            <div key={cert.id} className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-navy-deep text-gold flex items-center justify-center mx-auto mb-3 font-display font-semibold text-xs">PC</div>
              <div className="font-display font-semibold text-sm mb-1">{cert.courses.title}</div>
              <div className="text-[11px] text-gray-400 font-mono mb-4">{cert.cert_number}</div>
              <a href={`/courses/${cert.courses.slug}/learn`} className="text-xs font-semibold text-navy">Кўриш / юклаш →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
