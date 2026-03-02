/**
 * ColaboradoresPanel — Painel de resumo por colaborador
 * Design: Dark Command Center
 */

import { useState } from 'react';
import { type Stats, type ProcessedRow, formatSaldo } from '@/lib/pontoProcessor';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  stats: Stats;
  rows: ProcessedRow[];
}

export function ColaboradoresPanel({ stats, rows }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (numero: string) => {
    setExpanded(prev => prev === numero ? null : numero);
  };

  return (
    <div className="space-y-2">
      {stats.porColaborador.map((colab) => {
        const isExpanded = expanded === colab.numero;
        const isPositive = colab.saldoTotal >= 0;
        const diasColab = rows.filter(r => r.numero === colab.numero && !r.ignorada && !r.comJustificacao);
        const diasJust = rows.filter(r => r.numero === colab.numero && r.comJustificacao);

        return (
          <div
            key={colab.numero}
            className="rounded-lg border border-border overflow-hidden"
          >
            {/* Linha do colaborador */}
            <button
              onClick={() => toggle(colab.numero)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
            >
              <span className="text-muted-foreground/40">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>

              {/* Número */}
              <span className="font-mono text-xs text-muted-foreground w-8">{colab.numero}</span>

              {/* Nome */}
              <span className="flex-1 font-medium text-sm">{colab.nome}</span>

              {/* Dias */}
              <span className="text-xs text-muted-foreground mr-4">
                {colab.totalDias} dias
                {diasJust.length > 0 && (
                  <span className="ml-1 text-blue-400">+{diasJust.length} just.</span>
                )}
              </span>

              {/* Saldo */}
              <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />
                }
                {colab.saldoFormatado}
              </div>
            </button>

            {/* Detalhe expandido */}
            {isExpanded && (
              <div className="border-t border-border bg-muted/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">1ª Ent.</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">1ª Saí.</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">2ª Ent.</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">2ª Saí.</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Saldo</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasColab.map((r, i) => {
                      const pos = r.saldoMinutos > 0;
                      const neg = r.saldoMinutos < 0;
                      return (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-4 py-1.5 font-mono text-muted-foreground">
                            {r.data.split(' ')[0]}
                            <span className="text-muted-foreground/40 ml-1">{r.data.split(' ')[1]}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono">
                            <span className={r.en1Auto ? 'text-yellow-400' : ''}>{r.en1Final || '—'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono">
                            <span className={r.sa1Auto ? 'text-yellow-400' : ''}>{r.sa1Final || '—'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono">
                            <span className={r.en2Auto ? 'text-yellow-400' : ''}>{r.en2Final || '—'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono">
                            <span className={r.sa2Auto ? 'text-yellow-400' : ''}>{r.sa2Final || '—'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`font-mono font-bold ${pos ? 'text-green-400' : neg ? 'text-red-400' : 'text-muted-foreground'}`}>
                              {r.saldoFormatado}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground/60 max-w-[200px] truncate" title={r.detalheCalculo}>
                            {r.detalheCalculo === 'Horário cumprido'
                              ? <span className="text-green-500/50">✓</span>
                              : r.detalheCalculo
                            }
                          </td>
                        </tr>
                      );
                    })}
                    {diasJust.map((r, i) => (
                      <tr key={`just-${i}`} className="border-b border-border/30 bg-blue-500/5">
                        <td className="px-4 py-1.5 font-mono text-muted-foreground">
                          {r.data.split(' ')[0]}
                          <span className="text-muted-foreground/40 ml-1">{r.data.split(' ')[1]}</span>
                        </td>
                        <td colSpan={5} className="px-3 py-1.5 text-center">
                          <span className="text-blue-400 text-[10px]">{r.justificacao}</span>
                        </td>
                        <td className="px-3 py-1.5 text-blue-400/60 text-[10px]">Justificado</td>
                      </tr>
                    ))}
                    {/* Total do colaborador */}
                    <tr className="bg-muted/20">
                      <td colSpan={5} className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                        Saldo total do período:
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-mono font-bold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {colab.saldoFormatado}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
