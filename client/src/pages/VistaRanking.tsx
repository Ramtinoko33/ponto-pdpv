import { trpc } from '@/lib/trpc';
import { TrendingDown, TrendingUp, Clock, LogOut } from 'lucide-react';

function fmtMin(min: number, showSign = false) {
  const sign = showSign ? (min >= 0 ? '+' : '-') : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function RankingCard({
  title, icon, color, data, valueKey, label,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  data: Array<{ nome: string; value: number }>;
  valueKey: string;
  label: string;
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

export default function VistaRanking() {
  const { data: resumo = [], isLoading } = trpc.ponto.getResumoAcumulado.useQuery();

  if (isLoading) return <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>;
  if (resumo.length === 0) return (
    <div className="py-16 text-center text-muted-foreground text-sm">
      Nenhum dado disponível. Carregue pelo menos um mês.
    </div>
  );

  const top10Atrasos = [...resumo]
    .filter(r => r.atrasoEn > 0)
    .sort((a, b) => b.atrasoEn - a.atrasoEn)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: r.atrasoEn }));

  const top10Almoco = [...resumo]
    .filter(r => r.excessoAlm > 0)
    .sort((a, b) => b.excessoAlm - a.excessoAlm)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: r.excessoAlm }));

  const top10SaidaCedo = [...resumo]
    .filter(r => r.saidaCedo > 0)
    .sort((a, b) => b.saidaCedo - a.saidaCedo)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: r.saidaCedo }));

  const top10Extra = [...resumo]
    .filter(r => r.extraSa > 0)
    .sort((a, b) => b.extraSa - a.extraSa)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: r.extraSa }));

  const top10SaldoNeg = [...resumo]
    .filter(r => r.saldoTotal < 0)
    .sort((a, b) => a.saldoTotal - b.saldoTotal)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: Math.abs(r.saldoTotal) }));

  const top10SaldoPos = [...resumo]
    .filter(r => r.saldoTotal > 0)
    .sort((a, b) => b.saldoTotal - a.saldoTotal)
    .slice(0, 10)
    .map(r => ({ nome: r.nome, value: r.saldoTotal }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Ranking de Colaboradores</h1>
        <p className="text-sm text-muted-foreground mt-1">Top 10 por categoria — acumulado de todos os meses carregados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <RankingCard
          title="Mais Atrasos na Entrada"
          icon={<TrendingDown className="w-4 h-4" />}
          color="text-red-400"
          data={top10Atrasos}
          valueKey="atrasoEn"
          label="atraso"
        />
        <RankingCard
          title="Mais Tempo no Almoço"
          icon={<Clock className="w-4 h-4" />}
          color="text-orange-400"
          data={top10Almoco}
          valueKey="excessoAlm"
          label="excesso"
        />
        <RankingCard
          title="Mais Saídas Antecipadas"
          icon={<LogOut className="w-4 h-4" />}
          color="text-red-400"
          data={top10SaidaCedo}
          valueKey="saidaCedo"
          label="saída cedo"
        />
        <RankingCard
          title="Mais Horas Extra"
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-400"
          data={top10Extra}
          valueKey="extraSa"
          label="extra"
        />
        <RankingCard
          title="Maior Saldo Negativo"
          icon={<TrendingDown className="w-4 h-4" />}
          color="text-red-400"
          data={top10SaldoNeg}
          valueKey="saldoTotal"
          label="negativo"
        />
        <RankingCard
          title="Maior Saldo Positivo"
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-400"
          data={top10SaldoPos}
          valueKey="saldoTotal"
          label="positivo"
        />
      </div>
    </div>
  );
}
