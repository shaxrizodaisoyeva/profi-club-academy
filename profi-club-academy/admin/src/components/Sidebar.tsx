import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? "bg-white/12 text-white" : "text-sky-100/60 hover:text-white hover:bg-white/5"}`;

export default function Sidebar() {
  const { employee } = useAuth();
  return (
    <div className="w-60 bg-navy-deep text-white flex flex-col p-5 min-h-screen flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <span className="font-display font-semibold text-navy-deep text-sm">PC</span>
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold text-sm">Profi Club</div>
          <div className="text-[10px] text-sky-100/50">Admin панели</div>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        <NavLink to="/" end className={linkClass}>Умумий кўриниш</NavLink>
        <NavLink to="/courses" className={linkClass}>Курслар</NavLink>
        <NavLink to="/users" className={linkClass}>Ходимлар рўйхати</NavLink>
        <NavLink to="/feedback" className={linkClass}>Фикр-мулоҳазалар</NavLink>
      </nav>

      <div className="pt-4 border-t border-white/10">
        <div className="font-mono text-[10px] text-gold mb-2">{employee?.full_name}</div>
        <button onClick={() => logout()} className="text-xs text-sky-100/60 hover:text-white">Чиқиш</button>
      </div>
    </div>
  );
}
