/**
 * PerfilColaborador.tsx
 * Perfil individual de um colaborador com histórico de saldos mensais
 * e detalhe de picagens por dia.
 */

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, User, Clock, TrendingUp, TrendingDown,
  AlertTriangle, Calendar, ChevronDown, ChevronUp,
  Timer, Coffee, LogOut, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

// ─── Utilitários ─────────────────────────────────────────────────────────────

function fmtMin(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtMinAbs(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

function saldoColor(min: number) {
  if (min > 0) return "text-emerald-400";
  if (min < 0) return "text-red-400";
  return "text-zinc-400";
}

function saldoBg(min: number) {
  if (min > 0) return "bg-emerald-500/10 border-emerald-500/20";
  if (min < 0) return "bg-red-500/10 border-red-500/20";
  return "bg-zinc-800 border-zinc-700";
}

// ─── Tooltip personalizado para o gráfico ────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className={`font-mono font-bold text-sm ${saldoColor(val)}`}>{fmtMin(val)}</p>
    </div>
  );
}

// ─── Linha de registo diário ──────────────────────────────────────────────────

function LinhaRegisto({ r }: { r: any }) {
  const isAuto = r.en1Auto || r.sa1Auto || r.en2Auto || r.sa2Auto;
  const isJust = !!r.justificacao;
  const isSab = r.diaSemana === "SAB" || r.diaSemana === "SÁB";

  function cellClass(auto: boolean) {
    return `font-mono text-xs px-2 py-1 rounded ${auto ? "bg-amber-500/15 text-amber-300" : "text-zinc-300"}`;
  }

  return (
    <tr className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isJust ? "opacity-60" : ""}`}>
      <td className="px-3 py-2 text-xs text-zinc-400 whitespace-nowrap">
        {r.data?.slice(0, 5)}
        <span className="ml-1.5 text-zinc-600 uppercase text-[10px]">{r.diaSemana}</span>
      </td>
      <td className="px-2 py-2">
        {isJust ? (
          <span className="text-xs text-sky-400 italic">{r.justificacao}</span>
        ) : (
          <div className="flex gap-1 flex-wrap">
            <span className={cellClass(!!r.en1Auto)}>{r.en1 ?? "—"}</span>
            <span className={cellClass(!!r.sa1Auto)}>{r.sa1 ?? "—"}</span>
            <span className={cellClass(!!r.en2Auto)}>{r.en2 ?? "—"}</span>
            <span className={cellClass(!!r.sa2Auto)}>{r.sa2 ?? "—"}</span>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {r.saldo !== null && !isJust && (
          <span className={`font-mono text-xs font-semibold ${saldoColor(r.saldo)}`}>
            {fmtMin(r.saldo)}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-zinc-500 max-w-[200px] truncate hidden md:table-cell">
        {r.detalhe}
      </td>
    </tr>
  );
}

// ─── Bloco de mês expandível ──────────────────────────────────────────────────

function BlocoMes({ m }: { m: any }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${saldoBg(m.saldoTotal)}`}>
      {/* Cabeçalho do mês */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setAberto(v => !v)}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-semibold text-sm text-zinc-100">{m.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {m.diasTrab} dias trabalhados
              {m.diasJust > 0 && ` · ${m.diasJust} justificados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Mini-stats */}
          <div className="hidden sm:flex gap-4 text-xs text-zinc-500">
            {m.atrasoEn > 0 && (
              <span className="flex items-center gap-1 text-red-400/70">
                <Clock className="w-3 h-3" /> -{fmtMinAbs(m.atrasoEn)}
              </span>
            )}
            {m.excessoAlm > 0 && (
              <span className="flex items-center gap-1 text-orange-400/70">
                <Coffee className="w-3 h-3" /> -{fmtMinAbs(m.excessoAlm)}
              </span>
            )}
            {m.extraSa > 0 && (
              <span className="flex items-center gap-1 text-emerald-400/70">
                <Zap className="w-3 h-3" /> +{fmtMinAbs(m.extraSa)}
              </span>
            )}
          </div>

          {/* Saldo */}
          <span className={`font-mono font-bold text-base min-w-[70px] text-right ${saldoColor(m.saldoTotal)}`}>
            {fmtMin(m.saldoTotal)}
          </span>

          {aberto
            ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          }
        </div>
      </button>

      {/* Tabela de registos diários */}
      {aberto && (
        <div className="border-t border-zinc-700/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="px-3 py-2 text-left text-xs text-zinc-500 font-medium">Data</th>
                <th className="px-2 py-2 text-left text-xs text-zinc-500 font-medium">Picagens</th>
                <th className="px-3 py-2 text-right text-xs text-zinc-500 font-medium">Saldo</th>
                <th className="px-3 py-2 text-left text-xs text-zinc-500 font-medium hidden md:table-cell">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {m.registos.map((r: any, i: number) => (
                <LinhaRegisto key={i} r={r} />
              ))}
            </tbody>
          </table>
          {/* Legenda */}
          <div className="px-4 py-2 flex gap-4 text-[10px] text-zinc-600 border-t border-zinc-800">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-500/40" /> Preenchido automaticamente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-sky-500/40" /> Justificado
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PerfilColaborador() {
  const params = useParams<{ numero: string }>();
  const [, navigate] = useLocation();
  const numero = params.numero ?? "";

  const { data: perfil, isLoading, error } = trpc.ponto.getPerfilColaborador.useQuery(
    { numero },
    { enabled: !!numero }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-500">A carregar perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-zinc-300">Colaborador não encontrado</p>
          <button onClick={() => navigate("/")} className="text-sm text-cyan-400 hover:underline">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const { nome, historico, totais } = perfil;

  // Dados para o gráfico de barras
  const dadosGrafico = historico.map(m => ({
    label: m.label.split(" ")[0].slice(0, 3), // "Jan", "Fev", etc.
    saldo: m.saldoTotal,
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Botão voltar + título */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {/* Cabeçalho do perfil */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700">
        <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-100 truncate">{nome}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Nº {numero} · {historico.length} {historico.length === 1 ? "mês" : "meses"} registados</p>
        </div>
        {/* Saldo acumulado total */}
        <div className={`text-right px-4 py-2 rounded-xl border ${saldoBg(totais.saldoTotal)}`}>
          <p className="text-xs text-zinc-500 mb-0.5">Saldo acumulado</p>
          <p className={`font-mono font-bold text-xl ${saldoColor(totais.saldoTotal)}`}>
            {fmtMin(totais.saldoTotal)}
          </p>
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: <Clock className="w-4 h-4 text-red-400" />,
            label: "Atrasos entrada",
            value: fmtMinAbs(totais.atrasoEn),
            color: "text-red-400",
            show: totais.atrasoEn > 0,
          },
          {
            icon: <Coffee className="w-4 h-4 text-orange-400" />,
            label: "Excesso almoço",
            value: fmtMinAbs(totais.excessoAlm),
            color: "text-orange-400",
            show: totais.excessoAlm > 0,
          },
          {
            icon: <LogOut className="w-4 h-4 text-red-400" />,
            label: "Saída antes da hora",
            value: fmtMinAbs(totais.saidaCedo),
            color: "text-red-400",
            show: totais.saidaCedo > 0,
          },
          {
            icon: <Zap className="w-4 h-4 text-emerald-400" />,
            label: "Horas extra",
            value: fmtMinAbs(totais.extraSa),
            color: "text-emerald-400",
            show: totais.extraSa > 0,
          },
        ].map((c, i) => (
          <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {c.icon}
              <span className="text-xs text-zinc-500">{c.label}</span>
            </div>
            <p className={`font-mono font-bold text-lg ${c.color}`}>
              {c.show ? c.value : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfico de saldo mensal */}
      {dadosGrafico.length > 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Evolução do Saldo Mensal</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dadosGrafico} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v > 0 ? "+" : ""}${Math.round(v / 60)}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />
              <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
                {dadosGrafico.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.saldo >= 0 ? "#10b981" : "#ef4444"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico por mês */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Histórico por Mês</h2>
          <span className="text-xs text-zinc-600 ml-1">— clique para expandir os registos diários</span>
        </div>

        {[...historico].reverse().map((m, i) => (
          <BlocoMes key={i} m={m} />
        ))}
      </div>
    </div>
  );
}
