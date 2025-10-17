'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useBatchCustomizeStore, type SchoolStatus } from '@/stores/batch-customize-store';

export function ResultsList() {
  const { schools } = useBatchCustomizeStore();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const processedSchools = schools.filter(
    (s) => s.status === 'success' || s.status === 'error'
  );

  if (processedSchools.length === 0) {
    return null;
  }

  // Set first school as active if none selected
  if (!activeTab && processedSchools.length > 0) {
    setActiveTab(processedSchools[0].id);
  }

  const activeSchool = processedSchools.find((s) => s.id === activeTab);

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Customization Results
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-2">
        {processedSchools.map((school) => (
          <button
            key={school.id}
            onClick={() => setActiveTab(school.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === school.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {school.status === 'success' ? (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="truncate max-w-[120px]">{school.schoolName}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active School Content */}
      {activeSchool && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
              {activeSchool.schoolName}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{activeSchool.majorName}</p>
          </div>

          {activeSchool.status === 'success' && activeSchool.result && (
            <>
              {/* Quality Score Badges */}
              <div className="flex flex-wrap gap-2">
                {activeSchool.wordCount !== undefined && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      activeSchool.meetsWordLimit
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {activeSchool.meetsWordLimit ? '✓' : '⚠'} {activeSchool.wordCount} words
                  </span>
                )}

                {activeSchool.voicePreservationScore !== undefined && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    Voice: {activeSchool.voicePreservationScore}/10
                  </span>
                )}

                {activeSchool.aiClicheAvoidanceScore !== undefined && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    AI-Free: {activeSchool.aiClicheAvoidanceScore}/10
                  </span>
                )}

                {activeSchool.alignmentScore !== undefined && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                    Fit: {activeSchool.alignmentScore}/10
                  </span>
                )}

                {activeSchool.retryCount !== undefined && activeSchool.retryCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                    {activeSchool.retryCount} {activeSchool.retryCount === 1 ? 'retry' : 'retries'}
                  </span>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{activeSchool.responseTime}ms</span>
              </div>

              {/* Customized Essay */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {activeSchool.result}
                </p>
              </div>

              {/* Metadata Details (if available) */}
              {activeSchool.metadata && (
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    <svg
                      className="w-4 h-4 transition-transform group-open:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View Customization Details
                  </summary>

                  <div className="mt-4 space-y-4 pl-6">
                    {/* Summary */}
                    {activeSchool.metadata.customizationSummary && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Summary</h5>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {activeSchool.metadata.customizationSummary}
                        </p>
                      </div>
                    )}

                    {/* Program References */}
                    {activeSchool.metadata.programReferencesAdded && activeSchool.metadata.programReferencesAdded.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Program References Added</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                          {activeSchool.metadata.programReferencesAdded.map((ref, idx) => (
                            <li key={idx}>{ref}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Specific Changes */}
                    {activeSchool.metadata.specificChanges && activeSchool.metadata.specificChanges.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Specific Changes ({activeSchool.metadata.specificChanges.length})
                        </h5>
                        <div className="space-y-3">
                          {activeSchool.metadata.specificChanges.map((change, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                {change.location}
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white mb-1">{change.change}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 italic">{change.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Voice Analysis */}
                    {activeSchool.metadata.voiceAnalysis && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Voice Preservation Analysis</h5>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {activeSchool.metadata.voiceAnalysis}
                        </p>
                      </div>
                    )}

                    {/* AI Patterns Detected */}
                    {activeSchool.metadata.aiWritingPatternsDetected && activeSchool.metadata.aiWritingPatternsDetected.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <h5 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                          ⚠ AI Patterns Detected
                        </h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                          {activeSchool.metadata.aiWritingPatternsDetected.map((pattern, idx) => (
                            <li key={idx}>{pattern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(activeSchool.result!);
                    alert('Copied to clipboard!');
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </Button>
                <Button size="sm" variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </Button>
              </div>
            </>
          )}

          {activeSchool.status === 'error' && activeSchool.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{activeSchool.error}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
