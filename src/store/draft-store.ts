import { create } from 'zustand';

export interface Draft {
  id: string;
  name: string | null;
  promptText: string | null;
  content: string;
  wordCount: number;
  tag: 'IN_PROGRESS' | 'FINAL' | 'REVIEW' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

interface DraftState {
  drafts: Draft[];
  currentDraft: Draft | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDrafts: (drafts: Draft[]) => void;
  setCurrentDraft: (draft: Draft | null) => void;
  addDraft: (draft: Draft) => void;
  updateDraft: (id: string, updates: Partial<Draft>) => void;
  removeDraft: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearDrafts: () => void;
}

export const useDraftStore = create<DraftState>((set) => ({
  drafts: [],
  currentDraft: null,
  isLoading: false,
  error: null,

  setDrafts: (drafts) => set({ drafts, error: null }),
  setCurrentDraft: (draft) => set({ currentDraft: draft }),

  addDraft: (draft) =>
    set((state) => ({
      drafts: [draft, ...state.drafts],
    })),

  updateDraft: (id, updates) =>
    set((state) => ({
      drafts: state.drafts.map((draft) => (draft.id === id ? { ...draft, ...updates } : draft)),
      currentDraft:
        state.currentDraft?.id === id ? { ...state.currentDraft, ...updates } : state.currentDraft,
    })),

  removeDraft: (id) =>
    set((state) => ({
      drafts: state.drafts.filter((draft) => draft.id !== id),
      currentDraft: state.currentDraft?.id === id ? null : state.currentDraft,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearDrafts: () => set({ drafts: [], currentDraft: null, error: null }),
}));
