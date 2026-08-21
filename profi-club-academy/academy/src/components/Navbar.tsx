import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../lib/auth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-sky-100/70 hover:text-white hover:bg-white/5"}`;

export default function Navbar() {
  const { employee } = useAuth();

  return (
    <div className="bg-navy-deep text-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
              <span className="font-display font-semibold text-navy-deep text-sm">PC</span>
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold text-sm">Profi Club</div>
              <div className="text-[10px] text-sky-100/60">Академияси</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Дашборд</NavLink>
            <NavLink to="/courses" className={linkClass}>Курслар</NavLink>
            <NavLink to="/leaderboard" className={linkClass}>Рейтинг</NavLink>
            <NavLink to="/certificates" className={linkClass}>Сертификатлар</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-sky-100/70">{employee?.full_name}</span>
          <button onClick={() => logout()} className="text-xs text-sky-100/70 hover:text-white">Чиқиш</button>
        </div>
      </div>
    </div>
  );
}
