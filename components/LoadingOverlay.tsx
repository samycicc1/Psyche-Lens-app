
import React, { useState, useEffect } from 'react';

const QUOTES = [
  "Chi guarda fuori sogna; chi guarda dentro si sveglia.",
  "Il sogno è la piccola porta occulta che conduce alla parte più intima e segreta dell'anima.",
  "Fino a quando non renderai conscio l'inconscio, esso dirigerà la tua vita e tu lo chiamerai destino.",
  "Il tuo sogno è un dipinto dell'anima che attende di essere svelato.",
  "Nel sogno, l'anima parla un linguaggio di immagini universali.",
  "L'incontro con se stessi è, all'inizio, l'incontro con la propria ombra."
];

export const LoadingOverlay: React.FC = () => {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
        setFade(true);
      }, 1000); // Wait for fade out
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center p-8 backdrop-blur-xl transition-all duration-1000">
      {/* Golden Sparks Animation */}
      <div className="relative w-48 h-48 mb-16 flex items-center justify-center">
        {/* Pulsing Central Glow */}
        <div className="absolute w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-16 h-16 bg-amber-400/5 rounded-full blur-2xl animate-ping"></div>
        
        {/* Rotating Sparks Layer 1 */}
        <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
          {[...Array(6)].map((_, i) => (
            <div 
              key={`spark1-${i}`}
              className="absolute w-1 h-1 bg-amber-300 rounded-full shadow-[0_0_8px_#FCD34D]"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translate(60px, 0)`
              }}
            />
          ))}
        </div>

        {/* Rotating Sparks Layer 2 (Reverse) */}
        <div className="absolute inset-0 animate-[spin_12s_linear_infinite_reverse]">
          {[...Array(8)].map((_, i) => (
            <div 
              key={`spark2-${i}`}
              className="absolute w-1.5 h-1.5 bg-indigo-300 rounded-full shadow-[0_0_10px_#A5B4FC] opacity-40"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 45}deg) translate(85px, 0)`
              }}
            />
          ))}
        </div>

        {/* Central Icon */}
        <div className="relative z-10 text-amber-200 opacity-80 animate-pulse">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
        </div>
      </div>

      <div className={`max-w-2xl transition-all duration-1000 transform ${fade ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="serif text-2xl md:text-3xl text-center text-indigo-100 italic leading-relaxed font-light">
          "{QUOTES[quoteIdx]}"
        </p>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2">
        <span className="text-slate-600 text-[10px] uppercase tracking-[0.6em] animate-pulse">
          Esplorando l'Inconscio
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
