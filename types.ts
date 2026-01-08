
export interface SymbolAnalysis {
  name: string;
  meaning: string;
  jungianContext: string;
}

export interface ArchetypeAnalysis {
  name: string;
  description: string;
  manifestationInDream: string;
}

export interface EmotionalClimate {
  label: string;
  percentage: number;
}

export type DreamCategory = 'Ombra' | 'Intuizione' | 'Emozione';

export interface DreamAnalysisResponse {
  title: string;
  summary: string;
  symbols: SymbolAnalysis[];
  archetypes: ArchetypeAnalysis[];
  emotionalClimate: EmotionalClimate[];
  deepReflection: string;
  guidingQuestion: string;
  category: DreamCategory;
  practicalSynthesis: string;
}

export interface SavedDream {
  id: string;
  date: string;
  narrative: string;
  analysis: DreamAnalysisResponse;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
