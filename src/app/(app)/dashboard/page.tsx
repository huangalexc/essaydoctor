'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, Card, Loading } from '@/components/ui';
import { useDraftStore, useUIStore } from '@/store';
import { api } from '@/lib/api-client';
import type { Draft } from '@prisma/client';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { drafts, setDrafts } = useDraftStore();
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [usageStats, setUsageStats] = useState({
    aiEditsUsed: 0,
    aiEditsLimit: 2,
    draftsCreated: 0,
    draftsLimit: 2,
    tier: 'FREE' as 'FREE' | 'PLUS' | 'PRO',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadDashboardData();
    }
  }, [status]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load drafts
      const draftsResponse = await api.drafts.list();
      if (draftsResponse.error) {
        addToast({ type: 'error', message: draftsResponse.error });
      } else {
        // API returns array directly, not wrapped in { drafts: [] }
        setDrafts(Array.isArray(draftsResponse.data) ? draftsResponse.data : []);
      }

      // Load usage stats
      const usageResponse = await api.user.getUsageStats();
      if (usageResponse.error) {
        addToast({ type: 'error', message: usageResponse.error });
      } else if (usageResponse.data) {
        // API wraps data in { data: {...} }, so unwrap it
        const stats = usageResponse.data.data || usageResponse.data;
        setUsageStats(stats);
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to load dashboard data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (usageStats.draftsCreated >= usageStats.draftsLimit && usageStats.tier === 'FREE') {
      addToast({
        type: 'error',
        message: 'You have reached your draft limit. Upgrade to create more drafts.',
      });
      router.push('/pricing');
      return;
    }

    try {
      const response = await api.drafts.create({
        content: ' ', // Space character to pass validation
        name: 'Untitled Draft',
      });

      console.log('Draft creation response:', response);

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else if (response.data) {
        console.log('Draft ID:', response.data.id);
        if (response.data.id) {
          router.push(`/editor/${response.data.id}`);
        } else {
          addToast({ type: 'error', message: 'Draft created but ID is missing' });
          console.error('Draft data:', response.data);
        }
      } else {
        addToast({ type: 'error', message: 'No data returned from API' });
      }
    } catch (error: any) {
      console.error('Draft creation error:', error);
      addToast({ type: 'error', message: error.message || 'Failed to create draft' });
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await api.drafts.deleteById(draftId);
      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else {
        setDrafts(Array.isArray(drafts) ? drafts.filter((d) => d.id !== draftId) : []);
        addToast({ type: 'success', message: 'Draft deleted successfully' });
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to delete draft' });
    }
  };

  const filteredDrafts = (Array.isArray(drafts) ? drafts : [])
    .filter((draft) => {
      if (filter === 'all') return true;
      return draft.tag?.toLowerCase() === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else {
        return (a.name || '').localeCompare(b.name || '');
      }
    });

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {session?.user?.name || session?.user?.email?.split('@')[0]}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {usageStats.tier} Plan • {usageStats.aiEditsUsed}/{usageStats.aiEditsLimit} AI edits
                used this month
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/settings')}>
                Settings
              </Button>
              {usageStats.tier === 'FREE' && (
                <Button onClick={() => router.push('/pricing')}>Upgrade</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drafts Created</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {usageStats.draftsCreated}
                  <span className="text-lg text-gray-500">/{usageStats.draftsLimit}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI Edits Used</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {usageStats.aiEditsUsed}
                  <span className="text-lg text-gray-500">/{usageStats.aiEditsLimit}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
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
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Plan</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {usageStats.tier}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
            </div>
            {usageStats.tier === 'FREE' ? (
              <Button
                size="sm"
                className="w-full"
                onClick={() => router.push('/pricing')}
              >
                Upgrade Plan
              </Button>
            ) : (
              <div className="flex gap-2">
                {usageStats.tier === 'PLUS' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push('/pricing')}
                  >
                    Upgrade to Pro
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={usageStats.tier === 'PLUS' ? 'flex-1' : 'w-full'}
                  onClick={async () => {
                    try {
                      const response = await api.subscriptions.getPortalUrl();
                      if (response.data?.url) {
                        window.location.href = response.data.url;
                      } else {
                        addToast({ type: 'error', message: 'Failed to open billing portal' });
                      }
                    } catch (error: any) {
                      addToast({ type: 'error', message: error.message });
                    }
                  }}
                >
                  Manage
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Drafts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Drafts</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredDrafts.length} {filteredDrafts.length === 1 ? 'draft' : 'drafts'}
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Drafts</option>
                <option value="draft">Drafts</option>
                <option value="final">Final</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name (A-Z)</option>
              </select>

              {/* New Draft Button */}
              <Button onClick={handleCreateDraft}>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Draft
              </Button>
            </div>
          </div>

          {/* Draft List */}
          {filteredDrafts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No drafts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get started by creating your first college essay draft
              </p>
              <Button onClick={handleCreateDraft}>Create Your First Draft</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/editor/${draft.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {draft.name || 'Untitled Draft'}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDraft(draft.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  {draft.promptText && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {draft.promptText}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`px-3 py-1 rounded-full ${
                        draft.tag === 'FINAL'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      {draft.tag === 'FINAL' ? 'Final' : 'Draft'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {draft.wordCount || 0} words
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
