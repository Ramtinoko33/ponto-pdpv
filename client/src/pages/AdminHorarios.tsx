/**
 * AdminHorarios.tsx
 * Página de administração de horários personalizados por colaborador
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Clock, Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle2, Settings, UserX, UserCheck, ArrowLeft
} from 'lucide-react';

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Converte minutos (ex: 540) para string "HH:MM" */
function minToStr(min: number | null | undefined): string {
  if (min === null || min === undefined) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Converte string "HH:MM" para minutos (ex: 540). Retorna null se inválido. */
function strToMin(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Horários padrão para referência
const PADRAO = { en1: '08:30', sa1: '13:00', en2: '14:00', sa2: '18:30' };

// ─── Componente de linha de horário ──────────────────────────────────────────

interface LinhaHorario {
  id: number;
  numero: string;
  nome: string | null;
  en1: number | null;
  sa1: number | null;
  en2: number | null;
  sa2: number | null;
  observacoes: string | null;
}

interface LinhaEditorProps {
  horario: LinhaHorario;
  onSave: (data: Partial<LinhaHorario> & { recalcular: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
  saving: boolean;
}

function LinhaEditor({ horario, onSave, onDelete, saving }: LinhaEditorProps) {
  const [editando, setEditando] = useState(false);
  const [en1, setEn1] = useState(minToStr(horario.en1));
  const [sa1, setSa1] = useState(minToStr(horario.sa1));
  const [en2, setEn2] = useState(minToStr(horario.en2));
  const [sa2, setSa2] = useState(minToStr(horario.sa2));
  const [obs, setObs] = useState(horario.observacoes ?? '');
  const [recalcular, setRecalcular] = useState(true);

  const handleSave = async () => {
    const en1Min = en1 ? strToMin(en1) : null;
    const sa1Min = sa1 ? strToMin(sa1) : null;
    const en2Min = en2 ? strToMin(en2) : null;
    const sa2Min = sa2 ? strToMin(sa2) : null;

    if (en1 && en1Min === null) { toast.error('Hora de entrada inválida (use HH:MM)'); return; }
    if (sa1 && sa1Min === null) { toast.error('Hora de saída almoço inválida (use HH:MM)'); return; }
    if (en2 && en2Min === null) { toast.error('Hora de entrada tarde inválida (use HH:MM)'); return; }
    if (sa2 && sa2Min === null) { toast.error('Hora de saída final inválida (use HH:MM)'); return; }

    await onSave({
      numero: horario.numero,
      en1: en1 ? en1Min : null,
      sa1: sa1 ? sa1Min : null,
      en2: en2 ? en2Min : null,
      sa2: sa2 ? sa2Min : null,
      observacoes: obs || null,
      recalcular,
    });
    setEditando(false);
  };

  const handleCancel = () => {
    setEn1(minToStr(horario.en1));
    setSa1(minToStr(horario.sa1));
    setEn2(minToStr(horario.en2));
    setSa2(minToStr(horario.sa2));
    setObs(horario.observacoes ?? '');
    setEditando(false);
  };

  const temCustom = horario.en1 !== null || horario.sa1 !== null || horario.en2 !== null || horario.sa2 !== null;

  return (
    <div className={`border rounded-lg transition-all ${editando ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
            {horario.numero}
          </div>
          <div>
            <p className="text-sm font-semibold">{horario.nome ?? `Colaborador ${horario.numero}`}</p>
            {horario.observacoes && !editando && (
              <p className="text-xs text-muted-foreground">{horario.observacoes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editando && (
            <>
              {/* Resumo dos horários */}
              <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <span className={horario.en1 !== null ? 'text-primary font-bold' : ''}>{horario.en1 !== null ? minToStr(horario.en1) : PADRAO.en1}</span>
                <span className="text-border">·</span>
                <span className={horario.sa1 !== null ? 'text-primary font-bold' : ''}>{horario.sa1 !== null ? minToStr(horario.sa1) : PADRAO.sa1}</span>
                <span className="text-border">·</span>
                <span className={horario.en2 !== null ? 'text-primary font-bold' : ''}>{horario.en2 !== null ? minToStr(horario.en2) : PADRAO.en2}</span>
                <span className="text-border">·</span>
                <span className={horario.sa2 !== null ? 'text-primary font-bold' : ''}>{horario.sa2 !== null ? minToStr(horario.sa2) : PADRAO.sa2}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditando(true)} className="h-7 px-2 text-xs gap-1">
                <Settings className="w-3 h-3" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={saving}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Formulário de edição */}
      {editando && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '1ª Entrada', value: en1, set: setEn1, placeholder: PADRAO.en1, campo: 'EN1' },
              { label: 'Saída Almoço', value: sa1, set: setSa1, placeholder: PADRAO.sa1, campo: 'SA1' },
              { label: '2ª Entrada', value: en2, set: setEn2, placeholder: PADRAO.en2, campo: 'EN2' },
              { label: 'Saída Final', value: sa2, set: setSa2, placeholder: PADRAO.sa2, campo: 'SA2' },
            ].map(({ label, value, set, placeholder, campo }) => (
              <div key={campo} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <div className="relative">
                  <Input
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className={`h-8 text-sm font-mono text-center ${value && value !== placeholder ? 'border-primary/50 bg-primary/5' : ''}`}
                  />
                  {!value && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">padrão</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <Input
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Ex: Entrada às 09:00"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recalcular}
                onChange={e => setRecalcular(e.target.checked)}
                className="rounded border-border"
              />
              <RefreshCw className="w-3 h-3" />
              Recalcular saldos de todos os registos deste colaborador
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
                <Save className="w-3 h-3" />
                {saving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/60">
            Deixe um campo vazio para usar o horário padrão ({PADRAO.en1} / {PADRAO.sa1} / {PADRAO.en2} / {PADRAO.sa2}).
            Os valores personalizados aparecem a <span className="text-primary">azul</span>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Formulário de novo horário ───────────────────────────────────────────────

interface NovoHorarioFormProps {
  colaboradores: Array<{ numero: string; nome: string }>;
  numerosExistentes: Set<string>;
  onAdd: (data: { numero: string; nome: string; en1: number | null; sa1: number | null; en2: number | null; sa2: number | null; observacoes: string | null }) => Promise<void>;
  saving: boolean;
}

function NovoHorarioForm({ colaboradores, numerosExistentes, onAdd, saving }: NovoHorarioFormProps) {
  const [aberto, setAberto] = useState(false);
  const [numero, setNumero] = useState('');
  const [en1, setEn1] = useState('');
  const [sa1, setSa1] = useState('');
  const [en2, setEn2] = useState('');
  const [sa2, setSa2] = useState('');
  const [obs, setObs] = useState('');

  const colaboradoresDisponiveis = colaboradores.filter(c => !numerosExistentes.has(c.numero));

  const handleAdd = async () => {
    if (!numero) { toast.error('Selecione um colaborador'); return; }
    const en1Min = en1 ? strToMin(en1) : null;
    const sa1Min = sa1 ? strToMin(sa1) : null;
    const en2Min = en2 ? strToMin(en2) : null;
    const sa2Min = sa2 ? strToMin(sa2) : null;
    if (en1 && en1Min === null) { toast.error('Hora de entrada inválida'); return; }
    if (sa1 && sa1Min === null) { toast.error('Hora de saída almoço inválida'); return; }
    if (en2 && en2Min === null) { toast.error('Hora de entrada tarde inválida'); return; }
    if (sa2 && sa2Min === null) { toast.error('Hora de saída final inválida'); return; }

    const colab = colaboradores.find(c => c.numero === numero);
    await onAdd({ numero, nome: colab?.nome ?? '', en1: en1Min, sa1: sa1Min, en2: en2Min, sa2: sa2Min, observacoes: obs || null });
    setNumero(''); setEn1(''); setSa1(''); setEn2(''); setSa2(''); setObs('');
    setAberto(false);
  };

  if (!aberto) {
    return (
      <Button onClick={() => setAberto(true)} className="gap-2 w-full sm:w-auto" variant="outline">
        <Plus className="w-4 h-4" />
        Adicionar horário personalizado
      </Button>
    );
  }

  return (
    <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-4">
      <p className="text-sm font-semibold flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        Novo horário personalizado
      </p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Colaborador</label>
        <select
          value={numero}
          onChange={e => setNumero(e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Selecionar colaborador...</option>
          {colaboradoresDisponiveis.map(c => (
            <option key={c.numero} value={c.numero}>Nº{c.numero} — {c.nome}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '1ª Entrada', value: en1, set: setEn1, placeholder: PADRAO.en1 },
          { label: 'Saída Almoço', value: sa1, set: setSa1, placeholder: PADRAO.sa1 },
          { label: '2ª Entrada', value: en2, set: setEn2, placeholder: PADRAO.en2 },
          { label: 'Saída Final', value: sa2, set: setSa2, placeholder: PADRAO.sa2 },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <Input
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm font-mono text-center"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Observações (opcional)</label>
        <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Entrada às 09:00" className="h-8 text-sm" />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setAberto(false)} className="text-xs">Cancelar</Button>
        <Button size="sm" onClick={handleAdd} disabled={saving} className="text-xs gap-1">
          <Plus className="w-3 h-3" />
          {saving ? 'A adicionar...' : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

// ─── // ─── Secção de Excluídos ───────────────────────────────────────────────

interface SecaoExcluidosProps {
  colaboradores: Array<{ numero: string; nome: string }>;
}

function SecaoExcluidos({ colaboradores }: SecaoExcluidosProps) {
  const utils = trpc.useUtils();
  const [novoNumero, setNovoNumero] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [apagarRegistos, setApagarRegistos] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: excluidos, isLoading } = trpc.ponto.listarExcluidos.useQuery();

  const adicionar = trpc.ponto.adicionarExcluido.useMutation({
    onSuccess: (data) => {
      utils.ponto.listarExcluidos.invalidate();
      utils.ponto.getResumoMes.invalidate();
      const msg = data.registosApagados > 0
        ? `Colaborador excluído e ${data.registosApagados} registos removidos`
        : 'Colaborador adicionado à lista de excluídos';
      toast.success(msg);
      setNovoNumero(''); setNovoMotivo(''); setAdicionando(false); setSaving(false);
    },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setSaving(false); },
  });

  const remover = trpc.ponto.removerExcluido.useMutation({
    onSuccess: () => {
      utils.ponto.listarExcluidos.invalidate();
      toast.success('Colaborador removido da lista de excluídos');
      setSaving(false);
    },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setSaving(false); },
  });

  const apagarRegistosMut = trpc.ponto.apagarRegistosExcluido.useMutation({
    onSuccess: (data) => {
      utils.ponto.getResumoMes.invalidate();
      const msg = data.registosApagados > 0
        ? `${data.registosApagados} registos apagados com sucesso`
        : 'Nenhum registo encontrado para este colaborador';
      toast.success(msg);
      setSaving(false);
    },
    onError: (e) => { toast.error(`Erro: ${e.message}`); setSaving(false); },
  });

  const handleApagarRegistos = async (numero: string, nome: string | null) => {
    if (!confirm(`Apagar TODOS os registos de Nº${numero} ${nome ? `(${nome})` : ''}?\n\n⚠️ Esta ação é permanente e não pode ser desfeita.`)) return;
    setSaving(true);
    await apagarRegistosMut.mutateAsync({ numero });
  };

  const handleAdicionar = async () => {
    if (!novoNumero) { toast.error('Selecione um colaborador'); return; }
    const colab = colaboradores.find(c => c.numero === novoNumero);
    const confirmMsg = apagarRegistos
      ? `Excluir Nº${novoNumero} ${colab?.nome ? `(${colab.nome})` : ''}?\n\n⚠️ Os registos existentes na BD serão APAGADOS permanentemente.\nEsta ação não pode ser desfeita.`
      : `Excluir Nº${novoNumero} ${colab?.nome ? `(${colab.nome})` : ''}?\n\nOs registos existentes serão mantidos, mas este colaborador não aparecerá em futuros uploads.`;
    if (!confirm(confirmMsg)) return;
    setSaving(true);
    await adicionar.mutateAsync({ numero: novoNumero, nome: colab?.nome ?? null, motivo: novoMotivo || null, apagarRegistos });
  };

  const handleRemover = async (numero: string, nome: string | null) => {
    if (!confirm(`Remover Nº${numero} ${nome ? `(${nome})` : ''} da lista de excluídos?\nEste colaborador voltará a aparecer nos próximos uploads.`)) return;
    setSaving(true);
    await remover.mutateAsync({ numero });
  };

  const numerosExcluidos = new Set((excluidos ?? []).map(e => e.numero));
  const colaboradoresDisponiveis = colaboradores.filter(c => !numerosExcluidos.has(c.numero));

  return (
    <div className="space-y-4">
      {/* Título da secção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserX className="w-4 h-4 text-destructive" />
          <h2 className="text-sm font-semibold">Colaboradores Excluídos</h2>
        </div>
        {(excluidos?.length ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground">{excluidos!.length} excluídos</span>
        )}
      </div>

      <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground">
        Colaboradores nesta lista são <strong>ignorados no processamento</strong> de novos ficheiros.
        Os registos já existentes na BD não são afetados.
      </div>

      {/* Lista de excluídos */}
      {isLoading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">A carregar...</div>
      ) : (excluidos?.length ?? 0) === 0 ? (
        <div className="py-6 text-center space-y-2">
          <UserCheck className="w-7 h-7 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum colaborador excluído.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {excluidos!.map(e => (
            <div key={e.numero} className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-xs font-mono font-bold text-destructive">
                  {e.numero}
                </div>
                <div>
                  <p className="text-sm font-medium">{e.nome ?? `Colaborador Nº${e.numero}`}</p>
                  {e.motivo && <p className="text-xs text-muted-foreground">{e.motivo}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApagarRegistos(e.numero, e.nome)}
                  disabled={saving}
                  title="Apagar todos os registos deste colaborador da BD"
                  className="h-7 px-2 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                >
                  <Trash2 className="w-3 h-3" />
                  Apagar registos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemover(e.numero, e.nome)}
                  disabled={saving}
                  title="Remover da lista de excluídos (volta a aparecer em futuros uploads)"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reativar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de adicionar */}
      {!adicionando ? (
        <Button variant="outline" size="sm" onClick={() => setAdicionando(true)} className="gap-2 text-xs w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/5">
          <Plus className="w-3.5 h-3.5" />
          Adicionar colaborador à lista de excluídos
        </Button>
      ) : (
        <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5 space-y-3">
          <p className="text-xs font-semibold text-destructive flex items-center gap-2">
            <UserX className="w-3.5 h-3.5" />
            Excluir colaborador
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Colaborador</label>
            <select
              value={novoNumero}
              onChange={e => setNovoNumero(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecionar colaborador...</option>
              {colaboradoresDisponiveis.map(c => (
                <option key={c.numero} value={c.numero}>Nº{c.numero} — {c.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
            <Input
              value={novoMotivo}
              onChange={e => setNovoMotivo(e.target.value)}
              placeholder="Ex: Colaborador externo, conta de sistema..."
              className="h-8 text-sm"
            />
          </div>

          {/* Opção de apagar registos existentes */}
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={apagarRegistos}
                onChange={e => setApagarRegistos(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <div>
                <p className="text-xs font-semibold text-destructive">Apagar registos existentes na BD</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {apagarRegistos
                    ? '⚠️ Os registos deste colaborador serão removidos permanentemente. O colaborador desaparecerá imediatamente de todas as vistas.'
                    : 'Os registos existentes serão mantidos. O colaborador continuará visível, mas não aparecerá em futuros uploads.'
                  }
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAdicionando(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleAdicionar} disabled={saving} className="text-xs gap-1 bg-destructive hover:bg-destructive/90 text-white">
              <UserX className="w-3 h-3" />
              {saving ? 'A guardar...' : 'Excluir colaborador'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────

export default function AdminHorarios() {
  const utils = trpc.useUtils();
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: horarios, isLoading: loadingHorarios } = trpc.ponto.listarHorariosCustom.useQuery();
  const { data: colaboradores, isLoading: loadingColab } = trpc.ponto.listarColaboradores.useQuery();

  const upsert = trpc.ponto.upsertHorarioCustom.useMutation({
    onSuccess: (data) => {
      utils.ponto.listarHorariosCustom.invalidate();
      utils.ponto.getResumoMes.invalidate();
      utils.ponto.getResumoAcumulado.invalidate();
      if (data.recalculados > 0) {
        toast.success(`Horário guardado e ${data.recalculados} registos recalculados`);
      } else {
        toast.success('Horário guardado com sucesso');
      }
      setSavingId(null);
    },
    onError: (e) => {
      toast.error(`Erro: ${e.message}`);
      setSavingId(null);
    },
  });

  const apagar = trpc.ponto.apagarHorarioCustom.useMutation({
    onSuccess: () => {
      utils.ponto.listarHorariosCustom.invalidate();
      toast.success('Horário personalizado removido');
      setSavingId(null);
    },
    onError: (e) => {
      toast.error(`Erro: ${e.message}`);
      setSavingId(null);
    },
  });

  const handleSave = async (data: any) => {
    setSavingId(data.numero);
    await upsert.mutateAsync(data);
  };

  const handleDelete = async (numero: string) => {
    if (!confirm(`Remover horário personalizado do colaborador Nº${numero}? Voltará a usar o horário padrão.`)) return;
    setSavingId(numero);
    await apagar.mutateAsync({ numero });
  };

  const handleAdd = async (data: any) => {
    setSavingId(data.numero);
    await upsert.mutateAsync({ ...data, recalcular: false });
  };

  const numerosExistentes = new Set((horarios ?? []).map(h => h.numero));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded hover:bg-card transition-colors text-muted-foreground hover:text-foreground" title="Voltar ao início">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Horários Personalizados</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Administração · Pneus D. Pedro V</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-3xl">

        {/* Aviso informativo */}
        <div className="p-4 rounded-lg border border-border bg-card/30 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Como funciona</p>
          <p className="text-sm text-muted-foreground">
            Por defeito, todos os colaboradores têm o horário padrão: <span className="font-mono text-foreground">08:30 · 13:00 · 14:00 · 18:30</span>.
            Aqui pode definir horários diferentes para colaboradores específicos.
            Ao guardar com a opção de recálculo ativa, todos os registos existentes são atualizados automaticamente.
          </p>
        </div>

        {/* Horários existentes */}
        {loadingHorarios ? (
          <div className="py-8 text-center text-sm text-muted-foreground">A carregar...</div>
        ) : (horarios?.length ?? 0) === 0 ? (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum horário personalizado definido.</p>
            <p className="text-xs text-muted-foreground/60">Todos os colaboradores usam o horário padrão (08:30–18:30).</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {horarios!.length} {horarios!.length === 1 ? 'horário personalizado' : 'horários personalizados'}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span>Valores <span className="text-primary font-medium">azuis</span> = personalizados</span>
              </div>
            </div>
            {horarios!.map(h => (
              <LinhaEditor
                key={h.numero}
                horario={h}
                onSave={handleSave}
                onDelete={() => handleDelete(h.numero)}
                saving={savingId === h.numero}
              />
            ))}
          </div>
        )}

        {/* Formulário de novo horário */}
        {!loadingColab && colaboradores && (
          <NovoHorarioForm
            colaboradores={colaboradores}
            numerosExistentes={numerosExistentes}
            onAdd={handleAdd}
            saving={savingId !== null}
          />
        )}

        {/* Separador */}
        <div className="border-t border-border pt-6" />

        {/* Secção de Excluídos */}
        {!loadingColab && colaboradores && (
          <SecaoExcluidos colaboradores={colaboradores} />
        )}

        {/* Separador */}
        <div className="border-t border-border pt-2" />

        {/* Tabela de referência */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Horário padrão (referência)</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: '1ª Entrada', valor: '08:30', desc: 'Hora esperada de entrada' },
                { label: 'Saída Almoço', valor: '13:00', desc: 'Início do almoço' },
                { label: '2ª Entrada', valor: '14:00', desc: 'Regresso do almoço' },
                { label: 'Saída Final', valor: '18:30', desc: 'Fim do dia' },
              ].map(({ label, valor, desc }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-mono font-bold">{valor}</p>
                  <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
