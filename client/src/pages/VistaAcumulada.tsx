import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

function fmtMin(min: number, showSign = true) {
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return showSign ? `${sign}${str}` : str;
}

function SaldoBadge({ min }: { min: number }) {
  const cls = min > 0 ? 'text-emerald-600' : min < 0 ? 'text-red-600' : 'text-muted-foreground';
  return <span className={`font-bold mono text-sm ${cls}`}>{fmtMin(min)}</span>;
}

export default function VistaAcumulada() {
  const { data: resumo = [], isLoading } = trpc.ponto.getResumoAcumulado.useQuery();

  const totSaldo  = resumo.reduce((a, r) => a + r.saldoTotal, 0);
  const totAtraso = resumo.reduce((a, r) => a + r.atrasoEn, 0);
  const totAlm    = resumo.reduce((a, r) => a + r.excessoAlm, 0);
  const totCedo   = resumo.reduce((a, r) => a + r.saidaCedo, 0);
  const totExtra  = resumo.reduce((a, r) => a + r.extraSa, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Saldo Acumulado Anual</h1>
        <p className="text-sm text-muted-foreground mt-1">Soma de todos os meses carregados, por colaborador.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Saldo Geral', value: fmtMin(totSaldo), color: totSaldo >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'Total Atrasos', value: `-${fmtMin(totAtraso, false)}`, color: 'text-red-600' },
          { label: 'Exc. Almoço', value: `-${fmtMin(totAlm, false)}`, color: 'text-orange-600' },
          { label: 'Saída Antecipada', value: `-${fmtMin(totCedo, false)}`, color: 'text-red-600' },
          { label: 'Horas Extra', value: `+${fmtMin(totExtra, false)}`, color: 'text-emerald-600' },
        ].map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-bold mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>
      ) : resumo.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Nenhum dado disponível. Carregue pelo menos um mês.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Nome</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Dias Trab.</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Dias Just.</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-red-600">Atrasos</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-orange-600">Exc. Almoço</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-red-600">Saída Cedo</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-emerald-600">Horas Extra</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-foreground">Saldo Total</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Saldo (min)</th>
                  <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Situação</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((r, i) => {
                  const situacao = r.saldoTotal > 60 ? 'Positivo' : r.saldoTotal < -60 ? 'Negativo' : 'Equilibrado';
                  const sitColor = r.saldoTotal > 60 ? 'text-emerald-600' : r.saldoTotal < -60 ? 'text-red-600' : 'text-muted-foreground';
                  return (
                    <tr key={r.numero} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-3 py-2 font-medium text-foreground">{r.nome}</td>
                      <td className="px-2 py-2 text-center mono text-foreground">{r.diasTrab}</td>
                      <td className="px-2 py-2 text-center mono text-blue-600">{r.diasJust || '—'}</td>
                      <td className="px-2 py-2 text-center mono text-red-600">{r.atrasoEn > 0 ? `-${fmtMin(r.atrasoEn, false)}` : '—'}</td>
                      <td className="px-2 py-2 text-center mono text-orange-600">{r.excessoAlm > 0 ? `-${fmtMin(r.excessoAlm, false)}` : '—'}</td>
                      <td className="px-2 py-2 text-center mono text-red-600">{r.saidaCedo > 0 ? `-${fmtMin(r.saidaCedo, false)}` : '—'}</td>
                      <td className="px-2 py-2 text-center mono text-emerald-600">{r.extraSa > 0 ? `+${fmtMin(r.extraSa, false)}` : '—'}</td>
                      <td className="px-2 py-2 text-center"><SaldoBadge min={r.saldoTotal} /></td>
                      <td className="px-2 py-2 text-center mono text-muted-foreground">{r.saldoTotal > 0 ? `+${r.saldoTotal}` : r.saldoTotal}</td>
                      <td className={`px-2 py-2 text-center text-xs font-medium ${sitColor}`}>
                        <span className="flex items-center justify-center gap-1">
                          {r.saldoTotal > 60 ? <TrendingUp className="w-3 h-3" /> : r.saldoTotal < -60 ? <TrendingDown className="w-3 h-3" /> : null}
                          {situacao}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Link href={`/colaborador/${r.numero}`} className="text-primary hover:text-primary/80 transition-colors" title="Ver perfil">
                          <ExternalLink className="w-3.5 h-3.5 mx-auto" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Totais */}
                <tr className="bg-muted/30 border-t-2 border-border font-bold">
                  <td className="px-3 py-2.5 text-foreground">TOTAL</td>
                  <td className="px-2 py-2.5 text-center mono text-foreground">{resumo.reduce((a, r) => a + r.diasTrab, 0)}</td>
                  <td className="px-2 py-2.5 text-center mono text-blue-600">{resumo.reduce((a, r) => a + r.diasJust, 0)}</td>
                  <td className="px-2 py-2.5 text-center mono text-red-600">{totAtraso > 0 ? `-${fmtMin(totAtraso, false)}` : '—'}</td>
                  <td className="px-2 py-2.5 text-center mono text-orange-600">{totAlm > 0 ? `-${fmtMin(totAlm, false)}` : '—'}</td>
                  <td className="px-2 py-2.5 text-center mono text-red-600">{totCedo > 0 ? `-${fmtMin(totCedo, false)}` : '—'}</td>
                  <td className="px-2 py-2.5 text-center mono text-emerald-600">{totExtra > 0 ? `+${fmtMin(totExtra, false)}` : '—'}</td>
                  <td className="px-2 py-2.5 text-center"><SaldoBadge min={totSaldo} /></td>
                  <td className="px-2 py-2.5 text-center mono text-muted-foreground">{totSaldo > 0 ? `+${totSaldo}` : totSaldo}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
