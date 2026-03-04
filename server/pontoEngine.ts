/**
 * pontoEngine.ts
 * Lógica de processamento de picagem de ponto — versão servidor
 * Todas as regras acordadas com o utilizador estão aqui.
 */

import * as XLSX from "xlsx";

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
const EN1_ESP = 8 * 60 + 30;   // 08:30
const SA1_ESP = 13 * 60;        // 13:00
const EN2_ESP = 14 * 60;        // 14:00
const SA2_ESP = 18 * 60 + 30;   // 18:30
const ALMOCO  = 60;             // minutos de almoço padrão

const SAIDA_MIN = 17 * 60;      // 17:00 — início da janela de saída final
const SAIDA_MAX = 20 * 60;      // 20:00

// Colaboradores a excluir
const EXCLUIR_NUMEROS = new Set(['97', '98', '99', '100', '67', '53', '33']);

// Horários personalizados por número de colaborador (fallback hardcoded)
// Estes são usados apenas quando não é passado um mapa externo (ex: no upload inicial)
const HORARIOS_CUSTOM_DEFAULT: Record<string, { en1?: number; sa1?: number; en2?: number; sa2?: number }> = {
  '12': { en1: 9 * 60 },        // Pedro Silva — entrada 09:00
  '29': { en1: 9 * 60 },        // Patricia — entrada 09:00
};

