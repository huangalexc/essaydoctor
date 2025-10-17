'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, TextArea, Card, Loading, Input } from '@/components/ui';
import { useDraftStore, useUIStore } from '@/store';
import { api } from '@/lib/api-client';
import { BatchCustomizeModal } from '@/components/batch-customize';

import { StructuredEssayFeedback } from '@/types/essay-feedback';

type AIFeedback = StructuredEssayFeedback;

interface RewriteResult {
  rewrittenEssay: string;
  keyChanges: string[];
  rationale: string;
}

type ViewMode = 'original' | 'rewritten' | 'comparison';

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
  const [isRewriting, setIsRewriting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [content, setContent] = useState('');
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI State
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<'overview' | 'principles' | 'comments'>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && draftId) {
      loadDraft();
    }
  }, [status, draftId]);

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

  const loadDraft = async () => {
    setIsLoading(true);
    try {
      const response = await api.drafts.getById(draftId);

      if (response.error) {
        addToast({ type: 'error', message: response.error });
        router.push('/dashboard');
      } else if (response.data) {
        const draft = response.data;
        setCurrentDraft(draft);
        setDraftName(draft.name || '');
        setPromptText(draft.promptText || '');
        setContent(draft.content || '');
        setHasUnsavedChanges(false);
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load draft' });
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

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
        // Handle AI feedback - could be already parsed JSON or a string
        const feedback = response.data.feedback;

        if (typeof feedback === 'object' && feedback !== null) {
          // Already parsed JSON object
          setAiFeedback(feedback as StructuredEssayFeedback);
          addToast({ type: 'success', message: 'AI feedback generated!' });
        } else if (typeof feedback === 'string') {
          // Try to parse string as JSON
          try {
            const parsed = JSON.parse(feedback);
            setAiFeedback(parsed as StructuredEssayFeedback);
            addToast({ type: 'success', message: 'AI feedback generated!' });
          } catch (e) {
            // If not JSON, show error
            console.error('Failed to parse feedback:', e);
            addToast({
              type: 'error',
              message: 'Received invalid feedback format from AI'
            });
          }
        }
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to generate feedback' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestions = async () => {
    if (!content.trim()) {
      addToast({ type: 'error', message: 'Please write some content first' });
      return;
    }

    if (!aiFeedback) {
      addToast({ type: 'error', message: 'Please generate feedback first' });
      return;
    }

    setIsRewriting(true);
    try {
      // Extract focus areas from feedback
      const focusAreas = aiFeedback.priorityImprovements?.slice(0, 3).map(imp => imp.title) || [];

      // Extract word limit from prompt text
      let wordLimit: number | undefined;
      const wordLimitMatch = promptText.match(/(\d+)\s*word/i);
      if (wordLimitMatch) {
        wordLimit = parseInt(wordLimitMatch[1]);
      }

      const response = await api.essays.rewrite({
        essay: content,
        prompt: promptText,
        focusAreas,
        wordLimit,
      });

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else if (response.data) {
        setRewriteResult({
          rewrittenEssay: response.data.rewrittenEssay,
          keyChanges: response.data.keyChanges || [],
          rationale: response.data.rationale || '',
        });
        setViewMode('comparison');
        addToast({ type: 'success', message: 'Essay rewritten successfully!' });
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to rewrite essay' });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleAcceptRewrite = () => {
    if (rewriteResult) {
      setContent(rewriteResult.rewrittenEssay);
      setHasUnsavedChanges(true);
      setRewriteResult(null);
      setViewMode('original');
      addToast({ type: 'success', message: 'Rewrite accepted! Remember to save your draft.' });
    }
  };

  const handleRejectRewrite = () => {
    setRewriteResult(null);
    setViewMode('original');
    addToast({ type: 'info', message: 'Rewrite discarded' });
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
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shrink-0">
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
            <Button
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
            </Button>
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

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Left Column: Prompt + Editor */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Collapsible Prompt */}
          <Card className={`shrink-0 overflow-hidden transition-all ${promptExpanded ? 'h-64' : 'h-auto'}`}>
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Essay Prompt
                {promptText && !promptExpanded && (
                  <span className="text-xs text-gray-500 font-normal">
                    (Click to {promptExpanded ? 'collapse' : 'expand'})
                  </span>
                )}
              </h3>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${promptExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {promptExpanded && (
              <div className="px-4 pb-4">
                <TextArea
                  value={promptText}
                  onChange={handlePromptChange}
                  placeholder="Paste your college essay prompt here..."
                  rows={6}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  The AI will use this prompt to provide more relevant feedback
                </p>
              </div>
            )}
          </Card>

          {/* Draft Editor with View Modes */}
          <Card className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {rewriteResult ? 'Essay Comparison' : 'Your Essay'}
              </h3>
              {rewriteResult && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('original')}
                    className={viewMode === 'original' ? 'bg-blue-50 border-blue-500' : ''}
                  >
                    Original
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('rewritten')}
                    className={viewMode === 'rewritten' ? 'bg-blue-50 border-blue-500' : ''}
                  >
                    Rewritten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('comparison')}
                    className={viewMode === 'comparison' ? 'bg-blue-50 border-blue-500' : ''}
                  >
                    Side-by-Side
                  </Button>
                </div>
              )}
            </div>

            {/* Essay Content */}
            <div className="flex-1 overflow-auto">
              {rewriteResult && viewMode === 'comparison' ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</h4>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 h-full overflow-auto">
                      <p className="text-sm whitespace-pre-wrap font-serif leading-relaxed">{content}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rewritten</h4>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700 h-full overflow-auto">
                      <p className="text-sm whitespace-pre-wrap font-serif leading-relaxed">{rewriteResult.rewrittenEssay}</p>
                    </div>
                  </div>
                </div>
              ) : rewriteResult && viewMode === 'rewritten' ? (
                <TextArea
                  value={rewriteResult.rewrittenEssay}
                  readOnly
                  rows={20}
                  className="flex-1 font-serif text-base leading-relaxed bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                />
              ) : (
                <TextArea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Start writing your essay here..."
                  rows={20}
                  className="flex-1 font-serif text-base leading-relaxed"
                />
              )}
            </div>

            {/* Rewrite Actions */}
            {rewriteResult && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Rewrite Ready
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      {rewriteResult.keyChanges.length} improvements made
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRejectRewrite}>
                      Discard
                    </Button>
                    <Button size="sm" onClick={handleAcceptRewrite}>
                      Accept & Replace
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Word Count */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{wordCount} words</span>
              {wordCount > 650 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ Most college essays are 500-650 words
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: AI Feedback */}
        <Card className="p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
            {aiFeedback && (
              <Button
                onClick={handleApplySuggestions}
                isLoading={isRewriting}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Apply Suggestions
              </Button>
            )}
          </div>

          {!aiFeedback ? (
            <div className="flex-1 flex items-center justify-center">
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
            </div>
          ) : (
            <>
              {/* Feedback Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  onClick={() => setFeedbackTab('overview')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    feedbackTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setFeedbackTab('principles')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    feedbackTab === 'principles'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Principles ({aiFeedback.principlesFeedback?.length || 0})
                </button>
                <button
                  onClick={() => setFeedbackTab('comments')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    feedbackTab === 'comments'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Comments ({aiFeedback.inlineComments?.length || 0})
                </button>
              </div>

              {/* Feedback Content */}
              <div className="flex-1 overflow-y-auto">
                {feedbackTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Overall Score & Assessment */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                          Overall Score
                        </h4>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {aiFeedback.overallScore}
                          <span className="text-lg text-gray-500">/100</span>
                        </div>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {aiFeedback.overallAssessment}
                      </p>
                    </div>

                    {/* Strengths & Weaknesses */}
                    {(aiFeedback.strengths?.length > 0 || aiFeedback.weaknesses?.length > 0) && (
                      <div className="grid grid-cols-1 gap-3">
                        {aiFeedback.strengths?.length > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <h5 className="font-medium text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Key Strengths
                            </h5>
                            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                              {aiFeedback.strengths.map((strength, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span>•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiFeedback.weaknesses?.length > 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <h5 className="font-medium text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Areas to Improve
                            </h5>
                            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                              {aiFeedback.weaknesses.map((weakness, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span>•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Priority Improvements */}
                    {aiFeedback.priorityImprovements?.length > 0 && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">
                          Top Priority Improvements
                        </h4>
                        <div className="space-y-3">
                          {aiFeedback.priorityImprovements.slice(0, 3).map((improvement) => (
                            <div key={improvement.rank} className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 dark:bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                                  {improvement.rank}
                                </span>
                                <div className="flex-1">
                                  <h5 className="font-medium text-purple-900 dark:text-purple-200 text-sm">
                                    {improvement.title}
                                  </h5>
                                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                    {improvement.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {feedbackTab === 'principles' && (
                  <div className="space-y-3">
                    {aiFeedback.principlesFeedback?.map((principle) => (
                      <div
                        key={principle.principleId}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {principle.principleName}
                          </h5>
                          <span
                            className={`text-sm font-semibold px-2 py-1 rounded ${
                              principle.score >= 8
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : principle.score >= 6
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {principle.score}/10
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {principle.feedback}
                        </p>
                        {principle.suggestions.length > 0 && (
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 pl-4">
                            {principle.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-blue-500">→</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {feedbackTab === 'comments' && (
                  <div className="space-y-2">
                    {aiFeedback.inlineComments?.length > 0 ? (
                      aiFeedback.inlineComments.map((comment, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded text-sm border-l-4 ${
                            comment.priority === 'high'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                              : comment.priority === 'medium'
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              comment.priority === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                : comment.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                              {comment.priority.toUpperCase()}
                            </span>
                            {comment.section}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            {comment.comment}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No specific comments for this essay
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Batch Customization Modal */}
      <BatchCustomizeModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        essay={content}
        draftId={draftId}
      />
    </div>
  );
}
