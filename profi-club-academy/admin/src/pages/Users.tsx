import { useEffect, useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";
import { Employee, EmployeeRole } from "../lib/types";

interface CsvRow {
  full_name: string;
  date_of_birth: string;
  employee_role: string;
  department?: string;
}
interface ImportResult { row: number; full_name: string; ok: boolean; error?: string }

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string)?.replace(".supabase.co", ".functions.supabase.co");

async function callFunction(name: string, body: unknown) {
  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function Users() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importing, setImporting] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newRole, setNewRole] = useState<EmployeeRole>("manager");
  const [newDept, setNewDept] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("employees").select("id, full_name, employee_role, department, is_admin").order("full_name");
    setEmployees((data ?? []) as Employee[]);
  }
  useEffect(() => { load(); }, []);

  function handleCsvFile(file: File) {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvRows(results.data.filter((r) => r.full_name));
        setImportResults(null);
      },
    });
  }

  async function runImport() {
    if (csvRows.length === 0) return;
    setImporting(true);
    const res = await callFunction("bulk-import-employees", { employees: csvRows });
    setImporting(false);
    setImportResults(res.results ?? [{ row: 0, full_name: "—", ok: false, error: res.error ?? "Номаълум хатолик" }]);
    load();
  }

  async function addEmployee() {
    setAddError(null);
    if (!newName.trim() || !/^\d{2}\.\d{2}\.\d{2}$/.test(newDob)) {
      setAddError("Исм-фамилия ва туғилган сана (КК.ОО.ЙЙ) тўғри киритилганини текширинг");
      return;
    }
    setAdding(true);
    const res = await callFunction("create-employee", {
      full_name: newName.trim(),
      date_of_birth: newDob,
      employee_role: newRole,
      department: newDept.trim() || null,
    });
    setAdding(false);
    if (res.error) {
      setAddError(res.error);
      return;
    }
    setNewName(""); setNewDob(""); setNewDept("");
    load();
  }

  async function deleteEmployee(id: string, name: string) {
    if (!confirm(`«${name}» ходимини ўчиришни тасдиқлайсизми? У платформага кира олмай қолади.`)) return;
    await callFunction("delete-employee", { employee_id: id });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="font-mono text-xs text-sage uppercase tracking-widest mb-1">Ходимлар рўйхати</div>
      <h1 className="font-display text-2xl font-semibold text-navy-deep mb-8">Реестрни бошқариш</h1>

      {/* Bulk CSV import */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
        <h2 className="font-display text-base font-semibold mb-1">Реестрни юклаш (CSV)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Устунлар: <code className="font-mono bg-paper px-1.5 py-0.5 rounded">full_name, date_of_birth, employee_role, department</code>.
          date_of_birth формати — КК.ОО.ЙЙ (масалан 15.04.92). employee_role — <code className="font-mono">manager</code> ёки <code className="font-mono">sales</code>.
        </p>
        <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])} className="text-sm mb-4" />

        {csvRows.length > 0 && (
          <>
            <div className="text-xs text-gray-500 mb-2">{csvRows.length} қатор топилди — олдиндан кўриш:</div>
            <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-lg mb-4">
              <table className="w-full text-xs">
                <thead><tr className="bg-paper text-gray-400"><th className="text-left px-3 py-2">Исм Фамилия</th><th className="text-left px-3 py-2">Туғилган сана</th><th className="text-left px-3 py-2">Рол</th><th className="text-left px-3 py-2">Бўлим</th></tr></thead>
                <tbody>
                  {csvRows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-1.5">{r.full_name}</td>
                      <td className="px-3 py-1.5">{r.date_of_birth}</td>
                      <td className="px-3 py-1.5">{r.employee_role}</td>
                      <td className="px-3 py-1.5">{r.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={runImport} disabled={importing} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">
              {importing ? "Юкланмоқда..." : `${csvRows.length} ходимни импорт қилиш`}
            </button>
          </>
        )}

        {importResults && (
          <div className="mt-4 space-y-1">
            {importResults.map((r, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded ${r.ok ? "bg-green-50 text-sage" : "bg-red-50 text-clay"}`}>
                {r.row}. {r.full_name} — {r.ok ? "муваффақиятли қўшилди" : r.error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add single employee */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8">
        <h2 className="font-display text-base font-semibold mb-4">Битта ходим қўшиш</h2>
        <div className="grid sm:grid-cols-4 gap-3 mb-3">
          <input className="input" placeholder="Исм Фамилия" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="input" placeholder="КК.ОО.ЙЙ" value={newDob} onChange={(e) => setNewDob(e.target.value)} />
          <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as EmployeeRole)}>
            <option value="manager">Менежер</option>
            <option value="sales">Сотув вакили</option>
          </select>
          <input className="input" placeholder="Бўлим (ихтиёрий)" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
        </div>
        {addError && <div className="text-xs text-clay mb-3">{addError}</div>}
        <button onClick={addEmployee} disabled={adding} className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5 disabled:opacity-50">
          {adding ? "Қўшилмоқда..." : "+ Ходим қўшиш"}
        </button>
      </div>

      {/* Employee list */}
      <h2 className="font-display text-lg font-semibold mb-4">Барча ходимлар ({employees.length})</h2>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-semibold">Исм Фамилия</th>
              <th className="text-left px-5 py-3 font-semibold">Лавозим</th>
              <th className="text-left px-5 py-3 font-semibold">Бўлим</th>
              <th className="text-left px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-gray-50">
                <td className="px-5 py-3 font-medium">{e.full_name} {e.is_admin && <span className="ml-1 text-[10px] font-mono text-gold-deep">ADMIN</span>}</td>
                <td className="px-5 py-3 text-gray-500">{e.employee_role === "manager" ? "Менежер" : "Сотув вакили"}</td>
                <td className="px-5 py-3 text-gray-500">{e.department ?? "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => deleteEmployee(e.id, e.full_name)} className="text-xs font-semibold text-clay">Ўчириш</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
