/**
 * Enhanced school data types for topic-aware customization
 */

export interface AcademicProgram {
  description: string;
  keyFeatures: string[];
  facultyHighlights: string[];
  researchOpportunities: string[];
  keywords: string[];
}

export interface SportsInfo {
  varsity: string[];
  intramural: string[];
  clubs: string[];
  facilities: string[];
}

export interface ArtsInfo {
  music: {
    programs: string[];
    ensembles: string[];
    venues: string[];
    opportunities: string[];
  };
  theater: {
    programs: string[];
    productions: string[];
    venues: string[];
  };
  visual: {
    programs: string[];
    galleries: string[];
    studios: string[];
  };
  dance: {
    programs: string[];
    companies: string[];
  };
}

export interface ClubCategory {
  name: string;
  clubs: string[];
  highlights: string[];
}

export interface CampusLifeInfo {
  athletics: SportsInfo;
  arts: ArtsInfo;
  clubs: ClubCategory[];
  studentOrgs: {
    total: number;
    highlights: string[];
  };
  traditions: string[];
  communityService: string[];
  leadershipOpportunities: string[];
}

export interface SchoolCulture {
  values: string[];
  motto?: string;
  distinctiveFeatures: string[];
  studentBody: {
    size?: number;
    diversity: string[];
    atmosphere: string[];
  };
}

export interface EnhancedSchoolData {
  schoolName: string;
  majorName: string;

  // Academic information
  academic: AcademicProgram;

  // Campus life & extracurriculars
  campusLife: CampusLifeInfo;

  // Culture & values
  culture: SchoolCulture;

  // Metadata
  sourceUrl?: string;
  lastUpdated: Date;
  freshness: boolean;
}

export interface EssayTopics {
  activities: string[];      // chess, basketball, music, debate, etc.
  values: string[];          // leadership, community, creativity, etc.
  interests: string[];       // science, arts, social justice, etc.
  themes: string[];          // identity, growth, challenge, culture, etc.
  tone: 'personal' | 'academic' | 'reflective' | 'narrative';
}

export interface CustomizationContext {
  // Always included
  schoolName: string;
  majorName: string;

  // Academic context (if essay is academically focused)
  academicContext?: {
    programDescription: string;
    keyFeatures: string[];
    facultyHighlights: string[];
    researchOpportunities: string[];
  };

  // Activity-based context (if essay mentions specific activities)
  activityContext?: {
    [activity: string]: string[];  // e.g., { chess: ["Princeton Chess Club", "US Chess Collegiate Championships"] }
  };

  // Values-based context (if essay is values-focused)
  valuesContext?: {
    traditions: string[];
    communityAspects: string[];
    leadershipOpportunities: string[];
  };

  // General culture info
  cultureHighlights: string[];
}
