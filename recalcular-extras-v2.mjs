/**
 * Recalcula extra10Min e extra15Min para todos os registos com a lógica corrigida:
 * - extraSa <= 30min → tudo a 10€/h (extra10Min = extraSa, extra15Min = 0)
 * - extraSa > 30min  → TODOS os minutos a 15€/h (extra10Min = 0, extra15Min = extraSa)
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar todos os registos não ignorados com extraSa > 0
const [rows] = await conn.execute(
  'SELECT id, extraSa FROM registos_diarios WHERE ignorada = 0 AND extraSa > 0'
);

console.log(`Total de registos com horas extra: ${rows.length}`);

let atualizados = 0;
let exemplos = [];

for (const row of rows) {
  const extraSa = row.extraSa;
  let extra10Min, extra15Min;

  if (extraSa <= 30) {
    // Até 30min: tudo a 10€/h
    extra10Min = extraSa;
    extra15Min = 0;
  } else {
    // Mais de 30min: TODOS os minutos a 15€/h
    extra10Min = 0;
    extra15Min = extraSa;
  }

  await conn.execute(
    'UPDATE registos_diarios SET extra10Min = ?, extra15Min = ? WHERE id = ?',
    [extra10Min, extra15Min, row.id]
  );
  atualizados++;

  // Guardar exemplos para verificação
  if (exemplos.length < 5) {
    exemplos.push({ id: row.id, extraSa, extra10Min, extra15Min, euros: ((extra10Min/60)*10 + (extra15Min/60)*15).toFixed(2) });
  }
}

console.log(`\n✅ ${atualizados} registos atualizados`);
console.log('\nExemplos:');
for (const e of exemplos) {
  console.log(`  ID ${e.id}: extraSa=${e.extraSa}min → @10€=${e.extra10Min}min, @15€=${e.extra15Min}min = ${e.euros}€`);
}

await conn.end();
