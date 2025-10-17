'use client';

import { useState } from 'react';
import { Input, Button, Card } from '@/components/ui';
import { useBatchCustomizeStore } from '@/stores/batch-customize-store';

export function SchoolSelector() {
  const { schools, addSchool, removeSchool } = useBatchCustomizeStore();
  const [schoolName, setSchoolName] = useState('');
  const [majorName, setMajorName] = useState('');

  const handleAddSchool = () => {
    if (!schoolName.trim() || !majorName.trim()) {
      return;
    }

    // Check if school already added
    const duplicate = schools.find(
      (s) =>
        s.schoolName.toLowerCase() === schoolName.toLowerCase() &&
        s.majorName.toLowerCase() === majorName.toLowerCase()
    );

    if (duplicate) {
      alert('This school/major combination is already in the list');
      return;
    }

    addSchool({
      id: `${schoolName}-${majorName}-${Date.now()}`,
      schoolName: schoolName.trim(),
      majorName: majorName.trim(),
    });

    // Clear inputs
    setSchoolName('');
    setMajorName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSchool();
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Select Schools to Customize For
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          type="text"
          placeholder="School Name (e.g., MIT, Stanford)"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Input
          type="text"
          placeholder="Major (e.g., Computer Science)"
          value={majorName}
          onChange={(e) => setMajorName(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <Button onClick={handleAddSchool} size="sm" variant="outline" className="w-full md:w-auto">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add School
      </Button>

      {schools.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {schools.length} school{schools.length !== 1 ? 's' : ''} selected
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {schools.map((school) => (
              <div
                key={school.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{school.schoolName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{school.majorName}</p>
                </div>
                <button
                  onClick={() => removeSchool(school.id)}
                  className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  aria-label="Remove school"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {schools.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Add schools to customize your essay for multiple applications
        </p>
      )}
    </Card>
  );
}
