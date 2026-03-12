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
 * - @10€/h = extra10Min (almoço curto + saída até 30min após hora esperada)
 * - @15€/h = extra15Min (saída acima de 30min após hora esperada)
 */

/** Tarifa base em cêntimos por hora */
const TARIFA_10_CENTIMOS = 1000; // 10.00€/h
const TARIFA_15_CENTIMOS = 1500; // 15.00€/h

/**
 * Calcula o valor das horas extra em cêntimos.
 * Usa aritmética inteira para evitar erros de ponto flutuante.
 */
export function calcularValorHorasExtraCentimos(
  extra10Min: number,
  extra15Min: number
): number {
  const valor10 = Math.round((extra10Min * TARIFA_10_CENTIMOS) / 60);
  const valor15 = Math.round((extra15Min * TARIFA_15_CENTIMOS) / 60);
  return valor10 + valor15;
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
  minutosExtra: number;           // total minutos extra (extra10Min + extra15Min)
  horasExtraFormatadas: string;   // ex: "01:15"
  valorHorasExtraCentimos: number; // valor em cêntimos
  valorHorasExtra: number;        // valor em euros (2 casas)
  extraManualCentimos: number;    // extra manual em cêntimos
  extraManualEuros: number;       // extra manual em euros (2 casas)
  totalDinheiroPagarCentimos: number; // total em cêntimos
  totalDinheiroPagar: number;     // total em euros (2 casas)
}

/**
 * Calcula o resumo monetário completo de um colaborador.
 */
export function calcularResumoMonetario(
  extra10Min: number,
  extra15Min: number,
  extraManualCentimos: number
): ResumoMonetario {
  const minutosExtra = extra10Min + extra15Min;
  const valorHorasExtraCentimos = calcularValorHorasExtraCentimos(extra10Min, extra15Min);
  const totalDinheiroPagarCentimos = valorHorasExtraCentimos + extraManualCentimos;

  return {
    minutosExtra,
    horasExtraFormatadas: fmtMinutos(minutosExtra),
    valorHorasExtraCentimos,
    valorHorasExtra: centimosPaEuros(valorHorasExtraCentimos),
    extraManualCentimos,
    extraManualEuros: centimosPaEuros(extraManualCentimos),
    totalDinheiroPagarCentimos,
    totalDinheiroPagar: centimosPaEuros(totalDinheiroPagarCentimos),
  };
}
