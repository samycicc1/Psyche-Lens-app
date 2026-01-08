
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyzeDream, sendChatMessage } from './services/geminiService';
import { DreamAnalysisResponse, SavedDream, DreamCategory, EmotionalClimate, ChatMessage } from './types';
import { LoadingOverlay } from './components/LoadingOverlay';
import { SymbolCard } from './components/SymbolCard';
import { ArchetypeCard } from './components/ArchetypeCard';

// Motore per il suono ambiente "Celestial Ambient / Zen"
const AmbientDrone: React.FC<{ active: boolean; muted: boolean }> = ({ active, muted }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<any | null>(null);

  const startAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
      gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const ctx = audioCtxRef.current;
    const masterGain = gainNodeRef.current!;

    const baseFreqs = [220, 329.63, 440]; 
    baseFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      amp.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(filter);
      filter.connect(amp);
      amp.connect(masterGain);
      osc.start();
      oscillatorsRef.current.push(osc);
    });

    const playChime = () => {
      if (!active || muted || !audioCtxRef.current) return;
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const chimeFilter = ctx.createBiquadFilter();
      const frequencies = [523.25, 659.25, 783.99, 987.77, 1046.50];
      const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, ctx.currentTime);
      chimeFilter.type = 'lowpass';
      chimeFilter.frequency.setValueAtTime(2000, ctx.currentTime);
      chimeGain.gain.setValueAtTime(0, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
      chimeOsc.connect(chimeFilter);
      chimeFilter.connect(chimeGain);
      chimeGain.connect(masterGain);
      chimeOsc.start();
      chimeOsc.stop(ctx.currentTime + 4);
      timeoutRef.current = setTimeout(playChime, Math.random() * 4000 + 2000);
    };
    playChime();
  }, [active, muted]);

  const stopAudio = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (gainNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        oscillatorsRef.current.forEach(osc => { try { osc.stop(); } catch (e) {} });
        oscillatorsRef.current = [];
      }, 1600);
    }
  }, []);

  useEffect(() => {
    if (active && !muted) {
      startAudio();
      if (gainNodeRef.current && audioCtxRef.current) gainNodeRef.current.gain.linearRampToValueAtTime(0.12, audioCtxRef.current.currentTime + 2);
    } else {
      stopAudio();
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [active, muted, startAudio, stopAudio]);

  return null;
};

const BlurTypewriter: React.FC<{ text: string; delayOffset?: number }> = ({ text, delayOffset = 0 }) => {
  let globalIndex = 0;
  const words = text.split(' ');
  return (
    <>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-block whitespace-nowrap">
          {word.split('').map((char) => {
            const delay = (globalIndex++ * 0.05) + delayOffset;
            return <span key={globalIndex} className="letter-reveal" style={{ animationDelay: `${delay}s` }}>{char}</span>;
          })}
          {wordIdx < words.length - 1 && <span className="letter-reveal" style={{ animationDelay: `${(globalIndex++ * 0.05) + delayOffset}s` }}>&nbsp;</span>}
        </span>
      ))}
    </>
  );
};