export type MapaHorarios = Record<string, { en1?: number; sa1?: number; en2?: number; sa2?: number }>;

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────
function toMin(s: string | null | undefined): number | null {
  if (!s) return null;
  const clean = String(s).trim().replace(/[—–-]/, '');
  if (!clean || clean === '' || clean === 'None') return null;
  const m = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function fmtTime(m: number): string {
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.abs(m) % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function isSaidaFinal(m: number | null): boolean {
  return m !== null && m >= SAIDA_MIN && m <= SAIDA_MAX;
}

// ─── PREENCHIMENTO AUTOMÁTICO ─────────────────────────────────────────────
function preencherAutomatico(
  en1Raw: string | null, sa1Raw: string | null,
  en2Raw: string | null, sa2Raw: string | null,
  isSabado: boolean, numStr: string,
  mapaExterno?: MapaHorarios
): {
  en1: string | null; sa1: string | null;
  en2: string | null; sa2: string | null;
  en1Auto: boolean; sa1Auto: boolean;
  en2Auto: boolean; sa2Auto: boolean;
  cenario: string;
} {
  const custom = (mapaExterno ?? HORARIOS_CUSTOM_DEFAULT)[numStr] || {};
  const en1Esp = custom.en1 ?? EN1_ESP;

  let en1m = toMin(en1Raw);
  let sa1m = toMin(sa1Raw);
  let en2m = toMin(en2Raw);
  let sa2m = toMin(sa2Raw);

  let en1a = false, sa1a = false, en2a = false, sa2a = false;

  if (isSabado) {
    // Sábado: 1 turno — detetar saída mal posicionada
    if (en2m !== null && isSaidaFinal(en2m) && sa1m === null) {
      sa1Raw = fmtTime(en2m); en2Raw = null; sa1m = en2m; en2m = null;
    }
    // EN1 com valor >= 12:00 e SA1 vazio → EN1 é saída
    const SAB_SAIDA_MIN = 12 * 60;
    if (en1m !== null && en1m >= SAB_SAIDA_MIN && sa1m === null) {
      sa1Raw = fmtTime(en1m); sa1m = en1m;
      en1Raw = fmtTime(en1Esp); en1a = true; en1m = en1Esp;
    }
    if (en1m === null) { en1Raw = fmtTime(en1Esp); en1a = true; }
    if (toMin(sa1Raw) === null) { sa1Raw = '13:00'; sa1a = true; }
    return { en1: en1Raw, sa1: sa1Raw, en2: null, sa2: null, en1Auto: en1a, sa1Auto: sa1a, en2Auto: false, sa2Auto: false, cenario: 'SAB' };
  }

  // SA2 correta (17-20h)
  if (sa2m !== null && isSaidaFinal(sa2m)) {
    if (en2m === null && sa1m !== null) {
      return { en1: en1Raw, sa1: sa1Raw, en2: fmtTime(sa1m + ALMOCO), sa2: sa2Raw, en1Auto: false, sa1Auto: false, en2Auto: true, sa2Auto: false, cenario: 'C' };
    }
    if (en1m === null) {
      return { en1: fmtTime(en1Esp), sa1: sa1Raw, en2: en2Raw, sa2: sa2Raw, en1Auto: true, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'E' };
    }
    if (en1m !== null && sa1m !== null && en2m !== null) {
      return { en1: en1Raw, sa1: sa1Raw, en2: en2Raw, sa2: sa2Raw, en1Auto: false, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'A' };
    }
  }

  // Saída final mal posicionada (17-20h numa coluna errada)
  const allVals: Array<{ col: string; m: number; raw: string }> = [];
  if (en1m !== null) allVals.push({ col: 'en1', m: en1m, raw: en1Raw! });
  if (sa1m !== null) allVals.push({ col: 'sa1', m: sa1m, raw: sa1Raw! });
  if (en2m !== null) allVals.push({ col: 'en2', m: en2m, raw: en2Raw! });
  if (sa2m !== null) allVals.push({ col: 'sa2', m: sa2m, raw: sa2Raw! });

  const saidasFinais = allVals.filter(v => isSaidaFinal(v.m));
  if (saidasFinais.length > 0 && (sa2m === null || !isSaidaFinal(sa2m))) {
    const sa2FinalM = Math.max(...saidasFinais.map(v => v.m));
    const sa2Final = fmtTime(sa2FinalM);
    const reais = allVals.filter(v => !isSaidaFinal(v.m)).sort((a, b) => a.m - b.m);
    const EN1_LIMITE = 10 * 60;
    const entradasManha = reais.filter(v => v.m < EN1_LIMITE);
    const outrosReais   = reais.filter(v => v.m >= EN1_LIMITE);

    let en1Final: string; let en1aa = false;
    let sa1Real: string | null; let sa1aa = false;
    let en2Real: string | null; let en2aa = false;

    if (entradasManha.length > 0) {
      en1Final = entradasManha[0].raw;
      sa1Real = outrosReais[0]?.raw ?? null;
      en2Real = outrosReais[1]?.raw ?? null;
    } else {
      en1Final = fmtTime(en1Esp); en1aa = true;
      sa1Real = reais[0]?.raw ?? null;
      en2Real = reais[1]?.raw ?? null;
    }
    if (!sa1Real) { sa1Real = '13:00'; sa1aa = true; }
    if (!en2Real) {
      const sa1Calc = toMin(sa1Real);
      en2Real = sa1Calc !== null ? fmtTime(sa1Calc + ALMOCO) : '14:00';
      en2aa = true;
    }
    return { en1: en1Final, sa1: sa1Real, en2: en2Real, sa2: sa2Final, en1Auto: en1aa, sa1Auto: sa1aa, en2Auto: en2aa, sa2Auto: false, cenario: 'SF' };
  }

  // Tudo vazio
  if (en1m === null && sa1m === null && en2m === null && sa2m === null) {
    return { en1: fmtTime(en1Esp), sa1: '13:00', en2: '14:00', sa2: '18:30', en1Auto: true, sa1Auto: true, en2Auto: true, sa2Auto: true, cenario: 'D' };
  }

  // EN1+SA1 preenchidos, EN2+SA2 vazios, SA1 >= 14:00
  if (en1m !== null && sa1m !== null && en2m === null && sa2m === null) {
    if (sa1m >= 14 * 60) {
      return { en1: en1Raw, sa1: fmtTime(SA1_ESP), en2: fmtTime(EN2_ESP), sa2: fmtTime(sa1m), en1Auto: false, sa1Auto: true, en2Auto: true, sa2Auto: false, cenario: 'B' };
    } else {
      return { en1: en1Raw, sa1: sa1Raw, en2: fmtTime(EN2_ESP), sa2: fmtTime(SA2_ESP), en1Auto: false, sa1Auto: false, en2Auto: true, sa2Auto: true, cenario: 'D_parcial' };
    }
  }

  // EN1 vazio
  if (en1m === null && sa1m !== null) {
    const en1f = fmtTime(en1Esp);
    if (en2m === null && sa2m === null) {
      if (sa1m >= 14 * 60) {
        return { en1: en1f, sa1: fmtTime(SA1_ESP), en2: fmtTime(EN2_ESP), sa2: fmtTime(sa1m), en1Auto: true, sa1Auto: true, en2Auto: true, sa2Auto: false, cenario: 'E_B' };
      } else {
        return { en1: en1f, sa1: sa1Raw, en2: fmtTime(EN2_ESP), sa2: fmtTime(SA2_ESP), en1Auto: true, sa1Auto: false, en2Auto: true, sa2Auto: true, cenario: 'E_D' };
      }
    } else if (en2m === null) {
      return { en1: en1f, sa1: sa1Raw, en2: fmtTime(sa1m + ALMOCO), sa2: sa2Raw, en1Auto: true, sa1Auto: false, en2Auto: true, sa2Auto: false, cenario: 'E_C' };
    } else {
      return { en1: en1f, sa1: sa1Raw, en2: en2Raw, sa2: sa2Raw, en1Auto: true, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'E' };
    }
  }

  // SA1 vazio, EN2 preenchido
  if (sa1m === null && en2m !== null) {
    return { en1: en1Raw, sa1: fmtTime(SA1_ESP), en2: en2Raw, sa2: sa2Raw, en1Auto: false, sa1Auto: true, en2Auto: false, sa2Auto: false, cenario: 'SA1_auto' };
  }

  return { en1: en1Raw, sa1: sa1Raw, en2: en2Raw, sa2: sa2Raw, en1Auto: false, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'A' };
}

/// ─── CÁLCULO DE HORAS EXTRA ──────────────────────────────────────────────
// Regras (dias úteis):
//   @10€/h = almoço curto (minutos poupados no almoço) + saída entre 18:30 e 19:00
//   @15€/h = minutos de saída APÓS as 19:00 (quando sa2 > 19:00)
// Regras (sábados):
//   @10€/h = saída entre 13:00 e 13:30
//   @15€/h = minutos de saída APÓS as 13:30
// NOTA: almoço curto e saída até ao limiar somam-se para @10€/h
//       saída após o limiar é SEMPRE @15€/h (independente do almoço)
// Esta função calcula apenas a componente de saída (sem almoço)
function calcularExtraSaida(extraSaMin: number): { extra10Min: number; extra15Min: number } {
  // Regra CONFIRMADA:
  //   Se saída <= 30min após hora esperada (não passa 19:00/13:30): TODOS os min a 10€/h
  //   Se saída >  30min após hora esperada (passa 19:00/13:30): TODOS os min a 15€/h
  // O almoço curto é SEMPRE 10€/h e calculado separadamente no calcularSaldo
  if (extraSaMin <= 0) return { extra10Min: 0, extra15Min: 0 };
  const LIMIAR = 30;
  if (extraSaMin <= LIMIAR) {
    return { extra10Min: extraSaMin, extra15Min: 0 };
  } else {
    // Passou o limiar: TODOS os minutos de saída a 15€/h
    return { extra10Min: 0, extra15Min: extraSaMin };
  }
}

// ─── CÁLCULO DO SALDO ────────────────────────────────────────────────
export function calcularSaldo(
  en1: string | null, sa1: string | null,
  en2: string | null, sa2: string | null,
  isSabado: boolean, numStr: string,
  mapaExterno?: MapaHorarios
): { saldo: number; atrasoEn: number; excessoAlm: number; saidaCedo: number; extraSa: number; extra10Min: number; extra15Min: number; detalhe: string } {
  const custom = (mapaExterno ?? HORARIOS_CUSTOM_DEFAULT)[numStr] || {};
  const en1Esp = custom.en1 ?? EN1_ESP;

  const en1m = toMin(en1);
  const sa1m = toMin(sa1);
  const en2m = toMin(en2);
  const sa2m = toMin(sa2);

  const detalhes: string[] = [];
  let saldo = 0;
  let atrasoEn = 0, excessoAlm = 0, saidaCedo = 0, extraSa = 0;
  let extra10Min = 0, extra15Min = 0;

  if (isSabado) {
    if (en1m === null || sa1m === null) return { saldo: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, detalhe: '✓ Cumprido' };
    const tardeSa1 = sa1m - (13 * 60);
    if (tardeSa1 > 0) {
      extraSa = tardeSa1;
      const ex = calcularExtraSaida(tardeSa1);
      extra10Min = ex.extra10Min; extra15Min = ex.extra15Min;
      const partes: string[] = [];
      if (ex.extra10Min > 0) partes.push(`${ex.extra10Min}min@10€`);
      if (ex.extra15Min > 0) partes.push(`${ex.extra15Min}min@15€`);
      detalhes.push(`Saída tarde +${fmtTime(tardeSa1)} (${partes.join(' + ')})`);
    } else if (tardeSa1 < 0) {
      saidaCedo = Math.abs(tardeSa1);
      detalhes.push(`Saída cedo ${fmtTime(tardeSa1)}`);
    }
    if (en1m > en1Esp) { atrasoEn = en1m - en1Esp; detalhes.push(`Entrada atrasada -${fmtTime(atrasoEn)}`); }
    saldo = tardeSa1 - (en1m > en1Esp ? en1m - en1Esp : 0);
    return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, extra10Min, extra15Min, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
  }

  if (en1m === null && sa1m === null && en2m === null && sa2m === null) {
    return { saldo: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, detalhe: '✓ Cumprido' };
  }

  // Entrada atrasada
  if (en1m !== null && en1m > en1Esp) {
    atrasoEn = en1m - en1Esp;
    detalhes.push(`Entrada atrasada -${fmtTime(atrasoEn)}`);
  }

  // Almoço (SA1 → EN2)
  let almocoCurtoMin = 0;
  if (sa1m !== null && en2m !== null) {
    const almReal = en2m - sa1m;
    const diffAlm = almReal - ALMOCO;
    if (diffAlm > 0) {
      excessoAlm = diffAlm;
      detalhes.push(`Almoço longo -${fmtTime(diffAlm)}`);
    } else if (diffAlm < 0) {
      // Almoço curto: minutos poupados são pagos a 10€/h
      almocoCurtoMin = Math.abs(diffAlm);
      detalhes.push(`Almoço curto +${fmtTime(almocoCurtoMin)}`);
    }
  }

  // Saída final
  if (sa2m !== null) {
    const tardeSa2 = sa2m - SA2_ESP;
    if (tardeSa2 > 0) {
      extraSa = tardeSa2;
      const ex = calcularExtraSaida(tardeSa2);
      // @10€/h = almoço curto + saída até ao limiar (30min)
      // @15€/h = saída após o limiar (independente do almoço)
      extra10Min = almocoCurtoMin + ex.extra10Min;
      extra15Min = ex.extra15Min;
      const partes: string[] = [];
      if (almocoCurtoMin > 0) partes.push(`${almocoCurtoMin}min almoço@10€`);
      if (ex.extra10Min > 0) partes.push(`${ex.extra10Min}min saída@10€`);
      if (ex.extra15Min > 0) partes.push(`${ex.extra15Min}min saída@15€`);
      detalhes.push(`Saída tarde +${fmtTime(tardeSa2)} (${partes.join(' + ')})`);
    } else if (tardeSa2 < 0) {
      saidaCedo = Math.abs(tardeSa2);
      // Mesmo sem saída tarde, o almoço curto é pago a 10€/h
      extra10Min = almocoCurtoMin;
      detalhes.push(`Saída cedo ${fmtTime(tardeSa2)}`);
    } else {
      // Saída exata às 18:30 — almoço curto ainda é pago
      extra10Min = almocoCurtoMin;
    }
  } else {
    // Sem saída registada — almoço curto ainda é pago
    extra10Min = almocoCurtoMin;
  }

  // Saldo total
  const almReal = (sa1m !== null && en2m !== null) ? (en2m - sa1m) : ALMOCO;
  const diffAlm = almReal - ALMOCO;
  const tardeSa2 = sa2m !== null ? sa2m - SA2_ESP : 0;
  saldo = tardeSa2 - (en1m !== null && en1m > en1Esp ? en1m - en1Esp : 0) - diffAlm;

  return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, extra10Min, extra15Min, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
}

// ─── TIPO DE SAÍDA ─────────────────────────────────────────────────────────
export interface RegistoProcessado {
  numero: string;
  nome: string;
  data: string;
  diaSemana: string;
  horario: string;
  en1: string | null;
  sa1: string | null;
  en2: string | null;
  sa2: string | null;
  en1Auto: boolean;
  sa1Auto: boolean;
  en2Auto: boolean;
  sa2Auto: boolean;
  cenario: string;
  saldo: number | null;
  atrasoEn: number;
  excessoAlm: number;
  saidaCedo: number;
  extraSa: number;
  extra10Min: number;
  extra15Min: number;
  justificacao: string | null;
  detalhe: string;
  ignorada: boolean;
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────
export function processarFicheiro(buffer: Buffer, excluidos?: Set<string>): RegistoProcessado[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false });

  if (raw.length === 0) throw new Error('Ficheiro sem dados');

  // Detectar colunas
  const headers = Object.keys(raw[0]);
  const findCol = (candidates: string[]) =>
    headers.find(h => candidates.some(c => h.toLowerCase().includes(c.toLowerCase()))) ?? null;

  const colNum  = findCol(['número', 'nº', 'numero', 'num', 'n.']);
  const colNome = findCol(['nome']);
  const colData = findCol(['data']);
  const colHor  = findCol(['horário', 'horario', 'hor']);
  const colEn1  = findCol(['1ºen', '1ª en', '1en', 'entrada1', '1.ª entrada']);
  const colSa1  = findCol(['1ºsa', '1ª sa', '1sa', 'saída1', '1.ª saída']);
  const colEn2  = findCol(['2ºen', '2ª en', '2en', 'entrada2', '2.ª entrada']);
  const colSa2  = findCol(['2ºsa', '2ª sa', '2sa', 'saída2', '2.ª saída']);
  const colJust = findCol(['justificação', 'justificacao', 'just']);

  const getVal = (row: Record<string, unknown>, col: string | null): string | null => {
    if (!col) return null;
    const v = row[col];
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s && s !== 'null' && s !== 'undefined' ? s : null;
  };

  const resultados: RegistoProcessado[] = [];

  for (const row of raw) {
    const numero  = getVal(row, colNum) ?? '';
    const nome    = getVal(row, colNome) ?? '';
    const data    = getVal(row, colData) ?? '';
    const horario = getVal(row, colHor) ?? '';
    let   just    = getVal(row, colJust);
    let   en1Raw  = getVal(row, colEn1);
    let   sa1Raw  = getVal(row, colSa1);
    let   en2Raw  = getVal(row, colEn2);
    let   sa2Raw  = getVal(row, colSa2);

    if (!nome && !numero) continue;

    // Excluir colaboradores (usa set externo da BD se fornecido, senão usa o hardcoded)
    const numStr = String(numero).trim().replace(/^0+/, '') || '0';
    const setExcluidos = excluidos ?? EXCLUIR_NUMEROS;
    if (setExcluidos.has(numStr) || setExcluidos.has(numero.trim())) continue;

    // Normalizar justificação
    if (just && ['', 'none', '-', '—', '\xa0'].includes(just.toLowerCase())) just = null;

    const dataLower = data.toLowerCase();
    const isDomingo = dataLower.includes('dom');
    const isSabado  = dataLower.includes('sáb') || dataLower.includes('sab');
    const diaSemana = dataLower.includes('seg') ? 'SEG' :
                      dataLower.includes('ter') ? 'TER' :
                      dataLower.includes('qua') ? 'QUA' :
                      dataLower.includes('qui') ? 'QUI' :
                      dataLower.includes('sex') ? 'SEX' :
                      isSabado ? 'SÁB' : isDomingo ? 'DOM' : '';

    // Regra 1: Ignorar domingos
    if (isDomingo) {
      resultados.push({ numero, nome, data, diaSemana, horario, en1: null, sa1: null, en2: null, sa2: null, en1Auto: false, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'DOM', saldo: null, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, justificacao: null, detalhe: 'Domingo — ignorado', ignorada: true });
      continue;
    }

    // Regra 2: FIMS (folgas) — ignorar exceto se sábado com picagem
    const isFims = horario.toUpperCase().includes('FIMS');
    if (isFims && !isSabado) {
      resultados.push({ numero, nome, data, diaSemana, horario, en1: null, sa1: null, en2: null, sa2: null, en1Auto: false, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'FIMS', saldo: null, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, justificacao: null, detalhe: 'Folga — ignorado', ignorada: true });
      continue;
    }

    // Regra 3: Justificação — não preencher automaticamente
    if (just) {
      resultados.push({ numero, nome, data, diaSemana, horario, en1: en1Raw, sa1: sa1Raw, en2: en2Raw, sa2: sa2Raw, en1Auto: false, sa1Auto: false, en2Auto: false, sa2Auto: false, cenario: 'JUST', saldo: null, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, justificacao: just, detalhe: `Justificação: ${just}`, ignorada: false });
      continue;
    }

    // Regra 4: Preenchimento automático
    const preenchido = preencherAutomatico(en1Raw, sa1Raw, en2Raw, sa2Raw, isSabado, numStr);
    const calc = calcularSaldo(preenchido.en1, preenchido.sa1, preenchido.en2, preenchido.sa2, isSabado, numStr);

    resultados.push({
      numero, nome, data, diaSemana, horario,
      en1: preenchido.en1, sa1: preenchido.sa1, en2: preenchido.en2, sa2: preenchido.sa2,
      en1Auto: preenchido.en1Auto, sa1Auto: preenchido.sa1Auto,
      en2Auto: preenchido.en2Auto, sa2Auto: preenchido.sa2Auto,
      cenario: preenchido.cenario,
      saldo: calc.saldo,
      atrasoEn: calc.atrasoEn, excessoAlm: calc.excessoAlm,
      saidaCedo: calc.saidaCedo, extraSa: calc.extraSa,
      extra10Min: calc.extra10Min, extra15Min: calc.extra15Min,
      justificacao: null, detalhe: calc.detalhe, ignorada: false,
    });
  }

  return resultados;
}

// ─── RESUMO POR COLABORADOR ───────────────────────────────────────────────
export interface ResumoColaborador {
  numero: string;
  nome: string;
  diasTrab: number;
  diasJust: number;
  celulasAuto: number;
  atrasoEn: number;
  excessoAlm: number;
  saidaCedo: number;
  extraSa: number;
  extra10Min: number;
  extra15Min: number;
  saldoTotal: number;
}

export function calcularResumos(registos: RegistoProcessado[]): ResumoColaborador[] {
  const map = new Map<string, ResumoColaborador>();

  for (const r of registos) {
    if (r.ignorada) continue;
    const key = `${r.numero}|${r.nome}`;
    if (!map.has(key)) {
      map.set(key, { numero: r.numero, nome: r.nome, diasTrab: 0, diasJust: 0, celulasAuto: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, extra10Min: 0, extra15Min: 0, saldoTotal: 0 });
    }
    const res = map.get(key)!;
    if (r.justificacao) { res.diasJust++; continue; }
    if (r.saldo !== null) {
      res.diasTrab++;
      res.saldoTotal += r.saldo;
      res.atrasoEn   += r.atrasoEn;
      res.excessoAlm += r.excessoAlm;
      res.saidaCedo  += r.saidaCedo;
      res.extraSa    += r.extraSa;
      res.extra10Min  += r.extra10Min ?? 0;
      res.extra15Min  += r.extra15Min ?? 0;
      res.celulasAuto += (r.en1Auto ? 1 : 0) + (r.sa1Auto ? 1 : 0) + (r.en2Auto ? 1 : 0) + (r.sa2Auto ? 1 : 0);
    }
  }

  return Array.from(map.values()).sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
}
