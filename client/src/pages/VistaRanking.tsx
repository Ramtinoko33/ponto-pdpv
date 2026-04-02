import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { TrendingDown, TrendingUp, Clock, LogOut, Calendar, Trophy, Star, GitCompare } from 'lucide-react';

function fmtMin(min: number, showSign = false) {
  const sign = showSign ? (min >= 0 ? '+' : '-') : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type ResumoItem = {
  nome: string;
  atrasoEn: number;
  excessoAlm: number;
  saidaCedo: number;
  extraSa: number;
  saldoTotal: number;
};

function calcularTop10(resumo: ResumoItem[]) {
  return {
    atrasos: [...resumo].filter(r => r.atrasoEn > 0).sort((a, b) => b.atrasoEn - a.atrasoEn).slice(0, 10).map(r => ({ nome: r.nome, value: r.atrasoEn })),
    almoco: [...resumo].filter(r => r.excessoAlm > 0).sort((a, b) => b.excessoAlm - a.excessoAlm).slice(0, 10).map(r => ({ nome: r.nome, value: r.excessoAlm })),
    saidaCedo: [...resumo].filter(r => r.saidaCedo > 0).sort((a, b) => b.saidaCedo - a.saidaCedo).slice(0, 10).map(r => ({ nome: r.nome, value: r.saidaCedo })),
    extra: [...resumo].filter(r => r.extraSa > 0).sort((a, b) => b.extraSa - a.extraSa).slice(0, 10).map(r => ({ nome: r.nome, value: r.extraSa })),
    saldoNeg: [...resumo].filter(r => r.saldoTotal < 0).sort((a, b) => a.saldoTotal - b.saldoTotal).slice(0, 10).map(r => ({ nome: r.nome, value: Math.abs(r.saldoTotal) })),
    saldoPos: [...resumo].filter(r => r.saldoTotal > 0).sort((a, b) => b.saldoTotal - a.saldoTotal).slice(0, 10).map(r => ({ nome: r.nome, value: r.saldoTotal })),
  };
}

function calcularMelhor(resumo: ResumoItem[]) {
  if (resumo.length === 0) return null;
  // Melhor saldo positivo
  const melhorSaldo = [...resumo].sort((a, b) => b.saldoTotal - a.saldoTotal)[0];
  // Menos faltas (soma de atraso + excesso almoço + saída cedo)
  const menosFaltas = [...resumo].sort((a, b) => (a.atrasoEn + a.excessoAlm + a.saidaCedo) - (b.atrasoEn + b.excessoAlm + b.saidaCedo))[0];
  return { melhorSaldo, menosFaltas };
}

function RankingCard({
  title, icon, color, data,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  data: Array<{ nome: string; value: number }>;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-3 space-y-2">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Sem dados</p>
        ) : (
          data.map((d, i) => (
            <div key={d.nome} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-400' :
                    i === 2 ? 'bg-orange-700/20 text-orange-600' :
                    'bg-muted text-muted-foreground'
                  }`}>{i + 1}</span>
                  <span className="font-medium truncate max-w-[140px]">{d.nome}</span>
                </span>
                <span className={`mono font-bold ${color}`}>{fmtMin(d.value)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    color.includes('red') ? 'bg-red-500' :
                    color.includes('orange') ? 'bg-orange-500' :
                    color.includes('emerald') ? 'bg-emerald-500' :
                    'bg-primary'
                  }`}
                  style={{ width: `${(d.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Card de comparação entre dois meses — mostra diferença de posição e valor
function CompareCard({
  title, icon, color, dataA, dataB, labelA, labelB,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  dataA: Array<{ nome: string; value: number }>;
  dataB: Array<{ nome: string; value: number }>;
  labelA: string;
  labelB: string;
}) {
  // Unir todos os nomes
  const nomes = Array.from(new Set([...dataA.map(d => d.nome), ...dataB.map(d => d.nome)]));
  const mapA = new Map(dataA.map(d => [d.nome, d.value]));
  const mapB = new Map(dataB.map(d => [d.nome, d.value]));
  const rows = nomes
    .map(nome => ({ nome, a: mapA.get(nome) ?? 0, b: mapB.get(nome) ?? 0 }))
    .filter(r => r.a > 0 || r.b > 0)
    .sort((x, y) => (y.a + y.b) - (x.a + x.b))
    .slice(0, 8);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-3 py-2 border-b border-border/50 grid grid-cols-3 text-[10px] text-muted-foreground font-medium">
        <span>Colaborador</span>
        <span className="text-center truncate">{labelA}</span>
        <span className="text-center truncate">{labelB}</span>
      </div>
      <div className="p-2 space-y-1">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sem dados</p>
        ) : rows.map(r => {
          const diff = r.b - r.a;
          return (
            <div key={r.nome} className="grid grid-cols-3 items-center text-xs py-1 px-1 rounded hover:bg-muted/30">
              <span className="font-medium truncate pr-2">{r.nome}</span>
              <span className={`mono text-center ${color}`}>{r.a > 0 ? fmtMin(r.a) : '—'}</span>
              <span className="text-center flex items-center justify-center gap-1">
                <span className={`mono ${color}`}>{r.b > 0 ? fmtMin(r.b) : '—'}</span>
                {diff !== 0 && (
                  <span className={`text-[9px] mono ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {diff > 0 ? `+${fmtMin(diff)}` : `-${fmtMin(Math.abs(diff))}`}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MelhorDoMesCard({ resumo, label }: { resumo: ResumoItem[]; label: string }) {
  const melhor = calcularMelhor(resumo);
  if (!melhor) return null;

  const { melhorSaldo, menosFaltas } = melhor;
  const mesmaPessoa = melhorSaldo.nome === menosFaltas.nome;

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center gap-2 text-yellow-400">
        <Trophy className="w-4 h-4" />
        <span className="text-sm font-semibold">Melhor do Período</span>
        <span className="text-xs text-yellow-400/60 ml-auto">{label}</span>
      </div>
      <div className={`p-4 ${mesmaPessoa ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}`}>
        {/* Melhor saldo */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Maior Saldo Positivo</p>
            <p className="font-bold text-sm text-foreground mt-0.5">{melhorSaldo.nome}</p>
            <p className="text-xs mono text-emerald-400 mt-0.5">{fmtMin(melhorSaldo.saldoTotal, true)}</p>
          </div>
        </div>

        {/* Menos faltas (só mostrar se for pessoa diferente) */}
        {!mesmaPessoa && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Menos Irregularidades</p>
              <p className="font-bold text-sm text-foreground mt-0.5">{menosFaltas.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {menosFaltas.atrasoEn + menosFaltas.excessoAlm + menosFaltas.saidaCedo === 0
                  ? 'Sem irregularidades'
                  : `${fmtMin(menosFaltas.atrasoEn + menosFaltas.excessoAlm + menosFaltas.saidaCedo)} total`}
              </p>
            </div>
          </div>
        )}
        {mesmaPessoa && (
          <p className="text-xs text-muted-foreground mt-2">
            Também o colaborador com menos irregularidades neste período.
          </p>
        )}
      </div>
    </div>
  );
}

export default function VistaRanking() {
  const [mesIdSelecionado, setMesIdSelecionado] = useState<number | null>(null);
  const [modoComparacao, setModoComparacao] = useState(false);
  const [mesIdB, setMesIdB] = useState<number | null>(null);

  const { data: meses = [] } = trpc.ponto.listarMeses.useQuery();
  const { data: resumoAcumulado = [], isLoading: loadingAcum } = trpc.ponto.getResumoAcumulado.useQuery();
  const { data: resumoMesA = [], isLoading: loadingMesA } = trpc.ponto.getResumoMes.useQuery(
    { mesId: mesIdSelecionado! },
    { enabled: mesIdSelecionado !== null }
  );
  const { data: resumoMesB = [], isLoading: loadingMesB } = trpc.ponto.getResumoMes.useQuery(
    { mesId: mesIdB! },
    { enabled: modoComparacao && mesIdB !== null }
  );

  const isLoading = (mesIdSelecionado === null ? loadingAcum : loadingMesA) || (modoComparacao && loadingMesB);

  const resumoA: ResumoItem[] = mesIdSelecionado === null ? resumoAcumulado : resumoMesA;
  const resumoB: ResumoItem[] = resumoMesB;

  const top = calcularTop10(resumoA);
  const topB = calcularTop10(resumoB);

  const labelA = mesIdSelecionado === null
    ? 'Acumulado'
    : (meses.find(m => m.id === mesIdSelecionado)?.label ?? 'Mês A');
  const labelB = mesIdB === null ? '—' : (meses.find(m => m.id === mesIdB)?.label ?? 'Mês B');

  const labelAtual = modoComparacao
    ? `${labelA} vs ${labelB}`
    : (mesIdSelecionado === null ? 'Acumulado — todos os meses carregados' : labelA);

  return (
    <div className="space-y-5">
      {/* Cabeçalho + controlos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Ranking de Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top 10 por categoria — <span className="text-foreground font-medium">{labelAtual}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão modo comparação */}
          <button
            onClick={() => { setModoComparacao(v => !v); setMesIdB(null); }}
            className={`flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border transition-colors ${
              modoComparacao
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Comparar
          </button>

          {/* Seletor mês A */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
              value={mesIdSelecionado ?? ''}
              onChange={e => setMesIdSelecionado(e.target.value === '' ? null : parseInt(e.target.value))}
              className="h-8 px-3 text-sm rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Acumulado (todos)</option>
              {meses.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Seletor mês B (só no modo comparação) */}
          {modoComparacao && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">vs</span>
              <select
                value={mesIdB ?? ''}
                onChange={e => setMesIdB(e.target.value === '' ? null : parseInt(e.target.value))}
                className="h-8 px-3 text-sm rounded-md border border-primary/50 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Escolher mês...</option>
                {meses.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>
      ) : resumoA.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Nenhum dado disponível. Carregue pelo menos um mês.
        </div>
      ) : modoComparacao && mesIdB !== null ? (
        /* MODO COMPARAÇÃO */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <CompareCard title="Atrasos na Entrada" icon={<TrendingDown className="w-4 h-4" />} color="text-red-400" dataA={top.atrasos} dataB={topB.atrasos} labelA={labelA} labelB={labelB} />
            <CompareCard title="Excesso no Almoço" icon={<Clock className="w-4 h-4" />} color="text-orange-400" dataA={top.almoco} dataB={topB.almoco} labelA={labelA} labelB={labelB} />
            <CompareCard title="Saídas Antecipadas" icon={<LogOut className="w-4 h-4" />} color="text-red-400" dataA={top.saidaCedo} dataB={topB.saidaCedo} labelA={labelA} labelB={labelB} />
            <CompareCard title="Horas Extra" icon={<TrendingUp className="w-4 h-4" />} color="text-emerald-400" dataA={top.extra} dataB={topB.extra} labelA={labelA} labelB={labelB} />
            <CompareCard title="Saldo Negativo" icon={<TrendingDown className="w-4 h-4" />} color="text-red-400" dataA={top.saldoNeg} dataB={topB.saldoNeg} labelA={labelA} labelB={labelB} />
            <CompareCard title="Saldo Positivo" icon={<TrendingUp className="w-4 h-4" />} color="text-emerald-400" dataA={top.saldoPos} dataB={topB.saldoPos} labelA={labelA} labelB={labelB} />
          </div>
        </div>
      ) : (
        /* MODO NORMAL */
        <div className="space-y-4">
          {/* Card Melhor do Período */}
          <MelhorDoMesCard resumo={resumoA} label={labelA} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <RankingCard title="Mais Atrasos na Entrada" icon={<TrendingDown className="w-4 h-4" />} color="text-red-400" data={top.atrasos} />
            <RankingCard title="Mais Tempo no Almoço" icon={<Clock className="w-4 h-4" />} color="text-orange-400" data={top.almoco} />
            <RankingCard title="Mais Saídas Antecipadas" icon={<LogOut className="w-4 h-4" />} color="text-red-400" data={top.saidaCedo} />
            <RankingCard title="Mais Horas Extra" icon={<TrendingUp className="w-4 h-4" />} color="text-emerald-400" data={top.extra} />
            <RankingCard title="Maior Saldo Negativo" icon={<TrendingDown className="w-4 h-4" />} color="text-red-400" data={top.saldoNeg} />
            <RankingCard title="Maior Saldo Positivo" icon={<TrendingUp className="w-4 h-4" />} color="text-emerald-400" data={top.saldoPos} />
          </div>
        </div>
      )}
    </div>
  );
}
