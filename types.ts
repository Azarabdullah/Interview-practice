export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

export interface ResumeAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export type AppState = 
  | 'UPLOAD' 
  | 'ANALYZING' 
  | 'FEEDBACK' 
  | 'INTERVIEW_SETUP' 
  | 'LIVE_INTERVIEW';
