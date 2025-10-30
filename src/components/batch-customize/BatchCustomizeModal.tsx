'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useBatchCustomizeStore } from '@/stores/batch-customize-store';
import { useUIStore } from '@/store';
import { SchoolSelector } from './SchoolSelector';
import { ProgressBar } from './ProgressBar';
import { ResultsList } from './ResultsList';

interface BatchCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  essay: string;
  draftId: string;
}

export function BatchCustomizeModal({
  isOpen,
  onClose,
  essay,
  draftId,
}: BatchCustomizeModalProps) {
  const { addToast } = useUIStore();
  const {
    schools,
    isProcessing,
    progress,
    successCount,
    errorCount,
    setEssay,
    setDraftId,
    updateSchoolStatus,
    startProcessing,
    stopProcessing,
    clear,
  } = useBatchCustomizeStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEssay(essay);
      setDraftId(draftId);
    }
  }, [isOpen, essay, draftId, setEssay, setDraftId]);

  const handleClose = () => {
    if (isProcessing) {
      if (!confirm('Processing is in progress. Are you sure you want to cancel?')) {
        return;
      }
      stopProcessing();
    }
    clear();
    setError(null);
    onClose();
  };

  const handleStartBatch = async () => {
    if (schools.length === 0) {
      setError('Please add at least one school');
      return;
    }

    if (!essay.trim()) {
      setError('Essay content is required');
      return;
    }

    setError(null);
    startProcessing();

    try {
      const response = await fetch('/api/batch-customize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          essay,
          draftId,
          schools: schools.map((s) => ({
            schoolName: s.schoolName,
            majorName: s.majorName,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start batch customization');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read Server-Sent Events stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              console.log('Batch started:', data);
            } else if (data.type === 'progress') {
              updateSchoolStatus(
                `${data.schoolName}-${data.majorName}-${Date.now()}`,
                { status: 'processing' }
              );
            } else if (data.type === 'result') {
              const schoolId = schools.find(
                (s) =>
                  s.schoolName === data.schoolName && s.majorName === data.majorName
              )?.id;

              if (schoolId) {
                if (data.status === 'success') {
                  updateSchoolStatus(schoolId, {
                    status: 'success',
                    result: data.customizedEssay,
                    responseTime: data.responseTime,
                    wordCount: data.wordCount,
                    metadata: data.metadata,
                  });
                  addToast({
                    type: 'success',
                    message: `Customized for ${data.schoolName}`,
                  });
                } else {
                  updateSchoolStatus(schoolId, {
                    status: 'error',
                    error: data.error,
                  });
                  addToast({
                    type: 'error',
                    message: `Failed: ${data.schoolName} - ${data.error}`,
                  });
                }
              }
            } else if (data.type === 'complete') {
              stopProcessing();
              addToast({
                type: 'success',
                message: `Batch complete! ${successCount()} successful, ${errorCount()} failed`,
              });
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Batch customization error:', err);
      setError(err.message || 'Failed to process batch customization');
      addToast({
        type: 'error',
        message: err.message || 'Failed to process batch customization',
      });
      stopProcessing();
    }
  };

  const progressInfo = progress();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Batch School Customization
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize your essay for multiple schools at once
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        <SchoolSelector />

        {isProcessing && (
          <ProgressBar
            current={progressInfo.current}
            total={progressInfo.total}
            percentage={progressInfo.percentage}
          />
        )}

        <ResultsList />

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {isProcessing ? 'Cancel' : 'Close'}
          </Button>
          <Button
            onClick={handleStartBatch}
            disabled={isProcessing || schools.length === 0}
            isLoading={isProcessing}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isProcessing ? 'Processing...' : 'Start Customization'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
