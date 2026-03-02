# Ideas de Design — Sistema de Picagem de Ponto (Pneus D. Pedro V)

## Abordagem 1 — Industrial Precision
<response>
<text>
**Design Movement:** Bauhaus Industrial + Swiss Grid System
**Core Principles:** Funcionalidade máxima, hierarquia tipográfica rigorosa, dados como protagonistas, zero decoração supérflua
**Color Philosophy:** Cinzento carvão (#1C1C1E) como base, laranja âmbar (#F59E0B) como acento de alerta/ação, branco frio para texto e separadores. Transmite seriedade operacional de uma oficina.
**Layout Paradigm:** Painel lateral fixo à esquerda com navegação e estado, área central de conteúdo com tabela densa, barra superior com métricas-chave
**Signature Elements:** Linhas finas de separação, tipografia monospace para horas/minutos, badges coloridos para saldo positivo/negativo
**Interaction Philosophy:** Upload por drag-and-drop com feedback imediato, células corrigidas destacadas com cor diferente, hover revela tooltip com regra aplicada
**Animation:** Fade-in suave da tabela ao processar, contador animado nos totais
**Typography System:** IBM Plex Mono para valores numéricos/horas, IBM Plex Sans para labels e UI
</text>
<probability>0.08</probability>
</response>

## Abordagem 2 — Clean Operational Dashboard
<response>
<text>
**Design Movement:** Material Design 3 + Operational Clarity
**Core Principles:** Clareza imediata, cores semânticas (verde/vermelho para saldo), densidade informacional controlada, mobile-friendly
**Color Philosophy:** Fundo branco quente (#FAFAF9), azul petróleo (#0F4C75) como cor primária institucional, verde esmeralda (#10B981) para positivo, vermelho coral (#EF4444) para negativo. Paleta profissional e legível.
**Layout Paradigm:** Layout de página única com zona de upload no topo, tabela de resultados abaixo, painel de resumo lateral colapsável
**Signature Elements:** Cards de métricas com ícones, tabela com linhas alternadas, filtros por colaborador/data
**Interaction Philosophy:** Upload simples com preview imediato, filtros rápidos, exportação com um clique
**Animation:** Slide-down da tabela após processamento, pulse nos números ao calcular
**Typography System:** Inter para UI, JetBrains Mono para valores de tempo
</text>
<probability>0.07</probability>
</response>

## Abordagem 3 — Dark Command Center ✅ ESCOLHIDA
<response>
<text>
**Design Movement:** Dark Mode Operational + Terminal Aesthetic
**Core Principles:** Foco total nos dados, contraste máximo para leitura rápida, sensação de ferramenta profissional de gestão
**Color Philosophy:** Fundo escuro profundo (#0F1117), cinzento escuro para cards (#1A1D27), verde néon suave (#22C55E) para positivo, vermelho (#EF4444) para negativo, amarelo (#EAB308) para preenchimento automático. Evoca painel de controlo industrial.
**Layout Paradigm:** Header fixo com logo e métricas globais, zona central com upload e tabela de resultados, sem sidebar — tudo numa página vertical fluida
**Signature Elements:** Bordas finas coloridas nos cards, fonte monospace para todos os valores de tempo, indicadores visuais distintos para dados originais vs. preenchidos automaticamente
**Interaction Philosophy:** Drag-and-drop de ficheiro com animação de processamento, tabela filtrável por nome/data, toggle para mostrar/esconder linhas automáticas
**Animation:** Efeito de "scan" ao processar ficheiro, rows aparecem sequencialmente, números contam até ao valor final
**Typography System:** Space Grotesk para títulos e UI, Space Mono para todos os valores de tempo e horas
</text>
<probability>0.06</probability>
</response>

---

## DECISÃO: Abordagem 3 — Dark Command Center
Escolhida por transmitir profissionalismo operacional, maximizar legibilidade dos dados numéricos e criar uma ferramenta que parece construída especificamente para gestão de ponto — não um formulário genérico.
