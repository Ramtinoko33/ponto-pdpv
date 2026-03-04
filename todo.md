# Picagem de Ponto — TODO

## Backend / Base de Dados
- [x] Schema: tabelas meses, registos_diarios
- [x] API: upload e processamento de ficheiro XLSX
- [x] API: listar meses disponíveis
- [x] API: dados por mês (todos os colaboradores)
- [x] API: dados acumulados por colaborador
- [x] API: ranking (atrasos, almoço, extras, saída cedo)
- [x] API: detalhe diário por colaborador e mês
- [x] API: apagar mês

## Frontend — Dashboard
- [x] Layout com sidebar (DashboardLayout)
- [x] Página: Upload de ficheiro mensal
- [x] Página: Vista mensal — tabela de todos os colaboradores
- [x] Página: Vista acumulada — saldos por colaborador ao longo do ano
- [x] Página: Ranking — top atrasos, almoços, extras
- [x] Componente: seletor de mês
- [x] Componente: cards de resumo (total atrasos, extras, saldo geral)
- [x] Indicadores visuais: verde/vermelho/amarelo consistentes

## Regras de Processamento
- [x] Domingos e folgas (FIMS) ignorados
- [x] Sábados: 1 turno 08:30-13:00
- [x] Dias com justificação não alterados
- [x] Células vazias preenchidas com padrão (EN1=08:30 SA1=13:00 EN2=14:00 SA2=18:30)
- [x] Saída final detetada entre 17:00-20:00 em qualquer coluna
- [x] Sábados: valor >= 12:00 tratado como saída
- [x] Distribuição sequencial quando falta EN1 (valores reais em SA1/EN2/SA2)
- [x] Horários personalizados: Patricia (Nº29) e Pedro Silva (Nº12) — entrada 09:00
- [x] Lista de exclusão de colaboradores (DOMINGOS 1/2/3/C.TINOCO, BRUNO COSTA, WILSON CARVALHO, RICARDO TINOCO)
- [x] Colunas de detalhe: Atrasos Entrada, Excesso Almoço, Saída Cedo, Horas Extra

## Perfil de Colaborador
- [x] API: dados de perfil por colaborador (histórico de todos os meses)
- [x] API: registos diários de um colaborador num mês específico
- [x] Página: perfil do colaborador com histórico mensal
- [x] Componente: gráfico de saldo mensal ao longo do ano
- [x] Componente: tabela de registos diários com detalhe de picagens
- [x] Componente: cards de resumo (total atrasos, almoços, extras no período)
- [x] Navegação: link de perfil na Vista Mensal e Vista Acumulada
- [x] Navegação: rota /colaborador/:numero

## Edição Inline de Picagens
- [x] API: atualizar registo diário (EN1, SA1, EN2, SA2) e recalcular saldo
- [x] Página de detalhe completo por colaborador e mês — tabela com todos os dias
- [x] Células automáticas destacadas a amarelo/itálico (como no Excel)
- [x] Edição inline: clicar numa célula de hora para editar
- [x] Recálculo automático do saldo ao guardar alteração
- [x] Indicador visual de célula editada manualmente (diferente de automático)
- [x] Navegação para o detalhe a partir do perfil do colaborador

## Correções e Melhorias Pendentes
- [x] Corrigir erro 404 nas rotas /colaborador/* no site publicado (bug: coluna Número não era detetada por falta de acento)
- [x] Navegação entre colaboradores na vista de detalhe (anterior/próximo)

## Correções de Horário
- [x] Corrigir horário de entrada do Pedro Silva (nº12) e Patrícia (nº29) para 09:00 (em vez de 08:30)
- [x] Recalcular saldos de todos os registos afetados na BD (50 registos corrigidos)

## Administração de Horários Personalizados
- [x] Tabela horarios_custom na BD (numero, en1, sa1, en2, sa2)
- [x] Migrar dados hardcoded do código (Pedro Silva nº12 e Patrícia nº29) para a BD
- [x] Procedures tRPC: listar, criar/atualizar, remover horário personalizado
- [x] Motor de cálculo lê horários da BD em vez do código (mapa externo opcional)
- [x] Página /admin/horarios com lista de colaboradores e edição de horários
- [x] Recálculo automático dos saldos ao guardar alteração de horário

## Gestão de Colaboradores Excluídos
- [x] Tabela colaboradores_excluidos na BD (numero, nome, motivo)
- [x] Migrar dados hardcoded do código (97, 98, 99, 100, 67, 53, 33) para a BD
- [x] Procedures tRPC: listar, adicionar, remover excluídos
- [x] Motor de cálculo lê excluídos da BD em vez do código
- [x] Secção na página /admin/horarios para gerir excluídos

## Correções de Bugs
- [x] Corrigir ordem do recálculo no upsertHorarioCustom: EN1 automáticos devem ser atualizados ANTES de recalcular saldos
- [x] Recalcular manualmente os registos da Clara (nº13, en1=09:30) com a ordem correta
- [x] Ao excluir colaborador: opção para remover também os registos existentes na BD (checkbox com aviso de confirmação)
- [x] Corrigir erro "<a> cannot contain a nested <a>" no link "Horários Personalizados" do sidebar (Link com <a> aninhado)
