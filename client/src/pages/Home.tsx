/**
 * PÁGINA PRINCIPAL — Sistema de Picagem de Ponto
 * Design: Dark Command Center
 * Fontes: Space Grotesk (UI) + Space Mono (valores de tempo)
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  parseHtmlFile,
  processAll,
  calcularEstatisticas,
  exportToCsv,
  type ProcessedRow,
  type Stats,
} from '@/lib/pontoProcessor';
import { ResultsTable } from '@/components/ResultsTable';
import { StatsCards } from '@/components/StatsCards';
import { ColaboradoresPanel } from '@/components/ColaboradoresPanel';
import { Upload, FileText, Download, RefreshCw, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'tabela' | 'colaboradores'>('tabela');
  const [filterNome, setFilterNome] = useState('');
  const [filterData, setFilterData] = useState('');
  const [showAutoOnly, setShowAutoOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseHtmlFile(text);

      if (parsed.length === 0) {
        toast.error('Nenhum dado encontrado no ficheiro. Verifique o formato.');
        setIsProcessing(false);
        return;
      }

      // Simular pequeno delay para efeito visual
      await new Promise(r => setTimeout(r, 600));

      const processed = processAll(parsed);
      const statistics = calcularEstatisticas(processed);

      setRows(processed);
      setStats(statistics);
      setFilterNome('');
      setFilterData('');
      setShowAutoOnly(false);

      toast.success(`${parsed.length} registos processados com sucesso`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar o ficheiro. Verifique se é um ficheiro HTML/XLS válido.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleExport = useCallback(() => {
    if (!rows.length) return;
    const csv = exportToCsv(rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ponto_processado_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ficheiro exportado com sucesso');
  }, [rows]);

  const handleReset = useCallback(() => {
    setRows([]);
    setStats(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Filtrar linhas para a tabela
  const filteredRows = rows.filter(r => {
    if (r.ignorada) return false;
    if (filterNome && !r.nome.toLowerCase().includes(filterNome.toLowerCase())) return false;
    if (filterData && !r.data.includes(filterData)) return false;
    if (showAutoOnly && !r.en1Auto && !r.sa1Auto && !r.en2Auto && !r.sa2Auto) return false;
    return true;
  });

  // Nomes únicos para autocomplete
  const nomesUnicos = Array.from(new Set(rows.map(r => r.nome))).sort();

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">Picagem de Ponto</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">Pneus D. Pedro V</p>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2 text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                Novo ficheiro
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                className="gap-2 text-xs"
              >
                <Download className="w-3 h-3" />
                Exportar CSV
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container py-6 space-y-6">

        {/* ZONA DE UPLOAD */}
        {rows.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Legenda de regras */}
            <div className="mb-6 p-4 rounded-lg border border-border bg-card/30 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Regras aplicadas automaticamente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: '🗑️', text: 'Domingos e folgas (FIMS) são ignorados' },
                  { icon: '📅', text: 'Sábados: 08:30–13:00 (1 turno)' },
                  { icon: '📝', text: 'Com justificação: sem preenchimento auto' },
                  { icon: '⚡', text: 'Células vazias: EN1=08:30 SA1=13:00 EN2=14:00 SA2=18:30' },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span>{r.icon}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Cálculo do saldo:</span> entrada antes da hora não conta; entrada depois desconta; saída depois conta como positivo; almoço calculado entre SA1 e EN2 (esperado 60 min).
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                isDragOver
                  ? 'border-primary bg-primary/5 drag-active'
                  : 'border-border hover:border-primary/50 hover:bg-card/50'
              } ${isProcessing ? 'pointer-events-none' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.htm,.html"
                className="hidden"
                onChange={handleFileInput}
              />

              {isProcessing ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <div>
                    <p className="text-sm font-medium">A processar ficheiro...</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{fileName}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">Arraste o ficheiro aqui</p>
                    <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground font-mono mt-3 opacity-60">
                      Formatos aceites: .xls · .xlsx · .htm · .html
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESULTADOS */}
        {rows.length > 0 && stats && (
          <>
            {/* Ficheiro carregado */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-mono">{fileName}</span>
              <span className="text-border">·</span>
              <span>{stats.totalDias} registos totais</span>
            </div>

            {/* Cards de estatísticas */}
            <StatsCards stats={stats} />

            {/* Legenda de cores */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground font-medium">Legenda:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Saldo positivo</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Saldo negativo</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Preenchido automaticamente</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Com justificação</span>
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {[
                { id: 'tabela', label: 'Registos diários', icon: <Clock className="w-3.5 h-3.5" /> },
                { id: 'colaboradores', label: 'Por colaborador', icon: <Users className="w-3.5 h-3.5" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Registos diários */}
            {activeTab === 'tabela' && (
              <div className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={filterNome}
                      onChange={e => setFilterNome(e.target.value)}
                      list="nomes-list"
                      className="h-8 pl-3 pr-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
                    />
                    <datalist id="nomes-list">
                      {nomesUnicos.map(n => <option key={n} value={n} />)}
                    </datalist>
                  </div>
                  <input
                    type="text"
                    placeholder="Filtrar por data (ex: 02/02)"
                    value={filterData}
                    onChange={e => setFilterData(e.target.value)}
                    className="h-8 pl-3 pr-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showAutoOnly}
                      onChange={e => setShowAutoOnly(e.target.checked)}
                      className="rounded border-border"
                    />
                    Só preenchimento automático
                  </label>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">
                    {filteredRows.length} registos
                  </span>
                </div>

                {filteredRows.length === 0 ? (
                  <div className="py-16 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum registo corresponde aos filtros</p>
                  </div>
                ) : (
                  <ResultsTable rows={filteredRows} />
                )}
              </div>
            )}

            {/* Tab: Por colaborador */}
            {activeTab === 'colaboradores' && (
              <ColaboradoresPanel stats={stats} rows={rows} />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border mt-12 py-4">
        <div className="container text-center text-xs text-muted-foreground font-mono">
          Pneus D. Pedro V · Sistema de Picagem de Ponto
        </div>
      </footer>
    </div>
  );
}
