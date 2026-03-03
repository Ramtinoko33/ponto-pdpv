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
