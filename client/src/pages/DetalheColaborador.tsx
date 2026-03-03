/**
 * DetalheColaborador.tsx
 * Vista de detalhe completo de um colaborador num mês específico.
 * Mostra todas as picagens diárias com edição inline e recálculo automático.
 */

import React, { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, User, Edit3, Check, X, AlertTriangle,
  Clock, Coffee, LogOut, Zap, Calendar, ChevronDown,
  Save, RotateCcw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Utilitários ──────────────────────────────────────────────────────────────

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
  if (min > 0) return "text-emerald-500";
  if (min < 0) return "text-red-500";
  return "text-muted-foreground";
}

// Validar formato HH:MM
function validarHora(val: string): boolean {
  if (!val || val.trim() === "") return true; // vazio é válido
  return /^\d{1,2}:\d{2}$/.test(val.trim());
}

// ─── Componente de célula editável ────────────────────────────────────────────

interface CelulaEditavelProps {
  valor: string | null;
  isAuto: boolean;
  isEditing: boolean;
  editValue: string;
  onChange: (v: string) => void;
  label: string;
}

function CelulaEditavel({ valor, isAuto, isEditing, editValue, onChange, label }: CelulaEditavelProps) {
  const isValido = validarHora(editValue);

  if (isEditing) {
    return (
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          placeholder="HH:MM"
          aria-label={label}
          className={`w-20 h-7 px-2 text-xs font-mono rounded border text-center focus:outline-none focus:ring-1 ${
            isValido
              ? "border-primary/50 bg-primary/5 focus:ring-primary text-foreground"
              : "border-red-500/50 bg-red-500/5 focus:ring-red-500 text-red-400"
          }`}
        />
      </td>
    );
  }

  return (
    <td className="px-2 py-1.5 text-center">
      {valor ? (
        <span className={`font-mono text-xs px-2 py-0.5 rounded ${
          isAuto
            ? "bg-amber-400/15 text-amber-600 dark:text-amber-300 italic border border-amber-400/20"
            : "text-foreground"
        }`}>
          {valor}
        </span>
      ) : (
        <span className="text-muted-foreground/40 text-xs">—</span>
      )}
    </td>
  );
}

// ─── Linha de registo com edição inline ───────────────────────────────────────

interface LinhaRegistoEditavelProps {
  registo: any;
  onSaved: () => void;
}