const StarCascade: React.FC = () => {
  const [particles] = useState(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i, left: Math.random() * 100, size: Math.random() * 5 + 2,
    duration: Math.random() * 1.5 + 1.5, delay: Math.random() * 0.8,
    color: Math.random() > 0.4 ? '#FACC15' : '#FFFFFF', opacity: Math.random() * 0.5 + 0.5,
  })));
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full shadow-lg" style={{
          left: `${p.left}%`, top: '-20px', width: `${p.size}px`, height: `${p.size}px`,
          backgroundColor: p.color, boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          opacity: p.opacity, animation: `stardust-fall ${p.duration}s cubic-bezier(0.4, 0, 0.2, 1) ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [dreamNarrative, setDreamNarrative] = useState('');
  const [analysis, setAnalysis] = useState<DreamAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<SavedDream[]>([]);
  const [view, setView] = useState<'input' | 'result' | 'history' | 'dictionary'>('input');
  const [showCascade, setShowCascade] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [showInfo, setShowInfo] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('psyche_lens_history');
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch (e) { console.error("History load error", e); }
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [dreamNarrative]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveToHistory = (newAnalysis: DreamAnalysisResponse, narrative: string) => {
    const entry: SavedDream = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
      narrative,
      analysis: newAnalysis
    };
    setHistory(prev => {
      const updated = [entry, ...prev];
      localStorage.setItem('psyche_lens_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async () => {
    if (!dreamNarrative.trim()) return;
    setIsLoading(true);
    try {
      const result = await analyzeDream(dreamNarrative);
      setAnalysis(result);
      setChatMessages([{ role: 'model', text: `Benvenuto. Ho analizzato la tua visione. Considera questa domanda per iniziare il nostro dialogo: "${result.guidingQuestion}"` }]);
      saveToHistory(result, dreamNarrative);
      setView('result');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageToSend = text || chatInput;
    if (!messageToSend.trim() || !analysis || isChatLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', text: messageToSend };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await sendChatMessage(dreamNarrative, analysis, chatMessages, messageToSend);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Il sentiero verso l'inconscio è momentaneamente interrotto. Riprova tra poco." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const reset = () => {
    setDreamNarrative('');
    setAnalysis(null);
    setChatMessages([]);
    setView('input');
  };

  const getCategoryTag = (category: DreamCategory) => {
    switch (category) {
      case 'Ombra': return { icon: '🌑', label: 'Ombra', color: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'Intuizione': return { icon: '💡', label: 'Intuizione', color: 'bg-amber-900/30 text-amber-200 border-amber-800/50' };
      case 'Emozione': return { icon: '🌊', label: 'Emozione', color: 'bg-blue-900/30 text-blue-200 border-blue-800/50' };
      default: return { icon: '✨', label: 'Sogno', color: 'bg-indigo-900/30 text-indigo-200 border-indigo-800/50' };
    }
  };

  const getEmotionColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('ansia') || l.includes('paura')) return 'bg-rose-500/50 text-rose-100 border-rose-500/30';
    if (l.includes('meraviglia') || l.includes('gioia')) return 'bg-amber-400/50 text-amber-100 border-amber-400/30';
    if (l.includes('mistero') || l.includes('curiosità')) return 'bg-violet-500/50 text-violet-100 border-violet-500/30';
    if (l.includes('pace') || l.includes('serenità')) return 'bg-emerald-400/50 text-emerald-100 border-emerald-400/30';
    return 'bg-indigo-500/50 text-indigo-100 border-indigo-500/30';
  };

  const renderInputView = () => (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-bold mb-10 tracking-tight italic relative inline-block px-4 title-enhanced">Psyche Lens</h1>
        <div className="relative max-w-2xl mx-auto py-8">
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 blur-[80px] rounded-full animate-aurora opacity-40"></div>
          </div>
          <div className="relative z-10 space-y-3">
            <div className="text-slate-200 text-xl md:text-2xl leading-relaxed italic font-light drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] min-h-[4em]">
              <BlurTypewriter text="I sogni sono le stelle guida che illuminano il cammino verso la realizzazione del proprio Sè." />
            </div>
            <div className="text-indigo-300 text-sm md:text-base font-medium tracking-widest opacity-80 uppercase min-h-[1.5em]">
              <BlurTypewriter text="— Carl Jung" delayOffset={5} />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto mb-16 px-4">
        <label className="block text-slate-400 text-xs font-bold mb-6 uppercase tracking-[0.4em] text-center opacity-70">Affida il tuo sogno alla lente</label>
        <div className="relative group/input">
          <textarea ref={textareaRef} value={dreamNarrative} onChange={(e) => setDreamNarrative(e.target.value)} placeholder="Ero un'aquila che sorvolava un deserto di specchi..." className={`w-full min-h-[180px] bg-slate-900/40 text-white rounded-[20px] p-8 border border-amber-400/20 focus:border-amber-400/60 focus:shadow-[0_0_30px_rgba(251,191,36,0.15)] outline-none transition-all duration-500 resize-none text-lg leading-relaxed placeholder:text-slate-500/60 backdrop-blur-xl shadow-2xl ${isDissolving ? 'dissolve-text' : ''}`} />
          {dreamNarrative && (
            <button onClick={() => setDreamNarrative('')} className="absolute bottom-5 right-6 p-2 text-amber-200/50 hover:text-amber-300 hover:scale-110 transition-all bg-white/5 rounded-full backdrop-blur-sm border border-white/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.912 5.886L20 10l-6.088 1.114L12 17l-1.912-5.886L4 10l6.088-1.114L12 3z"/></svg>
            </button>
          )}
        </div>
        <div className="mt-12 flex flex-col items-center mb-16">
          <button onClick={handleAnalyze} disabled={!dreamNarrative.trim() || isLoading} className="group relative px-16 py-5 bg-transparent border border-indigo-400/40 hover:border-indigo-300 text-indigo-100 font-medium rounded-full transition-all active:scale-95 disabled:opacity-30 shadow-lg">
            <span className="relative z-10 tracking-[0.2em] uppercase text-xs font-bold">Inizia l'Analisi</span>
          </button>
        </div>

        {/* Consigli per Sognatori */}
        <section className="mb-12 animate-fadeIn" style={{ animationDelay: '1s' }}>
          <h3 className="text-center text-xs uppercase tracking-[0.5em] text-indigo-400/60 mb-8 font-bold">Consigli per Sognatori</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border-indigo-500/10">
              <div className="text-3xl mb-4">✍️</div>
              <h4 className="text-indigo-200 font-bold mb-2 serif text-lg">Scrivi subito</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Appunta il sogno appena ti svegli, i dettagli sfumano in pochi minuti.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl border-indigo-500/10">
              <div className="text-3xl mb-4">🔍</div>
              <h4 className="text-indigo-200 font-bold mb-2 serif text-lg">Cerca l'emozione</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Più che le immagini, conta come ti sentivi (eri felice, terrorizzato o curioso?).</p>
            </div>
            <div className="glass-card p-6 rounded-2xl border-indigo-500/10">
              <div className="text-3xl mb-4">🧩</div>
              <h4 className="text-indigo-200 font-bold mb-2 serif text-lg">Personalizza</h4>
              <p className="text-slate-400 text-sm leading-relaxed">I simboli sono universali, ma il significato dipende dalla tua vita personale.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderResultView = () => {
    if (!analysis) return null;
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 pb-32 animate-fadeIn">
        <div className="flex flex-wrap justify-between items-center mb-12 gap-4">
          <button onClick={() => setView('input')} className="text-slate-500 hover:text-white flex items-center gap-3 uppercase text-xs tracking-widest group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Nuova Visione
          </button>
          <button onClick={() => { navigator.clipboard.writeText(analysis.summary); setCopyStatus('copied'); setTimeout(() => setCopyStatus('idle'), 2000); }} className="px-6 py-2 bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 rounded-full text-[10px] uppercase tracking-widest transition-all">
            {copyStatus === 'copied' ? "Copiato" : "Copia Analisi"}
          </button>
        </div>

        <header className="mb-20 text-center">
          <div className="flex justify-center mb-6">
            <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold border ${getCategoryTag(analysis.category).color}`}>{analysis.category}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-indigo-100 italic">{analysis.title}</h2>
          <p className="text-xl md:text-2xl text-slate-400 italic leading-relaxed max-w-3xl mx-auto font-light">{analysis.summary}</p>
        </header>

        <section className="mb-20 max-w-2xl mx-auto">
          <h3 className="text-center text-xs uppercase tracking-[0.4em] text-slate-500 mb-8 font-bold">Clima Emotivo</h3>
          <div className="grid gap-6">
            {analysis.emotionalClimate.map((emotion, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-200">{emotion.label}</span>
                  <span className="text-slate-400 font-mono">{emotion.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                  <div className={`h-full ${getEmotionColor(emotion.label).split(' ')[0]} transition-all duration-1000`} style={{ width: `${emotion.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-12 mb-20">
          <div className="lg:col-span-2 space-y-12">
            <div className="grid md:grid-cols-2 gap-6">{analysis.symbols.map((s, i) => <SymbolCard key={i} symbol={s} />)}</div>
            <div className="grid gap-6">{analysis.archetypes.map((a, i) => <ArchetypeCard key={i} archetype={a} />)}</div>
          </div>
          <aside>
             <div className="glass-card p-8 rounded-3xl sticky top-8 border-indigo-500/10">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-6">L'Incontro con il Sè</h3>
                <p className="text-slate-300 leading-loose italic">{analysis.deepReflection}</p>
                <div className="mt-8 pt-6 border-t border-white/5">
                   <p className="text-amber-200/80 text-sm font-serif italic">"{analysis.guidingQuestion}"</p>
                </div>
             </div>
          </aside>
        </div>

        {/* Chat Section */}
        <section className="max-w-4xl mx-auto mb-20">
          <div className="bg-slate-900/40 border border-indigo-500/10 rounded-[2rem] p-6 md:p-10 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs uppercase tracking-[0.6em] text-indigo-300 font-bold mb-10 text-center">Dialogo con il Mentore</h3>
            
            <div className="space-y-6 mb-10 max-h-[500px] overflow-y-auto px-4 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-2xl backdrop-blur-md border ${msg.role === 'user' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-50' : 'bg-slate-800/40 border-slate-700/50 text-slate-200'} animate-fadeIn`}>
                    <p className="text-sm md:text-base leading-relaxed italic">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/40 p-4 rounded-2xl animate-pulse text-indigo-300 text-xs uppercase tracking-widest">Il mentore riflette...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {['Approfondisci un simbolo', 'Collega alla mia realtà', 'Come posso agire?', 'È un messaggio positivo?'].map((chip) => (
                  <button key={chip} onClick={() => handleSendMessage(chip)} className="px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-[10px] uppercase tracking-widest hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all active:scale-95">
                    {chip}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Approfondisci con il mentore..." 
                  className="w-full bg-slate-950/40 border border-slate-700/50 rounded-full py-4 px-8 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-600 italic"
                />
                <button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isChatLoading} className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-full transition-all disabled:opacity-20">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-12 border-t border-slate-800/50">
          <button onClick={reset} className="px-10 py-4 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-200 border border-indigo-500/30 rounded-full text-sm uppercase tracking-widest">Concludi sessione</button>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-16">
        <button onClick={() => setView('input')} className="text-slate-500 hover:text-white flex items-center gap-3 uppercase text-xs tracking-widest group">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
          Torna al Presente
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        {history.map((item) => (
          <div key={item.id} onClick={() => { setAnalysis(item.analysis); setView('result'); }} className="glass-card p-8 rounded-[2.5rem] hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col h-full">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">{item.date}</span>
            <h3 className="text-2xl font-bold text-white mb-4 italic leading-snug">{item.analysis.title}</h3>
            <p className="text-slate-400 line-clamp-3 italic mb-8 flex-grow">"{item.narrative}"</p>
            <div className="flex gap-2">
               <span className="px-3 py-1 rounded-full text-[9px] uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">{item.analysis.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDictionaryView = () => (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-16">
        <button onClick={() => setView('input')} className="text-slate-500 hover:text-white flex items-center gap-3 uppercase text-xs tracking-widest group">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Torna alla Visione
        </button>
      </div>

      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight serif italic">Piccolo Dizionario dei Simboli</h2>
        <div className="h-px w-24 bg-indigo-500/30 mx-auto"></div>
        <p className="mt-8 text-slate-400 italic max-w-2xl mx-auto leading-relaxed text-sm">
          "Il simbolo è sempre un'espressione di qualcosa che non può essere espresso altrimenti che mediante il simbolo stesso."
        </p>
      </div>

      <div className="grid gap-6 mb-20 md:grid-cols-2 lg:grid-cols-3">
        {[
          { emoji: '🌊', name: 'Acqua', desc: 'Rappresenta l\'inconscio e il fluire delle emozioni. Se è calma indica pace, se agitata indica tempeste interiori.' },
          { emoji: '🕊️', name: 'Volare', desc: 'Simboleggia il desiderio di libertà, il superamento di un ostacolo o il bisogno di trascendere la realtà.' },
          { emoji: '扉', name: 'Porte', desc: 'Rappresentano nuove opportunità o soglie tra diversi stati di coscienza e parti di sè.' },
          { emoji: '🌑', name: 'Ombra', desc: 'Una figura oscura spesso rappresenta aspetti del carattere che non accettiamo o che ci spaventano.' },
          { emoji: '🧩', name: 'Labirinto', desc: 'Simbolo del viaggio interiore, della ricerca del Sè attraverso la confusione della vita.' },
          { emoji: '🌳', name: 'Bosco', desc: 'L\'inconscio selvaggio, il luogo della prova e dell\'ignoto dove avviene la trasformazione.' },
          { emoji: '🪞', name: 'Specchio', desc: 'Rappresenta la riflessione del Sè e la necessità di guardare onestamente alla propria verità.' },
          { emoji: '🏔️', name: 'Montagna', desc: 'L\'ascesa verso la consapevolezza superiore e gli sforzi necessari per raggiungerla.' },
          { emoji: '🗝️', name: 'Chiave', desc: 'Simboleggia la scoperta di un segreto o l\'accesso a una nuova risorsa interiore.' }
        ].map((s, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl border-l-2 border-indigo-500/40 flex items-start gap-4 transition-all hover:bg-indigo-500/5 group">
            <span className="text-3xl filter group-hover:scale-110 transition-transform duration-500 shrink-0">{s.emoji}</span>
            <div>
              <h4 className="text-lg font-bold text-indigo-200 mb-1 serif uppercase tracking-wider">{s.name}</h4>
              <p className="text-slate-400 leading-relaxed text-sm italic">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mb-10">
        <h3 className="text-2xl font-bold text-white mb-4 tracking-tight serif italic">Simbologia dei Colori</h3>
        <div className="h-px w-16 bg-amber-400/30 mx-auto"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { color: '🔴', name: 'Rosso', desc: 'Passione, energia vitale, rabbia o pericolo imminente.' },
          { color: '🔵', name: 'Blu', desc: 'Calma, spiritualità, profondità e riflessione pacata.' },
          { color: '🟡', name: 'Giallo', desc: 'Luce, intelletto vigile e nuove intuizioni consce.' },
          { color: '🟢', name: 'Verde', desc: 'Crescita, rigenerazione della psiche e speranza.' }
        ].map((c, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl border-t-2 border-amber-400/20 flex flex-col items-center text-center gap-4 transition-all hover:bg-amber-400/5 group">
            <span className="text-4xl filter group-hover:rotate-12 transition-transform duration-500">{c.color}</span>
            <div>
              <h4 className="text-md font-bold text-amber-100 mb-1 serif uppercase tracking-widest">{c.name}</h4>
              <p className="text-slate-400 leading-relaxed text-xs italic">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 p-10 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 max-w-2xl mx-auto text-center">
        <p className="text-indigo-300 italic serif text-lg leading-relaxed">
          "Usa questi simboli come bussole, ma ricorda che la vera mappa del tuo inconscio è scritta con il tuo sangue e le tue lacrime."
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {isLoading && <LoadingOverlay />}
      {showCascade && <StarCascade />}
      <AmbientDrone active={view === 'result'} muted={isMuted} />
      
      {showInfo && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowInfo(false)}>
          <div className="glass-card p-10 md:p-12 rounded-3xl max-w-2xl relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 serif text-center">Esplora Psyche Lens</h2>
            
            <div className="space-y-8 text-slate-300 text-sm md:text-base leading-relaxed italic">
              <section className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10">
                <h3 className="text-indigo-200 font-bold mb-4 uppercase tracking-widest text-xs">L'Applicazione</h3>
                <p>Psyche Lens è il tuo portale verso l'Inconscio. Utilizziamo la psicologia archetipica per interpretare i sogni, identificando simboli universali e figure come l'Ombra, l'Anima e l'Animus.</p>
              </section>

              <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-amber-200 font-bold mb-4 uppercase tracking-widest text-xs">Chi era Carl Gustav Jung?</h3>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                   <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-400/20 flex items-center justify-center text-4xl shrink-0 grayscale hover:grayscale-0 transition-all duration-700">🧔🏻‍♂️</div>
                   <div>
                     <p className="mb-3"><span className="text-amber-100 font-bold">Carl Gustav Jung (1875-1961)</span> è stato uno psichiatra e psicoanalista svizzero, fondatore della psicologia analitica.</p>
                     <p>A differenza di Freud, Jung credeva che i sogni non fossero solo desideri repressi, ma messaggi di un <span className="text-amber-100">Inconscio Collettivo</span> — un magazzino ereditario di saggezza umana espresso attraverso gli <span className="text-amber-100 italic">Archetipi</span>.</p>
                   </div>
                </div>
              </section>

              <p className="text-center text-indigo-200/60 mt-4">Ogni sogno salvato è un frammento prezioso del tuo processo di individuazione.</p>
            </div>
            <div className="mt-10 pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Versione 1.5 — Jungian Matrix</p>
            </div>
          </div>
        </div>
      )}

      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto relative z-10">
        <div onClick={reset} className="cursor-pointer group">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#FACC15" className="filter drop-shadow-[0_0_8px_rgba(250,204,21,0.4)] group-hover:scale-110 transition-all">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>
        <div className="flex items-center gap-4 md:gap-8 text-[10px] uppercase tracking-[0.3em] font-bold">
          <button onClick={() => setView('input')} className={view === 'input' ? 'text-indigo-400' : 'text-slate-500 hover:text-white transition-colors'}>Sogno</button>
          <button onClick={() => setView('dictionary')} className={view === 'dictionary' ? 'text-indigo-400' : 'text-slate-500 hover:text-white transition-colors'}>Simboli & Colori</button>
          <button onClick={() => setView('history')} className={view === 'history' ? 'text-indigo-400' : 'text-slate-500 hover:text-white transition-colors'}>Memoria</button>
          
          <div className="flex items-center gap-3 ml-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isMuted ? 'border-rose-500/30 text-rose-400 bg-rose-500/5' : 'border-slate-700 text-slate-500 hover:text-indigo-300'}`}
              title={isMuted ? "Attiva Audio" : "Silenzia Ambiente"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button 
              onClick={() => setShowInfo(true)} 
              className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-300 hover:border-indigo-400/50 transition-all font-serif italic text-lg shadow-sm"
              title="Informazioni"
            >
              i
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {view === 'input' && renderInputView()}
        {view === 'result' && renderResultView()}
        {view === 'history' && renderHistoryView()}
        {view === 'dictionary' && renderDictionaryView()}
      </main>

      <footer className="py-20 text-center text-slate-600 text-[10px] uppercase tracking-[0.5em] relative z-10">
        <p>© {new Date().getFullYear()} Psyche Lens — Archetypal Dream Matrix</p>
      </footer>
    </div>
  );
};

export default App;
