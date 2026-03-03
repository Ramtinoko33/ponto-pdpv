import { useState, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Clock, Upload, Trash2, ChevronRight, BarChart3, Users,
  TrendingUp, Calendar, AlertCircle, CheckCircle2, FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VistaMensal from './VistaMensal';
import VistaAcumulada from './VistaAcumulada';
import VistaRanking from './VistaRanking';

type Tab = 'upload' | 'mensal' | 'acumulada' | 'ranking';

function fmtSaldo(min: number) {
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('upload');
  const [selectedMesId, setSelectedMesId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: meses = [], isLoading: loadingMeses } = trpc.ponto.listarMeses.useQuery();
  const uploadMut = trpc.ponto.uploadMes.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.label} carregado — ${data.totalRegistos} registos, ${data.totalColaboradores} colaboradores`);
      utils.ponto.listarMeses.invalidate();
      setSelectedMesId(data.mesId);
      setTab('mensal');
      setUploading(false);
    },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setUploading(false); },
  });
  const apagarMut = trpc.ponto.apagarMes.useMutation({
    onSuccess: () => { toast.success('Mês apagado'); utils.ponto.listarMeses.invalidate(); },
  });

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    const buf = await file.arrayBuffer();
    const b64 = btoa(Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join(''));
    uploadMut.mutate({ fileBase64: b64, fileName: file.name, ano, mes });
  }, [ano, mes, uploadMut]);

  const MESES_PT = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const navItems = [
    { id: 'upload' as Tab, icon: <Upload className="w-4 h-4" />, label: 'Carregar Mês' },
    { id: 'mensal' as Tab, icon: <Calendar className="w-4 h-4" />, label: 'Vista Mensal' },
    { id: 'acumulada' as Tab, icon: <TrendingUp className="w-4 h-4" />, label: 'Acumulado Anual' },
    { id: 'ranking' as Tab, icon: <BarChart3 className="w-4 h-4" />, label: 'Ranking' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* SIDEBAR */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-sidebar-foreground">Picagem de Ponto</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 mono">Pneus D. Pedro V</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Meses carregados */}
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">Meses Carregados</p>
          {loadingMeses ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">A carregar...</div>
          ) : meses.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">Nenhum mês ainda</div>
          ) : (
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {meses.map(m => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer group transition-colors ${
                    selectedMesId === m.id ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
                  }`}
                  onClick={() => { setSelectedMesId(m.id); setTab('mensal'); }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{m.label}</p>
                    <p className={`text-[10px] mono ${m.saldoGeral >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtSaldo(m.saldoGeral)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); apagarMut.mutate({ mesId: m.id }); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Picagem de Ponto</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">
            {navItems.find(n => n.id === tab)?.label}
            {tab === 'mensal' && selectedMesId && meses.find(m => m.id === selectedMesId) && (
              <span className="text-muted-foreground font-normal"> — {meses.find(m => m.id === selectedMesId)?.label}</span>
            )}
          </span>
        </header>

        <div className="p-6">
          {/* TAB: UPLOAD */}
          {tab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-bold">Carregar Ficheiro Mensal</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upload do ficheiro Excel (.xlsx) exportado do software de picagem de ponto.
                  As regras são aplicadas automaticamente.
                </p>
              </div>

              {/* Seletor de mês/ano */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Selecionar Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Mês</label>
                      <select
                        value={mes}
                        onChange={e => setMes(Number(e.target.value))}
                        className="w-full h-9 px-3 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {MESES_PT.slice(1).map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground mb-1 block">Ano</label>
                      <input
                        type="number"
                        value={ano}
                        onChange={e => setAno(Number(e.target.value))}
                        min={2020} max={2100}
                        className="w-full h-9 px-3 text-sm rounded-md border border-border bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  uploading ? 'border-primary/50 bg-primary/5 pointer-events-none' : 'border-border hover:border-primary/50 hover:bg-card/50'
                }`}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                {uploading ? (
                  <div className="space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm font-medium">A processar e guardar...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <FileSpreadsheet className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">Arraste o ficheiro aqui</p>
                      <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground mono mt-3 opacity-60">.xlsx · .xls</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regras */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Regras Aplicadas Automaticamente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { icon: '🗑️', text: 'Domingos e folgas (FIMS) são ignorados' },
                    { icon: '📅', text: 'Sábados: 1 turno — 08:30 às 13:00' },
                    { icon: '📝', text: 'Dias com justificação não são alterados' },
                    { icon: '⚡', text: 'Células vazias preenchidas: EN1=08:30 SA1=13:00 EN2=14:00 SA2=18:30' },
                    { icon: '🔍', text: 'Valores entre 17:00-20:00 em qualquer coluna → saída final' },
                    { icon: '👤', text: 'Horários personalizados: Patricia e Pedro Silva entram às 09:00' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-base leading-none mt-0.5">{r.icon}</span>
                      <span>{r.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Meses existentes */}
              {meses.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Meses Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meses.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors" onClick={() => { setSelectedMesId(m.id); setTab('mensal'); }}>
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{m.label}</p>
                              <p className="text-xs text-muted-foreground">{m.totalColaboradores} colaboradores · {m.totalRegistos} registos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold mono ${m.saldoGeral >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {fmtSaldo(m.saldoGeral)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB: VISTA MENSAL */}
          {tab === 'mensal' && (
            selectedMesId ? (
              <VistaMensal mesId={selectedMesId} meses={meses} onSelectMes={setSelectedMesId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium">Nenhum mês selecionado</p>
                <p className="text-sm text-muted-foreground mt-2">Selecione um mês na barra lateral ou carregue um ficheiro.</p>
                <Button className="mt-4" onClick={() => setTab('upload')}>Carregar ficheiro</Button>
              </div>
            )
          )}

          {/* TAB: ACUMULADA */}
          {tab === 'acumulada' && <VistaAcumulada />}

          {/* TAB: RANKING */}
          {tab === 'ranking' && <VistaRanking />}
        </div>
      </main>
    </div>
  );
}
