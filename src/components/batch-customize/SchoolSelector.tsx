'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Input, Button, Card } from '@/components/ui';
import { useBatchCustomizeStore } from '@/stores/batch-customize-store';
import { UNIVERSITIES } from '@/data/universities';
import { ALL_MAJORS, MAJOR_CATEGORIES } from '@/data/majors';

export function SchoolSelector() {
  const { schools, addSchool, removeSchool } = useBatchCustomizeStore();
  const [schoolName, setSchoolName] = useState('');
  const [majorName, setMajorName] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [majorSearch, setMajorSearch] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);

  const schoolRef = useRef<HTMLDivElement>(null);
  const majorRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (schoolRef.current && !schoolRef.current.contains(event.target as Node)) {
        setShowSchoolDropdown(false);
      }
      if (majorRef.current && !majorRef.current.contains(event.target as Node)) {
        setShowMajorDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter schools based on search
  const filteredSchools = useMemo(() => {
    if (!schoolSearch) return UNIVERSITIES.slice(0, 50); // Show first 50 by default
    return UNIVERSITIES.filter((school) =>
      school.toLowerCase().includes(schoolSearch.toLowerCase())
    ).slice(0, 50);
  }, [schoolSearch]);

  // Filter majors based on search
  const filteredMajors = useMemo(() => {
    if (!majorSearch) return ALL_MAJORS.slice(0, 50); // Show first 50 by default
    return ALL_MAJORS.filter((major) =>
      major.toLowerCase().includes(majorSearch.toLowerCase())
    ).slice(0, 50);
  }, [majorSearch]);

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
    setSchoolSearch('');
    setMajorSearch('');
    setShowSchoolDropdown(false);
    setShowMajorDropdown(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSchool();
    }
  };

  const handleSchoolSelect = (school: string) => {
    setSchoolName(school);
    setSchoolSearch(school);
    setShowSchoolDropdown(false);
  };

  const handleMajorSelect = (major: string) => {
    setMajorName(major);
    setMajorSearch(major);
    setShowMajorDropdown(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Select Schools to Customize For
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* School Selector */}
        <div className="relative" ref={schoolRef}>
          <Input
            type="text"
            placeholder="Search for a school..."
            value={schoolSearch}
            onChange={(e) => {
              setSchoolSearch(e.target.value);
              setShowSchoolDropdown(true);
            }}
            onFocus={() => setShowSchoolDropdown(true)}
            onKeyPress={handleKeyPress}
          />
          {showSchoolDropdown && filteredSchools.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredSchools.map((school) => (
                <button
                  key={school}
                  type="button"
                  onClick={() => handleSchoolSelect(school)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors"
                >
                  {school}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Major Selector */}
        <div className="relative" ref={majorRef}>
          <Input
            type="text"
            placeholder="Search for a major..."
            value={majorSearch}
            onChange={(e) => {
              setMajorSearch(e.target.value);
              setShowMajorDropdown(true);
            }}
            onFocus={() => setShowMajorDropdown(true)}
            onKeyPress={handleKeyPress}
          />
          {showMajorDropdown && filteredMajors.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredMajors.map((major) => (
                <button
                  key={major}
                  type="button"
                  onClick={() => handleMajorSelect(major)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors"
                >
                  {major}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {schoolName && majorName && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          Selected: <span className="font-medium">{schoolName}</span> - <span className="font-medium">{majorName}</span>
        </div>
      )}

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
