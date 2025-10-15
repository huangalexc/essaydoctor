import { create } from 'zustand';

interface UsageStats {
  aiEditsCount: number;
  aiEditsLimit: number;
  customizationsCount: number;
  customizationsLimit: number;
  schoolFetchesCount: number;
  schoolFetchesLimit: number;
  draftsCount: number;
  draftsLimit: number;
  periodEnd: string;
}

interface UsageState {
  usage: UsageStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsage: (usage: UsageStats) => void;
  incrementAiEdits: () => void;
  incrementCustomizations: () => void;
  incrementSchoolFetches: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUsage: () => void;

  // Computed
  canEditEssay: () => boolean;
  canCustomizeEssay: () => boolean;
  canFetchSchool: () => boolean;
  canCreateDraft: () => boolean;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  usage: null,
  isLoading: false,
  error: null,

  setUsage: (usage) => set({ usage, error: null }),

  incrementAiEdits: () =>
    set((state) =>
      state.usage ? { usage: { ...state.usage, aiEditsCount: state.usage.aiEditsCount + 1 } } : {}
    ),

  incrementCustomizations: () =>
    set((state) =>
      state.usage
        ? { usage: { ...state.usage, customizationsCount: state.usage.customizationsCount + 1 } }
        : {}
    ),

  incrementSchoolFetches: () =>
    set((state) =>
      state.usage
        ? { usage: { ...state.usage, schoolFetchesCount: state.usage.schoolFetchesCount + 1 } }
        : {}
    ),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearUsage: () => set({ usage: null, error: null }),

  // Computed getters
  canEditEssay: () => {
    const { usage } = get();
    return usage ? usage.aiEditsCount < usage.aiEditsLimit : false;
  },

  canCustomizeEssay: () => {
    const { usage } = get();
    return usage ? usage.customizationsCount < usage.customizationsLimit : false;
  },

  canFetchSchool: () => {
    const { usage } = get();
    return usage ? usage.schoolFetchesCount < usage.schoolFetchesLimit : false;
  },

  canCreateDraft: () => {
    const { usage } = get();
    return usage ? usage.draftsCount < usage.draftsLimit : false;
  },
}));
