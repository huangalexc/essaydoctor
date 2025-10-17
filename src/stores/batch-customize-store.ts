import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { EssayCustomization } from '@/lib/schemas/essay-customization';

export type SchoolStatus = {
  id: string;
  schoolName: string;
  majorName: string;
  status: 'idle' | 'processing' | 'validating' | 'retrying' | 'success' | 'error';

  // Core result
  result?: string; // customizedEssay
  error?: string;
  responseTime?: number;

  // Word count tracking
  wordCount?: number;
  meetsWordLimit?: boolean;

  // Quality scores (1-10)
  voicePreservationScore?: number;
  aiClicheAvoidanceScore?: number;
  alignmentScore?: number;

  // Retry tracking
  retryCount?: number;

  // Full metadata
  metadata?: EssayCustomization;
};

type BatchCustomizeStore = {
  // State
  essay: string;
  draftId: string;
  schools: SchoolStatus[];
  isProcessing: boolean;
  currentIndex: number;
  startedAt: Date | null;

  // Computed getters
  successCount: () => number;
  errorCount: () => number;
  progress: () => { current: number; total: number; percentage: number };

  // Actions
  setEssay: (essay: string) => void;
  setDraftId: (draftId: string) => void;
  addSchool: (school: Omit<SchoolStatus, 'status'>) => void;
  removeSchool: (id: string) => void;
  updateSchoolStatus: (id: string, update: Partial<SchoolStatus>) => void;
  startProcessing: () => void;
  stopProcessing: () => void;
  reset: () => void;
  clear: () => void;
};

export const useBatchCustomizeStore = create<BatchCustomizeStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      essay: '',
      draftId: '',
      schools: [],
      isProcessing: false,
      currentIndex: 0,
      startedAt: null,

      // Computed selectors
      successCount: () => get().schools.filter((s) => s.status === 'success').length,

      errorCount: () => get().schools.filter((s) => s.status === 'error').length,

      progress: () => {
        const schools = get().schools;
        const completed = schools.filter(
          (s) => s.status === 'success' || s.status === 'error'
        ).length;

        return {
          current: completed,
          total: schools.length,
          percentage: schools.length > 0 ? Math.round((completed / schools.length) * 100) : 0,
        };
      },

      // Actions
      setEssay: (essay) => set({ essay }),

      setDraftId: (draftId) => set({ draftId }),

      addSchool: (school) =>
        set((state) => ({
          schools: [
            ...state.schools,
            {
              ...school,
              status: 'idle' as const,
            },
          ],
        })),

      removeSchool: (id) =>
        set((state) => ({
          schools: state.schools.filter((s) => s.id !== id),
        })),

      updateSchoolStatus: (id, update) =>
        set((state) => ({
          schools: state.schools.map((s) => (s.id === id ? { ...s, ...update } : s)),
        })),

      startProcessing: () =>
        set({
          isProcessing: true,
          currentIndex: 0,
          startedAt: new Date(),
        }),

      stopProcessing: () => set({ isProcessing: false }),

      reset: () =>
        set({
          essay: '',
          draftId: '',
          schools: [],
          isProcessing: false,
          currentIndex: 0,
          startedAt: null,
        }),

      clear: () =>
        set({
          schools: [],
          isProcessing: false,
          currentIndex: 0,
          startedAt: null,
        }),
    }),
    { name: 'batch-customize-store' }
  )
);
