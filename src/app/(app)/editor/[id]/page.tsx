'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, TextArea, Card, Loading, Input } from '@/components/ui';
import { useDraftStore, useUIStore } from '@/store';
import { api } from '@/lib/api-client';
// import { BatchCustomizeModal } from '@/components/batch-customize';

interface AIFeedback {
  overall: string;
  principles: Array<{
    id: string;
    name: string;
    score: number;
    feedback: string;
    suggestions: string[];
  }>;
  wordCount: number;
}

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params?.id as string;
  const { data: session, status } = useSession();
  const { currentDraft, setCurrentDraft } = useDraftStore();
  const { addToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [content, setContent] = useState('');
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI State
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<'overview' | 'principles' | 'comments'>('overview');
  // const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const loadDraft = useCallback(async () => {
    console.log('loadDraft called with draftId:', draftId);
    if (!draftId) {
      console.log('No draftId, returning');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching draft:', draftId);
      const response = await api.drafts.get(draftId);
      console.log('Draft response:', response);

      if (response.error) {
        addToast({ type: 'error', message: response.error });
        router.push('/dashboard');
      } else if (response.data) {
        const draft = response.data;
        console.log('Setting draft data:', draft);
        setCurrentDraft(draft);
        setDraftName(draft.name || '');
        setPromptText(draft.promptText || '');
        setContent(draft.content || '');
        setHasUnsavedChanges(false);
      }
    } catch (error: any) {
      console.error('Load draft error:', error);
      addToast({ type: 'error', message: error.message || 'Failed to load draft' });
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    console.log('Editor useEffect called - status:', status, 'draftId:', draftId);
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && draftId) {
      console.log('Calling loadDraft from useEffect');
      loadDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, draftId, loadDraft]);

  useEffect(() => {
    // Update word count
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  useEffect(() => {
    // Warn before leaving with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.drafts.update(draftId, {
        name: draftName,
        promptText,
        content,
        wordCount,
      });

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else {
        addToast({ type: 'success', message: 'Draft saved successfully' });
        setHasUnsavedChanges(false);
        if (response.data) {
          setCurrentDraft(response.data);
        }
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to save draft' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetAIFeedback = async () => {
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Please write some content first' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.essays.edit({
        essay: content,
        prompt: promptText,
      });

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else if (response.data) {
        // Parse AI feedback
        try {
          const feedback = JSON.parse(response.data.feedback);
          setAiFeedback(feedback);
          addToast({ type: 'success', message: 'AI feedback generated!' });
        } catch (e) {
          // If not JSON, display as text
          setAiFeedback({
            overall: response.data.feedback,
            principles: [],
            wordCount,
          });
        }
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to generate feedback' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptText(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftName(e.target.value);
    setHasUnsavedChanges(true);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" text="Loading editor..." />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    router.push('/dashboard');
                  }
                } else {
                  router.push('/dashboard');
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Button>
            <Input
              type="text"
              value={draftName}
              onChange={handleNameChange}
              placeholder="Untitled Draft"
              className="max-w-md"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {wordCount} words
              {hasUnsavedChanges && ' • Unsaved changes'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!hasUnsavedChanges}
            >
              Save
            </Button>
            {/* <Button
              variant="outline"
              onClick={() => setIsBatchModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 border-none"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Customize for Schools
            </Button> */}
            <Button onClick={handleGetAIFeedback} isLoading={isGenerating}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Get AI Feedback
            </Button>
          </div>
        </div>
      </header>

      {/* Three-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Prompt Pane */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Essay Prompt
          </h3>
          <TextArea
            value={promptText}
            onChange={handlePromptChange}
            placeholder="Paste your college essay prompt here... (e.g., 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.')"
            rows={12}
            className="flex-1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            The AI will use this prompt to provide more relevant feedback
          </p>
        </Card>

        {/* Draft Editor Pane */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Your Essay
          </h3>
          <TextArea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your essay here..."
            rows={20}
            className="flex-1 font-serif text-base leading-relaxed"
          />
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{wordCount} words</span>
            {wordCount > 650 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚠ Most college essays are 500-650 words
              </span>
            )}
          </div>
        </Card>

        {/* AI Feedback Pane */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI Feedback
          </h3>

          <div className="flex-1 overflow-y-auto">
            {!aiFeedback ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Click "Get AI Feedback" to analyze your essay
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The AI will evaluate your essay based on 10 proven principles
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Feedback */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Overall Assessment
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{aiFeedback.overall}</p>
                </div>

                {/* Principle-by-Principle Feedback */}
                {aiFeedback.principles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      10 Essay Principles
                    </h4>
                    {aiFeedback.principles.map((principle) => (
                      <div
                        key={principle.id}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {principle.name}
                          </h5>
                          <span
                            className={`text-sm font-semibold ${
                              principle.score >= 8
                                ? 'text-green-600 dark:text-green-400'
                                : principle.score >= 6
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {principle.score}/10
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {principle.feedback}
                        </p>
                        {principle.suggestions.length > 0 && (
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {principle.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span>→</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Batch Customization Modal */}
      {/* <BatchCustomizeModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        essay={content}
        draftId={draftId}
      /> */}
    </div>
  );
}