function LinhaRegistoEditavel({ registo: r, onSaved }: LinhaRegistoEditavelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState({
    en1: r.en1 ?? "",
    sa1: r.sa1 ?? "",
    en2: r.en2 ?? "",
    sa2: r.sa2 ?? "",
  });

  const utils = trpc.useUtils();
  const atualizarMut = trpc.ponto.atualizarPicagens.useMutation({
    onSuccess: (data) => {
      toast.success(`Registo guardado — saldo: ${fmtMin(data.saldo)}`);
      setSaving(false);
      setEditing(false);
      onSaved();
    },
    onError: (e) => {
      toast.error(`Erro ao guardar: ${e.message}`);
      setSaving(false);
    },
  });

  const handleEdit = () => {
    setVals({
      en1: r.en1 ?? "",
      sa1: r.sa1 ?? "",
      en2: r.en2 ?? "",
      sa2: r.sa2 ?? "",
    });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = () => {
    // Validar todos os campos
    const campos = [vals.en1, vals.sa1, vals.en2, vals.sa2];
    if (campos.some(v => !validarHora(v))) {
      toast.error("Formato inválido. Use HH:MM (ex: 08:30)");
      return;
    }
    setSaving(true);
    atualizarMut.mutate({
      id: r.id,
      en1: vals.en1.trim() || null,
      sa1: vals.sa1.trim() || null,
      en2: vals.en2.trim() || null,
      sa2: vals.sa2.trim() || null,
    });
  };

  const isJust = !!r.justificacao;
  const isSab = r.diaSemana === "SÁB" || r.diaSemana === "SAB";
  const isEdited = r.cenario === "EDIT";

  return (
    <tr className={`border-b border-border/40 transition-colors ${
      editing ? "bg-primary/5" : isJust ? "bg-blue-500/5" : "hover:bg-card/50"
    }`}>
      {/* Data */}
      <td className="px-3 py-1.5 whitespace-nowrap">
        <span className="font-mono text-xs text-foreground">{r.data?.split(" ")[0]?.slice(0, 5)}</span>
        <span className={`ml-1.5 text-[10px] font-medium uppercase ${isSab ? "text-blue-400" : "text-muted-foreground/60"}`}>
          {r.diaSemana}
        </span>
      </td>

      {/* Picagens ou justificação */}
      {isJust ? (
        <td colSpan={4} className="px-2 py-1.5">
          <span className="text-xs text-sky-500 italic">{r.justificacao}</span>
        </td>
      ) : (
        <>
          <CelulaEditavel
            label="1ª Entrada"
            valor={r.en1}
            isAuto={!!r.en1Auto}
            isEditing={editing}
            editValue={vals.en1}
            onChange={v => setVals(p => ({ ...p, en1: v }))}
          />
          <CelulaEditavel
            label="1ª Saída"
            valor={r.sa1}
            isAuto={!!r.sa1Auto}
            isEditing={editing}
            editValue={vals.sa1}
            onChange={v => setVals(p => ({ ...p, sa1: v }))}
          />
          <CelulaEditavel
            label="2ª Entrada"
            valor={r.en2}
            isAuto={!!r.en2Auto}
            isEditing={editing}
            editValue={vals.en2}
            onChange={v => setVals(p => ({ ...p, en2: v }))}
          />
          <CelulaEditavel
            label="2ª Saída"
            valor={r.sa2}
            isAuto={!!r.sa2Auto}
            isEditing={editing}
            editValue={vals.sa2}
            onChange={v => setVals(p => ({ ...p, sa2: v }))}
          />
        </>
      )}

      {/* Saldo */}
      <td className="px-2 py-1.5 text-center">
        {r.saldo !== null && !isJust ? (
          <span className={`font-mono text-xs font-semibold ${saldoColor(r.saldo)}`}>
            {fmtMin(r.saldo)}
          </span>
        ) : isJust ? null : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        )}
      </td>

      {/* Cenário */}
      <td className="px-2 py-1.5 text-center">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          isEdited ? "bg-purple-500/15 text-purple-400" :
          r.cenario === "JUST" ? "bg-sky-500/15 text-sky-400" :
          r.cenario === "DOM" ? "bg-zinc-500/15 text-zinc-400" :
          "bg-muted/50 text-muted-foreground"
        }`}>
          {r.cenario ?? "—"}
        </span>
      </td>

      {/* Detalhe */}
      <td className="px-2 py-1.5 text-xs text-muted-foreground max-w-[220px] truncate hidden lg:table-cell" title={r.detalhe ?? ""}>
        {r.detalhe}
      </td>

      {/* Ações */}
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        {isJust ? null : editing ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-3 h-3 rounded-full border border-emerald-500 border-t-transparent animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Guardar
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ml-auto"
          >
            <Edit3 className="w-3 h-3" />
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetalheColaborador() {
  const params = useParams<{ numero: string; mesId: string }>();
  const [, navigate] = useLocation();

  const numero = params.numero ?? "";
  const mesId = params.mesId ? parseInt(params.mesId) : 0;

  const utils = trpc.useUtils();

  // Dados do mês e do colaborador
  const { data: meses = [] } = trpc.ponto.listarMeses.useQuery();
  const { data: registos = [], isLoading, refetch } = trpc.ponto.getDetalheColaborador.useQuery(
    { numero, mesId },
    { enabled: !!numero && !!mesId }
  );

  const mesSel = meses.find(m => m.id === mesId);
  const nomeColab = registos[0]?.nome ?? numero;

  // Calcular totais do mês
  const registosValidos = registos.filter(r => !r.justificacao && r.saldo !== null);
  const totSaldo = registosValidos.reduce((a, r) => a + (r.saldo ?? 0), 0);
  const totAtraso = registosValidos.reduce((a, r) => a + r.atrasoEn, 0);
  const totAlm = registosValidos.reduce((a, r) => a + r.excessoAlm, 0);
  const totCedo = registosValidos.reduce((a, r) => a + r.saidaCedo, 0);
  const totExtra = registosValidos.reduce((a, r) => a + r.extraSa, 0);
  const celulasAuto = registosValidos.reduce((a, r) =>
    a + (r.en1Auto ? 1 : 0) + (r.sa1Auto ? 1 : 0) + (r.en2Auto ? 1 : 0) + (r.sa2Auto ? 1 : 0), 0);
  const diasJust = registos.filter(r => !!r.justificacao).length;

  const handleSaved = useCallback(() => {
    refetch();
    utils.ponto.getResumoMes.invalidate({ mesId });
    utils.ponto.getPerfilColaborador.invalidate({ numero });
  }, [refetch, utils, mesId, numero]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">A carregar registos...</p>
        </div>
      </div>
    );
  }

  if (!registos.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-foreground font-medium">Nenhum registo encontrado</p>
          <p className="text-sm text-muted-foreground">
            Colaborador Nº {numero} não tem registos no mês selecionado.
          </p>
          <button onClick={() => navigate(-1 as any)} className="text-sm text-primary hover:underline">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20 px-6 py-3">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1 as any)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>/</span>
            <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Início</button>
            <span>/</span>
            <button onClick={() => navigate(`/colaborador/${numero}`)} className="hover:text-foreground transition-colors">
              {nomeColab}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{mesSel?.label ?? `Mês ${mesId}`}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Cabeçalho do colaborador */}
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{nomeColab}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Nº {numero} · {mesSel?.label ?? `Mês ${mesId}`} · {registosValidos.length} dias trabalhados
              {diasJust > 0 && ` · ${diasJust} justificados`}
            </p>
          </div>
          <div className={`text-right px-4 py-2 rounded-xl border ${
            totSaldo > 0 ? "bg-emerald-500/10 border-emerald-500/20" :
            totSaldo < 0 ? "bg-red-500/10 border-red-500/20" :
            "bg-muted/50 border-border"
          }`}>
            <p className="text-xs text-muted-foreground mb-0.5">Saldo do Mês</p>
            <p className={`font-mono font-bold text-xl ${saldoColor(totSaldo)}`}>
              {fmtMin(totSaldo)}
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: <Clock className="w-4 h-4 text-red-500" />, label: "Atrasos Entrada", value: totAtraso > 0 ? fmtMinAbs(totAtraso) : "—", color: "text-red-500" },
            { icon: <Coffee className="w-4 h-4 text-orange-500" />, label: "Excesso Almoço", value: totAlm > 0 ? fmtMinAbs(totAlm) : "—", color: "text-orange-500" },
            { icon: <LogOut className="w-4 h-4 text-red-500" />, label: "Saída Antecipada", value: totCedo > 0 ? fmtMinAbs(totCedo) : "—", color: "text-red-500" },
            { icon: <Zap className="w-4 h-4 text-emerald-500" />, label: "Horas Extra", value: totExtra > 0 ? fmtMinAbs(totExtra) : "—", color: "text-emerald-500" },
            { icon: <Calendar className="w-4 h-4 text-sky-500" />, label: "Dias Justificados", value: diasJust > 0 ? String(diasJust) : "—", color: "text-sky-500" },
            { icon: <Info className="w-4 h-4 text-amber-500" />, label: "Células Auto", value: celulasAuto > 0 ? String(celulasAuto) : "—", color: "text-amber-500" },
          ].map((c) => (
            <Card key={c.label} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {c.icon}
                  <span className="text-[10px] text-muted-foreground leading-tight">{c.label}</span>
                </div>
                <p className={`font-mono font-bold text-base ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
          <span className="font-medium text-foreground">Legenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-amber-400/30 border border-amber-400/40" />
            Preenchido automaticamente (itálico)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-sky-500/20 border border-sky-500/30" />
            Dia justificado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
            Editado manualmente
          </span>
          <span className="flex items-center gap-1.5">
            <Edit3 className="w-3 h-3" />
            Clique em "Editar" para alterar picagens
          </span>
        </div>

        {/* Tabela principal */}
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Data</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">1ª Entrada</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">1ª Saída</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">2ª Entrada</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">2ª Saída</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Saldo</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Cenário</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Detalhe</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registos.map((r) => (
                  <LinhaRegistoEditavel
                    key={r.id}
                    registo={r}
                    onSaved={handleSaved}
                  />
                ))}
              </tbody>
              {/* Linha de totais */}
              <tfoot>
                <tr className="bg-card border-t-2 border-border font-bold">
                  <td className="px-3 py-2.5 text-xs font-bold text-foreground">TOTAL</td>
                  <td colSpan={4} className="px-2 py-2.5 text-center text-xs text-muted-foreground">
                    {registosValidos.length} dias · {celulasAuto} células auto
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`font-mono text-sm font-bold ${saldoColor(totSaldo)}`}>
                      {fmtMin(totSaldo)}
                    </span>
                  </td>
                  <td colSpan={3} className="px-2 py-2.5 text-xs text-muted-foreground">
                    {totAtraso > 0 && <span className="text-red-500 mr-3">Atrasos: -{fmtMinAbs(totAtraso)}</span>}
                    {totAlm > 0 && <span className="text-orange-500 mr-3">Almoço: -{fmtMinAbs(totAlm)}</span>}
                    {totExtra > 0 && <span className="text-emerald-500">Extra: +{fmtMinAbs(totExtra)}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-0.5">Edição manual de picagens</p>
            <p className="text-amber-600/80 dark:text-amber-400/80">
              Ao editar uma célula, o saldo é recalculado automaticamente com base nos novos valores.
              As células editadas manualmente deixam de ser marcadas como automáticas.
              Use o formato <strong>HH:MM</strong> (ex: 08:30, 13:00, 18:45).
              Deixe em branco para remover uma picagem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
