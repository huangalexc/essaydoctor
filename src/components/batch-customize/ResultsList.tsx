'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useBatchCustomizeStore, type SchoolStatus } from '@/stores/batch-customize-store';

export function ResultsList() {
  const { schools } = useBatchCustomizeStore();
  const [activeSchoolTab, setActiveSchoolTab] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'essay' | 'details'>('essay');

  const processedSchools = schools.filter(
    (s) => s.status === 'success' || s.status === 'error'
  );

  if (processedSchools.length === 0) {
    return null;
  }

  // Set first school as active if none selected
  if (!activeSchoolTab && processedSchools.length > 0) {
    setActiveSchoolTab(processedSchools[0].id);
  }

  const activeSchool = processedSchools.find((s) => s.id === activeSchoolTab);

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Customization Results
      </h3>

      {/* School Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-2">
        {processedSchools.map((school) => (
          <button
            key={school.id}
            onClick={() => {
              setActiveSchoolTab(school.id);
              setActiveContentTab('essay'); // Reset to essay tab when switching schools
            }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
              activeSchoolTab === school.id
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
              {/* Content Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveContentTab('essay')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeContentTab === 'essay'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Customized Essay
                </button>
                <button
                  onClick={() => setActiveContentTab('details')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeContentTab === 'details'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Changes & Integration
                  {activeSchool.metadata?.changeCount !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded">
                      {activeSchool.metadata.changeCount}
                    </span>
                  )}
                </button>
              </div>

              {activeContentTab === 'essay' ? (
                <>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{activeSchool.wordCount} words</span>
                    <span>•</span>
                    <span>{activeSchool.responseTime}ms</span>
                    {activeSchool.metadata?.preservationPercentage !== undefined && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">
                          {activeSchool.metadata.preservationPercentage}% preserved
                        </span>
                      </>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                      {activeSchool.result}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Changes Summary */}
                  {activeSchool.metadata?.changesSummary && activeSchool.metadata.changesSummary.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Changes Made ({activeSchool.metadata.changeCount})
                      </h5>
                      <div className="space-y-3">
                        {activeSchool.metadata.changesSummary.map((change, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {change.location}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {change.change}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                  Reason: {change.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Integration Notes */}
                  {activeSchool.metadata?.integrationNotes && (
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Integration Notes
                      </h5>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {activeSchool.metadata.integrationNotes}
                        </p>
                      </div>
                    </div>
                  )}

                  {!activeSchool.metadata && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>No detailed metadata available for this customization.</p>
                    </div>
                  )}
                </div>
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
