import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithNameAndDob } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refresh, notAdmin } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await loginWithNameAndDob(fullName, dob);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refresh();
    navigate("/");
  }

  function formatDob(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    let out = digits;
    if (digits.length > 2) out = digits.slice(0, 2) + "." + digits.slice(2);
    if (digits.length > 4) out = out.slice(0, 5) + "." + digits.slice(4);
    return out;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-navy-deep text-gold flex items-center justify-center mx-auto mb-4 font-display font-semibold text-lg">PC</div>
        <h1 className="font-display text-xl font-semibold text-navy-deep mb-1">Admin панели</h1>
        <p className="text-xs text-gray-500 mb-7 font-mono uppercase tracking-wide">Faqat administratorlar uchun</p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Исм Фамилия</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Туғилган сана (КК.ОО.ЙЙ)</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sky"
              value={dob}
              onChange={(e) => setDob(formatDob(e.target.value))}
              required
            />
          </div>

          {notAdmin && <div className="text-clay text-xs bg-red-50 rounded-lg px-3 py-2">Ушбу ҳисоб администратор эмас. Оддий фойдаланувчилар Academiya саҳифасидан кирсин.</div>}
          {error && <div className="text-clay text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <button type="submit" disabled={submitting} className="w-full bg-navy text-white font-semibold text-sm rounded-lg py-3 mt-2 disabled:opacity-50">
            {submitting ? "Кирилмоқда..." : "Кириш"}
          </button>
        </form>
      </div>
    </div>
  );
}
