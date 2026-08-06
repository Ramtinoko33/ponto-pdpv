/**
 * monetario.ts
 * Helpers puros para cálculos monetários de horas extra.
 * Toda a lógica de dinheiro centralizada aqui — usada pelo backend, testes e exportação Excel.
 *
 * REGRAS DE ARREDONDAMENTO:
 * - Valores internos em cêntimos (inteiros) para evitar floating-point issues
 * - Conversão para euros apenas na apresentação (2 casas decimais)
 *
 * TARIFAS:
 * - @15€/h = todos os minutos extra (sem distinção de limiar)
 * - Desconto: minutos negativos (saldo negativo) descontados a 15€/h
 */
 
 /** Tarifa única em cêntimos por hora */
 const TARIFA_15_CENTIMOS = 1500; // 15.00€/h

/**
 * Calcula o valor das horas extra em cêntimos.
 * Usa aritmética inteira para evitar erros de ponto flutuante.
 */
export function calcularValorHorasExtraCentimos(
  extra10Min: number,
  extra15Min: number
): number {
  // Todos os minutos extra pagos a 15€/h (extra10Min e extra15Min somados)
  const totalMin = extra10Min + extra15Min;
  return Math.round((totalMin * TARIFA_15_CENTIMOS) / 60);
}

/**
 * Calcula o desconto por minutos negativos (saldo negativo) em cêntimos.
 * Minutos negativos são descontados a 15€/h.
 * @param saldoNegativoMin - valor ABSOLUTO dos minutos negativos (sempre ≥ 0)
 */
export function calcularDescontoCentimos(saldoNegativoMin: number): number {
  if (saldoNegativoMin <= 0) return 0;
  return Math.round((saldoNegativoMin * TARIFA_15_CENTIMOS) / 60);
}

/**
 * Calcula o total a pagar em cêntimos.
 * totalDinheiroPagar = valorHorasExtra + extraManualEuros
 */
export function calcularTotalCentimos(
  extra10Min: number,
  extra15Min: number,
  extraManualCentimos: number
): number {
  const horasExtra = calcularValorHorasExtraCentimos(extra10Min, extra15Min);
  return horasExtra + extraManualCentimos;
}

/**
 * Converte cêntimos para euros com 2 casas decimais.
 * Ex: 1250 → 12.50
 */
export function centimosPaEuros(centimos: number): number {
  return Math.round(centimos) / 100;
}

/**
 * Converte euros para cêntimos (inteiro).
 * Ex: 12.50 → 1250
 * Lança erro se o valor for inválido.
 */
export function eurosPaCentimos(euros: number): number {
  if (typeof euros !== "number") throw new Error("Valor deve ser numérico");
  if (isNaN(euros)) throw new Error("Valor não pode ser NaN");
  if (!isFinite(euros)) throw new Error("Valor não pode ser infinito");
  if (euros < 0) throw new Error("Valor não pode ser negativo");
  return Math.round(euros * 100);
}

/**
 * Valida e converte um input de euros (string ou number) para cêntimos.
 * Usado para validar input do utilizador no frontend.
 * Retorna null se inválido.
 */
export function parseEurosInput(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return 0;
  const num = typeof input === "string" ? parseFloat(input) : Number(input);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < 0) return null;
  return Math.round(num * 100);
}

/**
 * Formata minutos como string de horas (ex: 75 → "01:15")
 */
