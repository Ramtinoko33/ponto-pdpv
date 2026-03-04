/**
 * migrar-excluidos.mjs
 * Migra os números excluídos hardcoded do código para a tabela colaboradores_excluidos
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Números hardcoded no pontoEngine.ts: '97', '98', '99', '100', '67', '53', '33'
const excluidos = [
  { numero: '33', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '53', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '67', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '97', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '98', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '99', nome: null, motivo: 'Excluído do processamento (configuração original)' },
  { numero: '100', nome: null, motivo: 'Excluído do processamento (configuração original)' },
];

// Tentar obter nomes da tabela de registos
const [rows] = await conn.query(
  'SELECT DISTINCT numero, nome FROM registos_diarios WHERE numero IN (?) ORDER BY CAST(numero AS UNSIGNED)',
  [excluidos.map(e => e.numero)]
);
const nomeMap = {};
for (const r of rows) nomeMap[r.numero] = r.nome;

let inseridos = 0;
for (const e of excluidos) {
  const nome = nomeMap[e.numero] ?? null;
  try {
    await conn.query(
      'INSERT IGNORE INTO colaboradores_excluidos (numero, nome, motivo) VALUES (?, ?, ?)',
      [e.numero, nome, e.motivo]
    );
    inseridos++;
    console.log(`✓ Nº${e.numero} ${nome ? `(${nome})` : ''} — inserido`);
  } catch (err) {
    console.log(`⚠ Nº${e.numero} — já existe ou erro: ${err.message}`);
  }
}

console.log(`\n✅ ${inseridos} excluídos migrados para a BD`);
await conn.end();
