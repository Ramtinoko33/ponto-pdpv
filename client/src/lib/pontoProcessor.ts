/**
 * LÓGICA DE PROCESSAMENTO DE PICAGEM DE PONTO — Pneus D. Pedro V
 *
 * Regras aplicadas:
 * 1. Eliminar domingos (ignorar completamente)
 * 2. Sábados: 1 entrada às 08:30 e 1 saída às 13:00
 * 3. Se tiver justificação → não preencher nada automaticamente
 * 4. Preencher células vazias: EN1=08:30, SA1=13:00, EN2=14:00, SA2=18:30
 *
 * Cálculo de saldo:
 * - Horário normal: Seg-Sex 08:30–13:00 + 14:00–18:30 (8h/dia, 60min almoço)
 * - Sábado: 08:30–13:00 (4h30min)
 * - Entrada antes da hora: não conta (não é positivo)
 * - Entrada depois da hora: desconta minutos em atraso
 * - Saída antes da hora: desconta minutos em falta
 * - Saída depois da hora: conta como positivo
 * - Almoço: diferença entre SA1 e EN2 vs. 60 min esperados
 */

export type DayOfWeek = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface PontoRow {
  numero: string;
  nome: string;
  data: string;           // "02/02/2026 seg"
  horario: string;        // "H101", "Adm", "ASFS", "FIMS", etc.
  en1: string;            // "08:26" ou ""
  sa1: string;
  en2: string;
  sa2: string;
  justificacao: string;
}

export interface ProcessedRow extends PontoRow {
  // Valores após processamento
  en1Final: string;
  sa1Final: string;
  en2Final: string;
  sa2Final: string;

  // Flags de preenchimento automático
  en1Auto: boolean;
  sa1Auto: boolean;
  en2Auto: boolean;
  sa2Auto: boolean;

  // Cálculos
  saldoMinutos: number;   // positivo ou negativo
  saldoFormatado: string; // "+00:22" ou "-00:05"
  detalheCalculo: string; // explicação do cálculo

  // Estado da linha
  ignorada: boolean;      // domingo ou FIMS
  comJustificacao: boolean;
  ehSabado: boolean;
  ehDomingo: boolean;
}

