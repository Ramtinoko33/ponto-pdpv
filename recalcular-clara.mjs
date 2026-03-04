/**
 * recalcular-clara.mjs
 * Recalcula os registos da Clara (nº13) com o horário correto 09:30
 * usando a ordem correta: primeiro atualizar EN1 automáticos, depois recalcular saldos
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const NUMERO = '13';
const EN1_NOVO = 570; // 09:30 em minutos
const EN1_STR = '09:30';

// Funções auxiliares
function toMin(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function fmtTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

// Parâmetros do horário
const EN1_ESP = EN1_NOVO;  // 09:30
const SA1_ESP = 13 * 60;   // 13:00
const EN2_ESP = 14 * 60;   // 14:00
const SA2_ESP = 18 * 60 + 30; // 18:30
const ALMOCO = 60;

function calcularSaldo(en1, sa1, en2, sa2, isSabado) {
  const en1m = toMin(en1);
  const sa1m = toMin(sa1);
  const en2m = toMin(en2);
  const sa2m = toMin(sa2);

  let saldo = 0;
  let atrasoEn = 0, excessoAlm = 0, saidaCedo = 0, extraSa = 0;
  const detalhes = [];

  if (isSabado) {
    if (en1m === null || sa1m === null) return { saldo: 0, atrasoEn: 0, excessoAlm: 0, saidaCedo: 0, extraSa: 0, detalhe: '✓ Cumprido' };
    const tardeSa1 = sa1m - (13 * 60);
    if (tardeSa1 > 0) { extraSa = tardeSa1; saldo += tardeSa1; detalhes.push(`+${tardeSa1}m extra sáb`); }
    const cecoSa1 = (13 * 60) - sa1m;
    if (cecoSa1 > 0) { saidaCedo = cecoSa1; saldo -= cecoSa1; detalhes.push(`-${cecoSa1}m saiu cedo sáb`); }
    const atEn1 = en1m - (8 * 60 + 30);
    if (atEn1 > 0) { atrasoEn = atEn1; saldo -= atEn1; detalhes.push(`-${atEn1}m atraso sáb`); }
    return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
  }

  // Atraso na entrada (usando EN1_ESP = 09:30)
  if (en1m !== null && en1m > EN1_ESP) {
    atrasoEn = en1m - EN1_ESP;
    saldo -= atrasoEn;
    detalhes.push(`-${atrasoEn}m atraso`);
  }

  // Almoço
  if (sa1m !== null && en2m !== null) {
    const almoco = en2m - sa1m;
    if (almoco > ALMOCO) {
      excessoAlm = almoco - ALMOCO;
      saldo -= excessoAlm;
      detalhes.push(`-${excessoAlm}m almoço`);
    }
  }

  // Saída cedo
  if (sa2m !== null && sa2m < SA2_ESP) {
    saidaCedo = SA2_ESP - sa2m;
    saldo -= saidaCedo;
    detalhes.push(`-${saidaCedo}m saiu cedo`);
  }

  // Extra na saída
  if (sa2m !== null && sa2m > SA2_ESP) {
    extraSa = sa2m - SA2_ESP;
    saldo += extraSa;
    detalhes.push(`+${extraSa}m extra`);
  }

  return { saldo, atrasoEn, excessoAlm, saidaCedo, extraSa, detalhe: detalhes.join(' | ') || '✓ Cumprido' };
}

// PASSO 1: Atualizar EN1 automáticos para 09:30
const [updateResult] = await conn.query(
  `UPDATE registos_diarios SET en1 = ? WHERE numero = ? AND en1Auto = 1 AND ignorada = 0`,
  [EN1_STR, NUMERO]
);
console.log(`✓ PASSO 1: ${updateResult.affectedRows} EN1 automáticos atualizados para ${EN1_STR}`);

// PASSO 2: Recalcular saldos com os novos valores
const [registos] = await conn.query(
  `SELECT id, data, en1, sa1, en2, sa2, diaSemana, ignorada FROM registos_diarios WHERE numero = ? AND ignorada = 0`,
  [NUMERO]
);

let recalculados = 0;
for (const r of registos) {
  const isSabado = r.diaSemana === 'SÁB' || r.diaSemana === 'SAB';
  const calc = calcularSaldo(r.en1, r.sa1, r.en2, r.sa2, isSabado);
  
  await conn.query(
    `UPDATE registos_diarios SET saldo = ?, atrasoEn = ?, excessoAlm = ?, saidaCedo = ?, extraSa = ?, detalhe = ? WHERE id = ?`,
    [calc.saldo, calc.atrasoEn, calc.excessoAlm, calc.saidaCedo, calc.extraSa, calc.detalhe, r.id]
  );
  recalculados++;
}

console.log(`✓ PASSO 2: ${recalculados} registos recalculados`);

// Verificar resultado
const [amostra] = await conn.query(
  `SELECT data, en1, sa1, en2, sa2, en1Auto, saldo, atrasoEn FROM registos_diarios WHERE numero = ? AND ignorada = 0 ORDER BY id LIMIT 5`,
  [NUMERO]
);
console.log('\nAmostra dos primeiros 5 registos após recálculo:');
for (const r of amostra) {
  console.log(`  ${r.data}: EN1=${r.en1}${r.en1Auto ? '(auto)' : ''} SA1=${r.sa1} EN2=${r.en2} SA2=${r.sa2} | saldo=${r.saldo}min atraso=${r.atrasoEn}min`);
}

await conn.end();
console.log('\n✅ Recálculo da Clara concluído com sucesso');
