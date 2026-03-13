import React, { useState, useCallback } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Download, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Mes { id: number; label: string; saldoGeral: number; totalColaboradores: number; totalRegistos: number; }

function fmtMin(min: number, showSign = true) {
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return showSign ? `${sign}${str}` : str;
}

function SaldoBadge({ min }: { min: number }) {
  const cls = min > 0 ? 'text-emerald-400' : min < 0 ? 'text-red-400' : 'text-muted-foreground';
  return <span className={`font-bold mono text-sm ${cls}`}>{fmtMin(min)}</span>;
}

/** Formata euros com 2 casas decimais, ex: 12.50 → "12.50€" */
function fmtEuros(val: number) {
  return val > 0 ? `${val.toFixed(2)}€` : '—';
}

export default function VistaMensal({ mesId, meses, onSelectMes }: { mesId: number; meses: Mes[]; onSelectMes: (id: number) => void }) {
  const [activeTab, setActiveTab] = useState<'resumo' | 'detalhe'>('resumo');
  const [expandedColab, setExpandedColab] = useState<string | null>(null);
  const [filterNome, setFilterNome] = useState('');
  // Estado local para edição de extra manual (numero → valor string)
  const [editExtra, setEditExtra] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const { data: resumo = [], isLoading: loadingResumo } = trpc.ponto.getResumoMes.useQuery({ mesId });
  const { data: registos = [], isLoading: loadingRegistos } = trpc.ponto.getRegistosMes.useQuery({ mesId });
  const { data: detalheColabData } = trpc.ponto.getDetalheColaborador.useQuery(
    { numero: expandedColab ?? '', mesId },
    { enabled: !!expandedColab }
  );
  const detalheColab = detalheColabData?.registos ?? [];

  // Regra especial: o estado vem do servidor (campo regraEspecialAtiva no primeiro item do resumo)
  const regraEspecialAtiva = (resumo[0] as any)?.regraEspecialAtiva ?? false;

  const toggleRegraEspecialMutation = trpc.ponto.toggleRegraEspecial.useMutation({
    onSuccess: (data) => {
      utils.ponto.getResumoMes.invalidate({ mesId });
      toast.success(data.ativa ? 'Regra Especial ATIVADA — cálculo combinado almoço+tarde' : 'Regra Especial DESATIVADA — cálculo normal');
    },
    onError: (err) => {
      toast.error(`Erro ao alterar regra: ${err.message}`);
    },
  });

  const setExtraManualMutation = trpc.ponto.setExtraManual.useMutation({
    onSuccess: () => {
      utils.ponto.getResumoMes.invalidate({ mesId });
    },
    onError: (err) => {
      toast.error(`Erro ao guardar: ${err.message}`);
    },
  });

  const mesSel = meses.find(m => m.id === mesId);

  const resumoFiltrado = resumo.filter(r =>
    !filterNome || r.nome.toLowerCase().includes(filterNome.toLowerCase())
  );

  // Totais
  const totAtraso = resumo.reduce((a, r) => a + r.atrasoEn, 0);
  const totAlm    = resumo.reduce((a, r) => a + r.excessoAlm, 0);
  const totCedo   = resumo.reduce((a, r) => a + r.saidaCedo, 0);
  const totExtra  = resumo.reduce((a, r) => a + r.extraSa, 0);
  const totSaldo  = resumo.reduce((a, r) => a + r.saldoTotal, 0);
  const totValorHorasExtra = resumo.reduce((a, r) => a + ((r as any).valorHorasExtra ?? 0), 0);
  const totExtraManual = resumo.reduce((a, r) => a + ((r as any).extraManualEuros ?? 0), 0);
  const totTotalPagar = resumo.reduce((a, r) => a + ((r as any).totalDinheiroPagar ?? 0), 0);

  // Guardar extra manual ao sair do input (onBlur)
  const handleExtraBlur = useCallback((numero: string, valorStr: string) => {
    const val = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      toast.error('Valor inválido. Use um número positivo (ex: 12.50)');
      return;
    }
    setExtraManualMutation.mutate({ numero, mesId, extraManualEuros: val });
  }, [mesId, setExtraManualMutation]);

  // Exportar para Excel (CSV com separador ;)
  const handleDownloadExcel = useCallback(() => {
    if (resumo.length === 0) {
      toast.error('Sem dados para exportar');
      return;
    }
    const label = mesSel?.label ?? 'mes';
    const linhas: string[] = [];
    // Cabeçalho
    linhas.push([
      'Nº', 'Nome', 'Dias Trab.', 'Dias Just.', 'Cél. Auto',
      'Atrasos (min)', 'Exc. Almoço (min)', 'Saída Cedo (min)', 'Horas Extra (min)',
      'Extra @10€/h (min)', 'Extra @15€/h (min)',
      'Valor Horas Extra (€)', 'Extra Manual (€)', 'TOTAL A PAGAR (€)',
      'Saldo Total (min)',
    ].join(';'));
    // Dados
    for (const r of resumo) {
      const em = (r as any).extraManualEuros ?? 0;
      const vh = (r as any).valorHorasExtra ?? 0;
      const tp = (r as any).totalDinheiroPagar ?? 0;
      linhas.push([
        r.numero, r.nome, r.diasTrab, r.diasJust, r.celulasAuto,
        r.atrasoEn, r.excessoAlm, r.saidaCedo, r.extraSa,
        r.extra10Min ?? 0, r.extra15Min ?? 0,
        vh.toFixed(2), em.toFixed(2), tp.toFixed(2),
        r.saldoTotal,
      ].join(';'));
    }
    // Linha de totais
    linhas.push([
      '', 'TOTAL',
      resumo.reduce((a, r) => a + r.diasTrab, 0),
      resumo.reduce((a, r) => a + r.diasJust, 0),
      resumo.reduce((a, r) => a + r.celulasAuto, 0),
      totAtraso, totAlm, totCedo, totExtra,
      resumo.reduce((a, r) => a + (r.extra10Min ?? 0), 0),
      resumo.reduce((a, r) => a + (r.extra15Min ?? 0), 0),
      totValorHorasExtra.toFixed(2),
      totExtraManual.toFixed(2),
      totTotalPagar.toFixed(2),
      totSaldo,
    ].join(';'));

    const csv = '\uFEFF' + linhas.join('\n'); // BOM para Excel PT
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ponto_${label.replace(/ /g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ponto_${label}.csv`);
  }, [resumo, mesSel, totAtraso, totAlm, totCedo, totExtra, totValorHorasExtra, totExtraManual, totTotalPagar, totSaldo]);

  return (
    <div className="space-y-5">
      {/* Seletor de mês + botão Excel */}
      <div className="flex items-center gap-3">
        <select
          value={mesId}
          onChange={e => onSelectMes(Number(e.target.value))}
          className="h-9 px-3 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {meses.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadExcel}
          className="gap-2 text-xs"
          disabled={resumo.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Download Excel
        </Button>
        {/* Botão Regra Especial */}
        <button
          onClick={() => toggleRegraEspecialMutation.mutate({ mesId, ativa: !regraEspecialAtiva })}
          disabled={toggleRegraEspecialMutation.isPending}
          title={regraEspecialAtiva
            ? 'Regra Especial ATIVA: soma almoço+tarde; ≤30min @10€/h, ≥31min @15€/h (tudo). Clique para desativar.'
            : 'Regra Especial INATIVA: cálculo normal (almoço @10€/h + saída @10€/h ou @15€/h separados). Clique para ativar.'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
            regraEspecialAtiva
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30'
              : 'bg-card border-border text-muted-foreground hover:border-amber-400/50 hover:text-amber-400'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${regraEspecialAtiva ? 'fill-amber-400 text-amber-400' : ''}`} />
          {regraEspecialAtiva ? 'Regra Especial ATIVA' : 'Regra Especial'}
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Saldo Geral', value: fmtMin(totSaldo), color: totSaldo >= 0 ? 'text-emerald-400' : 'text-red-400', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Atrasos Entrada', value: fmtMin(-totAtraso, false), color: 'text-red-400', icon: <TrendingDown className="w-4 h-4" /> },
          { label: 'Excesso Almoço', value: fmtMin(-totAlm, false), color: 'text-orange-400', icon: <Clock className="w-4 h-4" /> },
          { label: 'Saída Antecipada', value: fmtMin(-totCedo, false), color: 'text-red-400', icon: <TrendingDown className="w-4 h-4" /> },
          { label: 'Horas Extra', value: fmtMin(totExtra, false), color: 'text-emerald-400', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Valor Horas Extra', value: fmtEuros(totValorHorasExtra), color: 'text-emerald-300', icon: <span className="font-bold text-xs">€</span> },
          { label: 'Total a Pagar', value: fmtEuros(totTotalPagar), color: 'text-yellow-300', icon: <span className="font-bold text-xs">€</span> },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <span className={c.color}>{c.icon}</span>
              </div>
              <p className={`text-lg font-bold mono ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'resumo', label: 'Resumo por Colaborador', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'detalhe', label: 'Registos Diários', icon: <Clock className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as 'resumo' | 'detalhe')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* TAB: RESUMO POR COLABORADOR */}
      {activeTab === 'resumo' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filtrar por nome..."
              value={filterNome}
              onChange={e => setFilterNome(e.target.value)}
              className="h-8 px-3 text-xs rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
            />
            <p className="text-xs text-muted-foreground">
              Clique na coluna <span className="text-yellow-300 font-semibold">Extra Manual</span> para editar o valor (€) e pressione Enter ou clique fora para guardar.
            </p>
          </div>
          {loadingResumo ? (
            <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Nome</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Dias Trab.</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Dias Just.</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Cél. Auto</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-red-400">Atrasos</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-orange-400">Exc. Almoço</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-red-400">Saída Cedo</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-emerald-400">Horas Extra</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-emerald-300">Valor Extra €</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-yellow-300">Extra Manual €</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-yellow-400">Total a Pagar</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-foreground">Saldo Total</th>
                      <th className="px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoFiltrado.map((r, i) => {
                      const valorHorasExtra = (r as any).valorHorasExtra ?? 0;
                      const extraManualEuros = (r as any).extraManualEuros ?? 0;
                      const totalDinheiroPagar = (r as any).totalDinheiroPagar ?? 0;
                      // Valor do input: usa o estado local se estiver a editar, senão usa o valor da BD
                      const inputVal = editExtra[r.numero] !== undefined
                        ? editExtra[r.numero]
                        : extraManualEuros > 0 ? extraManualEuros.toFixed(2) : '';

                      return (
                        <React.Fragment key={r.numero}>
                          <tr
                            className={`border-b border-border/50 hover:bg-card/50 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-card/20'}`}
                            onClick={() => setExpandedColab(expandedColab === r.numero ? null : r.numero)}
                          >
                            <td className="px-3 py-2 font-medium">{r.nome}</td>
                            <td className="px-2 py-2 text-center mono">{r.diasTrab}</td>
                            <td className="px-2 py-2 text-center mono text-blue-400">{r.diasJust || '—'}</td>
                            <td className="px-2 py-2 text-center mono text-yellow-400">{r.celulasAuto || '—'}</td>
                            <td className="px-2 py-2 text-center mono text-red-400">{r.atrasoEn > 0 ? `-${fmtMin(r.atrasoEn, false)}` : '—'}</td>
                            <td className="px-2 py-2 text-center mono text-orange-400">{r.excessoAlm > 0 ? `-${fmtMin(r.excessoAlm, false)}` : '—'}</td>
                            <td className="px-2 py-2 text-center mono text-red-400">{r.saidaCedo > 0 ? `-${fmtMin(r.saidaCedo, false)}` : '—'}</td>
                            <td className="px-2 py-2 text-center mono text-emerald-400">{r.extraSa > 0 ? `+${fmtMin(r.extraSa, false)}` : '—'}</td>
                            <td className="px-2 py-2 text-center mono text-emerald-300 font-semibold">
                              {fmtEuros(valorHorasExtra)}
                            </td>
                            {/* Coluna Extra Manual — input editável */}
                            <td
                              className="px-2 py-2 text-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={inputVal}
                                onChange={e => setEditExtra(prev => ({ ...prev, [r.numero]: e.target.value }))}
                                onBlur={e => {
                                  handleExtraBlur(r.numero, e.target.value || '0');
                                  setEditExtra(prev => { const n = { ...prev }; delete n[r.numero]; return n; });
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleExtraBlur(r.numero, (e.target as HTMLInputElement).value || '0');
                                    setEditExtra(prev => { const n = { ...prev }; delete n[r.numero]; return n; });
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-20 h-7 px-2 text-center text-xs rounded border border-yellow-400/40 bg-yellow-400/10 text-yellow-300 font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400 mono"
                              />
                            </td>
                            <td className="px-2 py-2 text-center mono text-yellow-400 font-bold">
                              {fmtEuros(totalDinheiroPagar)}
                            </td>
                            <td className="px-2 py-2 text-center"><SaldoBadge min={r.saldoTotal} /></td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {expandedColab === r.numero ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                <Link
                                  href={`/colaborador/${r.numero}`}
                                  onClick={e => e.stopPropagation()}
                                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                  title="Ver perfil completo"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                          {expandedColab === r.numero && (
                            <tr className="bg-card/30">
                              <td colSpan={13} className="px-4 py-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left py-1 pr-3">Data</th>
                                        <th className="text-left py-1 pr-3">Dia</th>
                                        <th className="text-center py-1 pr-3">1ª Entrada</th>
                                        <th className="text-center py-1 pr-3">1ª Saída</th>
                                        <th className="text-center py-1 pr-3">2ª Entrada</th>
                                        <th className="text-center py-1 pr-3">2ª Saída</th>
                                        <th className="text-center py-1 pr-3">Saldo</th>
                                        <th className="text-left py-1">Detalhe</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detalheColab.map(d => (
                                        <tr key={d.id} className={`border-t border-border/30 ${d.justificacao ? 'bg-blue-500/5' : ''}`}>
                                          <td className="py-1 pr-3 mono">{d.data.split(' ')[0]}</td>
                                          <td className="py-1 pr-3 text-muted-foreground">{d.diaSemana}</td>
                                          <td className={`py-1 pr-3 text-center mono ${d.en1Auto ? 'text-yellow-300 italic' : ''}`}>{d.en1 ?? '—'}</td>
                                          <td className={`py-1 pr-3 text-center mono ${d.sa1Auto ? 'text-yellow-300 italic' : ''}`}>{d.sa1 ?? '—'}</td>
                                          <td className={`py-1 pr-3 text-center mono ${d.en2Auto ? 'text-yellow-300 italic' : ''}`}>{d.en2 ?? '—'}</td>
                                          <td className={`py-1 pr-3 text-center mono ${d.sa2Auto ? 'text-yellow-300 italic' : ''}`}>{d.sa2 ?? '—'}</td>
                                          <td className="py-1 pr-3 text-center">
                                            {d.saldo !== null ? <SaldoBadge min={d.saldo} /> : <span className="text-blue-400 text-xs">{d.justificacao ?? '—'}</span>}
                                          </td>
                                          <td className="py-1 text-muted-foreground">{d.detalhe}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* Linha de totais */}
                    <tr className="bg-card border-t-2 border-border font-bold">
                      <td className="px-3 py-2.5 text-foreground">TOTAL</td>
                      <td className="px-2 py-2.5 text-center mono">{resumo.reduce((a, r) => a + r.diasTrab, 0)}</td>
                      <td className="px-2 py-2.5 text-center mono text-blue-400">{resumo.reduce((a, r) => a + r.diasJust, 0)}</td>
                      <td className="px-2 py-2.5 text-center mono text-yellow-400">{resumo.reduce((a, r) => a + r.celulasAuto, 0)}</td>
                      <td className="px-2 py-2.5 text-center mono text-red-400">{totAtraso > 0 ? `-${fmtMin(totAtraso, false)}` : '—'}</td>
                      <td className="px-2 py-2.5 text-center mono text-orange-400">{totAlm > 0 ? `-${fmtMin(totAlm, false)}` : '—'}</td>
                      <td className="px-2 py-2.5 text-center mono text-red-400">{totCedo > 0 ? `-${fmtMin(totCedo, false)}` : '—'}</td>
                      <td className="px-2 py-2.5 text-center mono text-emerald-400">{totExtra > 0 ? `+${fmtMin(totExtra, false)}` : '—'}</td>
                      <td className="px-2 py-2.5 text-center mono text-emerald-300">{fmtEuros(totValorHorasExtra)}</td>
                      <td className="px-2 py-2.5 text-center mono text-yellow-300">{fmtEuros(totExtraManual)}</td>
                      <td className="px-2 py-2.5 text-center mono text-yellow-400">{fmtEuros(totTotalPagar)}</td>
                      <td className="px-2 py-2.5 text-center"><SaldoBadge min={totSaldo} /></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: REGISTOS DIÁRIOS */}
      {activeTab === 'detalhe' && (
        <div>
          {loadingRegistos ? (
            <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      {['Nº', 'Nome', 'Data', 'Dia', 'Horário', '1ª Entrada', '1ª Saída', '2ª Entrada', '2ª Saída', 'Saldo', 'Cenário', 'Detalhe', 'Justificação'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registos.map((r, i) => (
                      <tr key={r.id} className={`border-b border-border/50 hover:bg-card/50 ${r.justificacao ? 'bg-blue-500/5' : i % 2 === 0 ? '' : 'bg-card/20'}`}>
                        <td className="px-3 py-1.5 mono text-muted-foreground">{r.numero}</td>
                        <td className="px-3 py-1.5 font-medium whitespace-nowrap">{r.nome}</td>
                        <td className="px-3 py-1.5 mono whitespace-nowrap">{r.data.split(' ')[0]}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.diaSemana}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.horario}</td>
                        <td className={`px-3 py-1.5 mono ${r.en1Auto ? 'text-yellow-300 italic' : ''}`}>{r.en1 ?? '—'}</td>
                        <td className={`px-3 py-1.5 mono ${r.sa1Auto ? 'text-yellow-300 italic' : ''}`}>{r.sa1 ?? '—'}</td>
                        <td className={`px-3 py-1.5 mono ${r.en2Auto ? 'text-yellow-300 italic' : ''}`}>{r.en2 ?? '—'}</td>
                        <td className={`px-3 py-1.5 mono ${r.sa2Auto ? 'text-yellow-300 italic' : ''}`}>{r.sa2 ?? '—'}</td>
                        <td className="px-3 py-1.5">{r.saldo !== null ? <SaldoBadge min={r.saldo} /> : '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground mono">{r.cenario}</td>
                        <td className="px-3 py-1.5 text-muted-foreground max-w-xs truncate">{r.detalhe}</td>
                        <td className="px-3 py-1.5 text-blue-400">{r.justificacao ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