// Converte "HH:MM" para minutos totais
export function toMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Converte minutos para "HH:MM"
export function fromMinutes(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Formata saldo com sinal
export function formatSaldo(mins: number): string {
  if (mins === 0) return '00:00';
  const sign = mins > 0 ? '+' : '-';
  return `${sign}${fromMinutes(mins)}`;
}

// Extrai o dia da semana da data ("02/02/2026 seg" → "seg")
export function getDayOfWeek(data: string): DayOfWeek | null {
  const parts = data.trim().split(' ');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase() as DayOfWeek;
}

// Verifica se é sábado
export function isSaturday(data: string): boolean {
  return getDayOfWeek(data) === 'sab';
}

// Verifica se é domingo
export function isSunday(data: string): boolean {
  return getDayOfWeek(data) === 'dom';
}

/**
 * Calcula o saldo de minutos para um dia normal (Seg-Sex)
 * Horário esperado: 08:30–13:00 + 14:00–18:30
 * Almoço esperado: 60 minutos (EN2 - SA1)
 *
 * Regras (validadas com o exemplo 08:26 13:14 14:19 18:57 = +22min):
 * - EN1: só penaliza atraso (entrada antes de 08:30 não conta)
 * - SA1: NÃO conta diretamente para saldo (é referência para calcular almoço)
 * - Almoço (EN2-SA1): diferença vs 60min → conta (inclui atraso da entrada tarde)
 * - SA2: diferença vs 18:30 → conta positivo ou negativo
 */
function calcularSaldoDiaNormal(
  en1: string, sa1: string, en2: string, sa2: string
): { saldo: number; detalhe: string } {
  const EN1_ESPERADO = toMinutes('08:30');
  const SA2_ESPERADO = toMinutes('18:30');
  const ALMOCO_ESPERADO = 60; // minutos

  let saldo = 0;
  const detalhes: string[] = [];

  const en1Min = toMinutes(en1);
  const sa1Min = toMinutes(sa1);
  const en2Min = toMinutes(en2);
  const sa2Min = toMinutes(sa2);

  // 1. Entrada manhã: só penaliza atraso (entrada antes de 08:30 não conta)
  if (en1Min > EN1_ESPERADO) {
    const atraso = en1Min - EN1_ESPERADO;
    saldo -= atraso;
    detalhes.push(`Entrada atrasada -${fromMinutes(atraso)}`);
  }

  // 2. Almoço: EN2 - SA1 vs 60min (absorve também o atraso da entrada tarde)
  const almoco = en2Min - sa1Min;
  const diferencaAlmoco = almoco - ALMOCO_ESPERADO;
  if (diferencaAlmoco !== 0) {
    saldo -= diferencaAlmoco;
    if (diferencaAlmoco > 0) {
      detalhes.push(`Almoço ${fromMinutes(diferencaAlmoco)} a mais -${fromMinutes(diferencaAlmoco)}`);
    } else {
      detalhes.push(`Almoço ${fromMinutes(-diferencaAlmoco)} a menos +${fromMinutes(-diferencaAlmoco)}`);
    }
  }

  // 3. Saída final vs 18:30
  const diffSa2 = sa2Min - SA2_ESPERADO;
  if (diffSa2 !== 0) {
    saldo += diffSa2;
    if (diffSa2 > 0) {
      detalhes.push(`Saída tarde +${fromMinutes(diffSa2)}`);
    } else {
      detalhes.push(`Saída cedo -${fromMinutes(-diffSa2)}`);
    }
  }

  return {
    saldo,
    detalhe: detalhes.length > 0 ? detalhes.join(' | ') : 'Horário cumprido'
  };
}

/**
 * Calcula o saldo para sábado
 * Horário esperado: 08:30–13:00 (apenas 1 turno)
 */
function calcularSaldoSabado(
  en1: string, sa1: string
): { saldo: number; detalhe: string } {
  const EN1_ESPERADO = toMinutes('08:30');
  const SA1_ESPERADO = toMinutes('13:00');

  let saldo = 0;
  const detalhes: string[] = [];

  const en1Min = toMinutes(en1);
  const sa1Min = toMinutes(sa1);

  if (en1Min > EN1_ESPERADO) {
    const atraso = en1Min - EN1_ESPERADO;
    saldo -= atraso;
    detalhes.push(`Entrada atrasada -${fromMinutes(atraso)}`);
  }

  if (sa1Min < SA1_ESPERADO) {
    const falta = SA1_ESPERADO - sa1Min;
    saldo -= falta;
    detalhes.push(`Saída cedo -${fromMinutes(falta)}`);
  } else if (sa1Min > SA1_ESPERADO) {
    const extra = sa1Min - SA1_ESPERADO;
    saldo += extra;
    detalhes.push(`Saída tarde +${fromMinutes(extra)}`);
  }

  return {
    saldo,
    detalhe: detalhes.length > 0 ? detalhes.join(' | ') : 'Horário cumprido'
  };
}

/**
 * Processa uma linha de picagem de ponto aplicando todas as regras
 */
export function processRow(row: PontoRow): ProcessedRow {
  const ehDomingo = isSunday(row.data);
  const ehSabado = isSaturday(row.data);
  const ehFIMS = row.horario === 'FIMS';
  const comJustificacao = !!row.justificacao && row.justificacao.trim() !== '' && row.justificacao.trim() !== '\u00a0';

  // Regra 1: Ignorar domingos e FIMS
  if (ehDomingo || ehFIMS) {
    return {
      ...row,
      en1Final: row.en1,
      sa1Final: row.sa1,
      en2Final: row.en2,
      sa2Final: row.sa2,
      en1Auto: false,
      sa1Auto: false,
      en2Auto: false,
      sa2Auto: false,
      saldoMinutos: 0,
      saldoFormatado: '—',
      detalheCalculo: ehDomingo ? 'Domingo — ignorado' : 'Folga (FIMS) — ignorado',
      ignorada: true,
      comJustificacao: false,
      ehSabado: false,
      ehDomingo,
    };
  }

  // Regra 3: Com justificação → não preencher automaticamente
  if (comJustificacao) {
    return {
      ...row,
      en1Final: row.en1,
      sa1Final: row.sa1,
      en2Final: row.en2,
      sa2Final: row.sa2,
      en1Auto: false,
      sa1Auto: false,
      en2Auto: false,
      sa2Auto: false,
      saldoMinutos: 0,
      saldoFormatado: '—',
      detalheCalculo: `Justificação: ${row.justificacao}`,
      ignorada: false,
      comJustificacao: true,
      ehSabado,
      ehDomingo: false,
    };
  }

  // Regra 2: Sábado — apenas 1 turno
  if (ehSabado) {
    const en1Final = row.en1 || '08:30';
    const sa1Final = row.sa1 || '13:00';
    const en1Auto = !row.en1;
    const sa1Auto = !row.sa1;

    const { saldo, detalhe } = calcularSaldoSabado(en1Final, sa1Final);

    return {
      ...row,
      en1Final,
      sa1Final,
      en2Final: '',
      sa2Final: '',
      en1Auto,
      sa1Auto,
      en2Auto: false,
      sa2Auto: false,
      saldoMinutos: saldo,
      saldoFormatado: formatSaldo(saldo),
      detalheCalculo: detalhe,
      ignorada: false,
      comJustificacao: false,
      ehSabado: true,
      ehDomingo: false,
    };
  }

  // Regra 4: Dia normal (Seg-Sex) — preencher células vazias
  const en1Final = row.en1 || '08:30';
  const sa1Final = row.sa1 || '13:00';
  const en2Final = row.en2 || '14:00';
  const sa2Final = row.sa2 || '18:30';

  const en1Auto = !row.en1;
  const sa1Auto = !row.sa1;
  const en2Auto = !row.en2;
  const sa2Auto = !row.sa2;

  const { saldo, detalhe } = calcularSaldoDiaNormal(en1Final, sa1Final, en2Final, sa2Final);

  return {
    ...row,
    en1Final,
    sa1Final,
    en2Final,
    sa2Final,
    en1Auto,
    sa1Auto,
    en2Auto,
    sa2Auto,
    saldoMinutos: saldo,
    saldoFormatado: formatSaldo(saldo),
    detalheCalculo: detalhe,
    ignorada: false,
    comJustificacao: false,
    ehSabado: false,
    ehDomingo: false,
  };
}

/**
 * Faz parse do ficheiro HTML de picagem de ponto
 */
export function parseHtmlFile(htmlContent: string): PontoRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const rows = doc.querySelectorAll('table tr');
  const result: PontoRow[] = [];

  // Detectar colunas pelo cabeçalho
  let colMap: Record<string, number> = {};
  const headerRow = rows[0];
  if (headerRow) {
    const headers = headerRow.querySelectorAll('th, td');
    headers.forEach((th, i) => {
      const text = th.textContent?.trim() || '';
      colMap[text] = i;
    });
  }

  // Índices das colunas (com fallback para posições conhecidas)
  const idxNumero = colMap['Número'] ?? 1;
  const idxNome = colMap['Nome'] ?? 2;
  const idxData = colMap['Data'] ?? 3;
  const idxHorario = colMap['Horários'] ?? 4;
  const idxEN1 = colMap['1ºEN'] ?? 5;
  const idxSA1 = colMap['1ºSA'] ?? 6;
  const idxEN2 = colMap['2ºEN'] ?? 7;
  const idxSA2 = colMap['2ºSA'] ?? 8;
  // Justificação pode estar na última coluna
  const idxJust = colMap['Justificação'] ?? -1;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td, th');
    if (cells.length < 5) continue;

    const getCell = (idx: number) => {
      if (idx < 0 || idx >= cells.length) return '';
      const text = cells[idx].textContent?.trim() || '';
      return text === '\u00a0' ? '' : text;
    };

    // Justificação: última coluna se não mapeada
    const just = idxJust >= 0
      ? getCell(idxJust)
      : getCell(cells.length - 1);

    result.push({
      numero: getCell(idxNumero),
      nome: getCell(idxNome),
      data: getCell(idxData),
      horario: getCell(idxHorario),
      en1: getCell(idxEN1),
      sa1: getCell(idxSA1),
      en2: getCell(idxEN2),
      sa2: getCell(idxSA2),
      justificacao: just,
    });
  }

  return result;
}

