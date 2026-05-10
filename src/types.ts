/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Difficulty {
  EASY = 'fácil',
  MEDIUM = 'médio',
  HARD = 'difícil'
}

export type RevalidaCategory = 
  | 'Clínica Médica'
  | 'Cirurgia'
  | 'Ginecologia e Obstetrícia'
  | 'Pediatria'
  | 'Saúde Coletiva';

export interface Alternative {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  explanation: string;
}

export type QuestionOrigin = 'Official INEP/Revalida' | 'Inedited Style INEP/Revalida';

export interface Question {
  id: string;
  enunciado: string;
  alternatives: Alternative[];
  correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  difficulty: Difficulty;
  theme: string;
  category: RevalidaCategory;
  origin: QuestionOrigin;
  metadata?: {
    year?: string;
    exam?: string;
  };
}

export interface CategoryStats {
  category: RevalidaCategory;
  total: number;
  correct: number;
}

export type ContestationStatus = 'pending' | 'accepted' | 'rejected';

export interface Contestation {
  questionId: string;
  type: 'automatic' | 'manual';
  studentArgument?: string;
  status: ContestationStatus;
  aiFeedback: string;
  revisedAt: string;
}

export interface TestResult {
  id: string;
  date: string;
  theme: string;
  questions: Question[];
  userAnswers: (string | null)[]; // string for id, null for skipped
  revealedAnswers: boolean[]; // tracks if the user clicked "Ver resposta"
  categoryPerformance: CategoryStats[];
  pointsEarned: number;
  scoreBefore: number;
  scoreAfter: number;
  difficultyMode: 'always_hard' | 'standard';
  facilitiesUsed: {
    skipped: number;
    eliminated: number;
    guaranteed: number;
  };
  auxiliaryMarkers?: (Record<string, 'doubt' | 'discard' | null>)[];
  contestedQuestions?: Contestation[];
}

export interface ErrorLogEntry {
  id: string;
  question: Question;
  userAnswer: string | null;
  timestamp: string;
  personalObservation?: string;
  isRevised: boolean;
}

export interface Medal {
  id: string;
  title: string;
  description: string;
  icon: string;
  dateEarned: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  criterion: {
    type: 'correct_answers' | 'revision' | 'simulator_no_facilities' | 'category_target';
    target: number;
    category?: RevalidaCategory | 'TODAS';
  };
  reward: {
    points?: number;
    xp?: number;
    items?: string[];
  };
  progress: number;
  completed: boolean;
  deadline: string;
}

export interface SkillNode {
  category: RevalidaCategory;
  level: number;
  xp: number;
  unlockedTalents: string[];
}

export interface MedicalCard {
  id: string;
  title: string;
  description: string;
  trivia: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: RevalidaCategory | 'História';
}

export interface GamificationState {
  level: number;
  xp: number;
  medals: Medal[];
  currentStreak: number;
  maxStreak: number;
  lastActivityDate: string | null;
  streakShields: number;
  missions: Mission[];
  skillTree: SkillNode[];
  collectedCards: string[];
  luckySpinLastUsed: string | null;
  lastLuckyReward: string | null;
  studyDaysCount: number;
  validStudyDays: string[];
  chefaoStatus: {
    lastChefaoDate: string | null;
    lastSubchefeDate: string | null;
  };
}

export interface AppNotification {
  id: string;
  type: 'achievement' | 'promotion' | 'card';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface MailItem {
  id: string;
  type: 'achievement' | 'promotion' | 'card';
  title: string;
  message: string;
  timestamp: string;
  claimed: boolean;
  rewardData: any;
}

export interface AppState {
  points: number;
  history: TestResult[];
  errorLog: ErrorLogEntry[];
  gamification: GamificationState;
  notifications: AppNotification[];
  mailbox: MailItem[];
}