export function fmtMinutos(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Resultado completo do resumo monetário de um colaborador num período.
 */
export interface ResumoMonetario {
  minutosExtra: number;              // total minutos extra positivos (extra10Min + extra15Min)
  horasExtraFormatadas: string;      // ex: "01:15"
  valorHorasExtraCentimos: number;   // valor bruto em cêntimos (antes do desconto)
  valorHorasExtra: number;           // valor bruto em euros (2 casas)
  descontoNegativoCentimos: number;  // desconto por minutos negativos em cêntimos
  descontoNegativoEuros: number;     // desconto em euros (2 casas)
  extraManualCentimos: number;       // extra manual em cêntimos
  extraManualEuros: number;          // extra manual em euros (2 casas)
  totalDinheiroPagarCentimos: number; // total líquido em cêntimos
  totalDinheiroPagar: number;        // total líquido em euros (2 casas)
}

/**
 * Calcula o resumo monetário completo de um colaborador.
 * Modo normal: todos os minutos extra @15€/h (extra10Min + extra15Min somados)
 * Desconto: saldoNegativoMin @15€/h (subtraído ao total)
 *
 * @param extra10Min - minutos extra pagos a 10€/h
 * @param extra15Min - minutos extra pagos a 15€/h
 * @param extraManualCentimos - extra manual em cêntimos
 * @param saldoNegativoMin - minutos negativos acumulados (valor absoluto, sempre ≥ 0)
 */
export function calcularResumoMonetario(
  extra10Min: number,
  extra15Min: number,
  extraManualCentimos: number,
  saldoNegativoMin: number = 0
): ResumoMonetario {
  const minutosExtra = extra10Min + extra15Min;
  const valorHorasExtraCentimos = calcularValorHorasExtraCentimos(extra10Min, extra15Min);
  const descontoNegativoCentimos = calcularDescontoCentimos(Math.max(0, saldoNegativoMin));
  const totalDinheiroPagarCentimos = valorHorasExtraCentimos - descontoNegativoCentimos + extraManualCentimos;

  return {
    minutosExtra,
    horasExtraFormatadas: fmtMinutos(minutosExtra),
    valorHorasExtraCentimos,
    valorHorasExtra: centimosPaEuros(valorHorasExtraCentimos),
    descontoNegativoCentimos,
    descontoNegativoEuros: centimosPaEuros(descontoNegativoCentimos),
    extraManualCentimos,
    extraManualEuros: centimosPaEuros(extraManualCentimos),
    totalDinheiroPagarCentimos,
    totalDinheiroPagar: centimosPaEuros(totalDinheiroPagarCentimos),
  };
}

/**
 * REGRA ESPECIAL de cálculo de horas extra — versão DIA A DIA.
 *
 * Recebe um array de saldos diários e aplica a regra a cada dia individualmente,
 * somando os resultados. Isto garante consistência com o DetalheColaborador.
 *
 * @param saldosDiarios - array de saldos diários em minutos (podem ser negativos)
 * @param extraManualCentimos - extra manual em cêntimos
 */
export function calcularResumoMonetarioRegraEspecialDiaDia(
  saldosDiarios: number[],
  extraManualCentimos: number
): ResumoMonetario {
  let valorHorasExtraCentimos = 0;
  let descontoNegativoCentimos = 0;
  let minutosExtra = 0;

  for (const saldo of saldosDiarios) {
    if (saldo > 0) {
      minutosExtra += saldo;
      // Todos os minutos extra pagos a 15€/h
      valorHorasExtraCentimos += Math.round((saldo * TARIFA_15_CENTIMOS) / 60);
    } else if (saldo < 0) {
      descontoNegativoCentimos += Math.round((Math.abs(saldo) * TARIFA_15_CENTIMOS) / 60);
    }
  }

  const totalDinheiroPagarCentimos = valorHorasExtraCentimos - descontoNegativoCentimos + extraManualCentimos;

  return {
    minutosExtra,
    horasExtraFormatadas: fmtMinutos(minutosExtra),
    valorHorasExtraCentimos,
    valorHorasExtra: centimosPaEuros(valorHorasExtraCentimos),
    descontoNegativoCentimos,
    descontoNegativoEuros: centimosPaEuros(descontoNegativoCentimos),
    extraManualCentimos,
    extraManualEuros: centimosPaEuros(extraManualCentimos),
    totalDinheiroPagarCentimos,
    totalDinheiroPagar: centimosPaEuros(totalDinheiroPagarCentimos),
  };
}

/**
 * REGRA ESPECIAL de cálculo de horas extra — versão SALDO TOTAL (legado, usada no DetalheColaborador).
 *
 * Usa o SALDO diário/mensal diretamente:
 * - Se saldo > 0 e ≤30 min → paga TUDO a 10€/h
 * - Se saldo > 0 → paga TUDO a 15€/h
 * - Se saldo < 0 → desconta os minutos negativos a 15€/h
 * - Se saldo = 0 → 0€
 *
 * Exemplos:
 *   Saldo +22min → 22/60*15 = 5.50€
 *   Saldo +30min → 30/60*15 = 7.50€
 *   Saldo +45min → 45/60*15 = 11.25€
 *   Saldo -10min → desconto 10/60*15 = -2.50€
 *
 * @param saldoMin - saldo em minutos (diário ou acumulado mensal, pode ser negativo)
 * @param extraManualCentimos - extra manual em cêntimos
 */
export function calcularResumoMonetarioRegraEspecial(
  saldoMin: number,
  extraManualCentimos: number
): ResumoMonetario {
  let valorHorasExtraCentimos = 0;
  let descontoNegativoCentimos = 0;
  let minutosExtra = 0;

  if (saldoMin > 0) {
    // Saldo positivo: paga tudo a 15€/h
    minutosExtra = saldoMin;
    valorHorasExtraCentimos = Math.round((saldoMin * TARIFA_15_CENTIMOS) / 60);
  } else if (saldoMin < 0) {
    // Saldo negativo: desconta a 15€/h
    descontoNegativoCentimos = Math.round((Math.abs(saldoMin) * TARIFA_15_CENTIMOS) / 60);
  }

  const totalDinheiroPagarCentimos = valorHorasExtraCentimos - descontoNegativoCentimos + extraManualCentimos;

  return {
    minutosExtra,
    horasExtraFormatadas: fmtMinutos(minutosExtra),
    valorHorasExtraCentimos,
    valorHorasExtra: centimosPaEuros(valorHorasExtraCentimos),
    descontoNegativoCentimos,
    descontoNegativoEuros: centimosPaEuros(descontoNegativoCentimos),
    extraManualCentimos,
    extraManualEuros: centimosPaEuros(extraManualCentimos),
    totalDinheiroPagarCentimos,
    totalDinheiroPagar: centimosPaEuros(totalDinheiroPagarCentimos),
  };
}