/**
 * Processa todos os registos
 */
export function processAll(rows: PontoRow[]): ProcessedRow[] {
  return rows.map(processRow);
}

/**
 * Calcula estatísticas globais
 */
export interface Stats {
  totalDias: number;
  diasProcessados: number;
  diasIgnorados: number;
  diasComJustificacao: number;
  celulasPreenchidas: number;
  totalSaldoMinutos: number;
  totalSaldoFormatado: string;
  colaboradores: number;
  porColaborador: ColaboradorStats[];
}

export interface ColaboradorStats {
  numero: string;
  nome: string;
  totalDias: number;
  saldoTotal: number;
  saldoFormatado: string;
}

export function calcularEstatisticas(rows: ProcessedRow[]): Stats {
  const processados = rows.filter(r => !r.ignorada);
  const ignorados = rows.filter(r => r.ignorada);
  const comJust = processados.filter(r => r.comJustificacao);

  let celulasPreenchidas = 0;
  let totalSaldo = 0;

  processados.forEach(r => {
    if (r.en1Auto) celulasPreenchidas++;
    if (r.sa1Auto) celulasPreenchidas++;
    if (r.en2Auto) celulasPreenchidas++;
    if (r.sa2Auto) celulasPreenchidas++;
    if (!r.comJustificacao) totalSaldo += r.saldoMinutos;
  });

  // Por colaborador
  const colabMap = new Map<string, ColaboradorStats>();
  processados.forEach(r => {
    if (r.comJustificacao) return;
    const key = r.numero;
    if (!colabMap.has(key)) {
      colabMap.set(key, {
        numero: r.numero,
        nome: r.nome,
        totalDias: 0,
        saldoTotal: 0,
        saldoFormatado: '00:00',
      });
    }
    const c = colabMap.get(key)!;
    c.totalDias++;
    c.saldoTotal += r.saldoMinutos;
    c.saldoFormatado = formatSaldo(c.saldoTotal);
  });

  const porColaborador = Array.from(colabMap.values())
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return {
    totalDias: rows.length,
    diasProcessados: processados.length,
    diasIgnorados: ignorados.length,
    diasComJustificacao: comJust.length,
    celulasPreenchidas,
    totalSaldoMinutos: totalSaldo,
    totalSaldoFormatado: formatSaldo(totalSaldo),
    colaboradores: colabMap.size,
    porColaborador,
  };
}

/**
 * Gera CSV para exportação
 */
export function exportToCsv(rows: ProcessedRow[]): string {
  const header = ['Número', 'Nome', 'Data', 'Horário', '1ºEN', '1ºSA', '2ºEN', '2ºSA', 'Saldo', 'Detalhe', 'Justificação'];
  const lines = [header.join(';')];

  rows.forEach(r => {
    if (r.ignorada) return;
    lines.push([
      r.numero,
      r.nome,
      r.data,
      r.horario,
      r.en1Final + (r.en1Auto ? '*' : ''),
      r.sa1Final + (r.sa1Auto ? '*' : ''),
      r.en2Final + (r.en2Auto ? '*' : ''),
      r.sa2Final + (r.sa2Auto ? '*' : ''),
      r.saldoFormatado,
      r.detalheCalculo,
      r.justificacao,
    ].join(';'));
  });

  return lines.join('\n');
}
