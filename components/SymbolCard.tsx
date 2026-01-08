
import React from 'react';
import { SymbolAnalysis } from '../types';

interface SymbolCardProps {
  symbol: SymbolAnalysis;
}

export const SymbolCard: React.FC<SymbolCardProps> = ({ symbol }) => {
  return (
    <div className="glass-card p-6 rounded-2xl transition-all hover:scale-[1.02] border-l-4 border-indigo-400">
      <h4 className="text-xl font-bold mb-2 text-indigo-300 capitalize">{symbol.name}</h4>
      <p className="text-slate-300 text-sm mb-3 italic">"{symbol.meaning}"</p>
      <div className="text-slate-400 text-sm leading-relaxed">
        <span className="font-semibold text-slate-300">Perspective Junguiana:</span> {symbol.jungianContext}
      </div>
    </div>
  );
};
