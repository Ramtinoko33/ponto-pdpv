/**
 * ResultsTable — Tabela de registos de picagem processados
 * Design: Dark Command Center
 * Cores: verde=positivo, vermelho=negativo, amarelo=auto-fill, azul=justificação
 */

import { type ProcessedRow } from '@/lib/pontoProcessor';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  rows: ProcessedRow[];
}

function TimeCell({ value, isAuto, isEmpty }: { value: string; isAuto: boolean; isEmpty?: boolean }) {
  if (!value || isEmpty) {
    return <span className="text-muted-foreground/30 font-mono text-xs">—</span>;
  }
  return (
    <span className={`font-mono text-xs ${isAuto ? 'text-yellow-400' : 'text-foreground/90'}`}>
      {value}
      {isAuto && <span className="text-yellow-600 text-[10px] ml-0.5">*</span>}
    </span>
  );
}

function SaldoCell({ saldo, formatted }: { saldo: number; formatted: string }) {
  if (formatted === '—') {
    return <span className="text-muted-foreground/40 font-mono text-xs">—</span>;
  }
  const cls = saldo > 0 ? 'text-green-400' : saldo < 0 ? 'text-red-400' : 'text-muted-foreground';
  return <span className={`font-mono text-xs font-bold ${cls}`}>{formatted}</span>;
}

export function ResultsTable({ rows }: Props) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Nº</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Nome</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Data</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Horário</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">1ª Entrada</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">1ª Saída</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">2ª Entrada</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">2ª Saída</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Saldo</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isJust = row.comJustificacao;
              const isSab = row.ehSabado;

              let rowBg = '';
              if (isJust) rowBg = 'bg-blue-500/5 border-l-2 border-l-blue-500/40';
              else if (isSab) rowBg = 'bg-purple-500/5';
              else if (row.saldoMinutos > 0) rowBg = '';
              else if (row.saldoMinutos < 0) rowBg = '';

              return (
                <tr
                  key={i}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors row-enter ${rowBg}`}
                  style={{ animationDelay: `${Math.min(i * 10, 300)}ms` }}
                >
                  <td className="px-3 py-2 font-mono text-muted-foreground">{row.numero}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap max-w-[140px] truncate" title={row.nome}>
                    {row.nome}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {row.data.split(' ')[0]}
                    <span className="text-muted-foreground/40 ml-1">{row.data.split(' ')[1]}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground">
                      {row.horario}
                    </span>
                    {isSab && (
                      <span className="ml-1 inline-block px-1 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">sáb</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TimeCell value={row.en1Final} isAuto={row.en1Auto} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TimeCell value={row.sa1Final} isAuto={row.sa1Auto} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TimeCell value={row.en2Final} isAuto={row.en2Auto} isEmpty={isSab} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TimeCell value={row.sa2Final} isAuto={row.sa2Auto} isEmpty={isSab} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isJust ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                        {row.justificacao.slice(0, 8)}
                      </span>
                    ) : (
                      <SaldoCell saldo={row.saldoMinutos} formatted={row.saldoFormatado} />
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    {row.detalheCalculo && row.detalheCalculo !== 'Horário cumprido' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                            <Info className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate text-[10px] max-w-[160px]">{row.detalheCalculo}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-xs">
                          <p>{row.detalheCalculo}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-[10px] text-green-500/60">✓ Cumprido</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
