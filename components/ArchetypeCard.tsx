
import React from 'react';
import { ArchetypeAnalysis } from '../types';

interface ArchetypeCardProps {
  archetype: ArchetypeAnalysis;
}

export const ArchetypeCard: React.FC<ArchetypeCardProps> = ({ archetype }) => {
  return (
    <div className="glass-card p-6 rounded-2xl border-t-4 border-violet-500 shadow-xl pulse-glow transition-transform hover:scale-[1.01]">
      <h4 className="text-2xl font-bold mb-2 text-violet-300">{archetype.name}</h4>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{archetype.description}</p>
      <div className="bg-slate-900/50 p-4 rounded-lg">
        <p className="text-indigo-200 text-sm italic leading-relaxed">
          <span className="font-semibold text-indigo-100">Presenza nel sogno:</span> {archetype.manifestationInDream}
        </p>
      </div>
    </div>
  );
};
