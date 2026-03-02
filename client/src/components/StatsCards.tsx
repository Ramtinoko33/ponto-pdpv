/**
 * StatsCards — Cards de estatísticas globais
 * Design: Dark Command Center
 */

import { type Stats } from '@/lib/pontoProcessor';
import { TrendingUp, TrendingDown, Users, Zap, Calendar, AlertTriangle } from 'lucide-react';

interface Props {
  stats: Stats;
}

export function StatsCards({ stats }: Props) {
  const isPositive = stats.totalSaldoMinutos >= 0;

  const cards = [
    {
      label: 'Saldo Total',
      value: stats.totalSaldoFormatado,
      sub: isPositive ? 'minutos a favor' : 'minutos em falta',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      color: isPositive ? 'text-green-400' : 'text-red-400',
      borderColor: isPositive ? 'border-green-500/20' : 'border-red-500/20',
      bgColor: isPositive ? 'bg-green-500/5' : 'bg-red-500/5',
      mono: true,
    },
    {
      label: 'Colaboradores',
      value: String(stats.colaboradores),
      sub: 'com registos ativos',
      icon: <Users className="w-4 h-4" />,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/20',
      bgColor: 'bg-blue-500/5',
      mono: false,
    },
    {
      label: 'Dias processados',
      value: String(stats.diasProcessados),
      sub: `${stats.diasIgnorados} ignorados (dom/folga)`,
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      bgColor: 'bg-purple-500/5',
      mono: false,
    },
    {
      label: 'Preenchimento auto',
      value: String(stats.celulasPreenchidas),
      sub: 'células completadas',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-yellow-400',
      borderColor: 'border-yellow-500/20',
      bgColor: 'bg-yellow-500/5',
      mono: false,
    },
    {
      label: 'Justificações',
      value: String(stats.diasComJustificacao),
      sub: 'dias com justificação',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      bgColor: 'bg-orange-500/5',
      mono: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`rounded-lg border p-4 ${card.borderColor} ${card.bgColor} space-y-2`}
        >
          <div className={`flex items-center gap-2 ${card.color}`}>
            {card.icon}
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
          </div>
          <p className={`text-xl font-bold ${card.color} ${card.mono ? 'font-mono' : ''}`}>
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
