/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, TestResult, Medal } from '../types';

const STORAGE_KEY = 'revalida_quiz_state';

const defaultState: AppState = {
  points: 10,
  history: [],
  errorLog: [],
  notifications: [],
  mailbox: [],
  gamification: {
    level: 1,
    xp: 0,
    medals: [],
    currentStreak: 0,
    maxStreak: 0,
    lastActivityDate: null,
    streakShields: 0,
    missions: [],
    skillTree: [
      { category: 'Clínica Médica', level: 1, xp: 0, unlockedTalents: [] },
      { category: 'Cirurgia', level: 1, xp: 0, unlockedTalents: [] },
      { category: 'Ginecologia e Obstetrícia', level: 1, xp: 0, unlockedTalents: [] },
      { category: 'Pediatria', level: 1, xp: 0, unlockedTalents: [] },
      { category: 'Saúde Coletiva', level: 1, xp: 0, unlockedTalents: [] },
    ],
    collectedCards: [],
    luckySpinLastUsed: null,
    lastLuckyReward: null,
    studyDaysCount: 0,
    validStudyDays: [],
    chefaoStatus: {
      lastChefaoDate: null,
      lastSubchefeDate: null
    }
  }
};

export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 10)) + 1;
};

export const updateActivityStreak = (state: AppState): AppState => {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = state.gamification.lastActivityDate ? state.gamification.lastActivityDate.split('T')[0] : null;

  let newValidStudyDays = [...(state.gamification.validStudyDays || [])];
  let newStudyDaysCount = state.gamification.studyDaysCount || 0;

  if (!newValidStudyDays.includes(today)) {
    newValidStudyDays.push(today);
    newStudyDaysCount += 1;
  }

  if (lastDate === today) {
    return {
      ...state,
      gamification: {
        ...state.gamification,
        validStudyDays: newValidStudyDays,
        studyDaysCount: newStudyDaysCount
      }
    };
  }

  let newStreak = state.gamification.currentStreak;
  let newShields = state.gamification.streakShields;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yesterdayStr) {
    newStreak += 1;
  } else {
    // Check for shield
    if (newShields > 0) {
      newShields -= 1;
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  return {
    ...state,
    gamification: {
      ...state.gamification,
      currentStreak: newStreak,
      streakShields: newShields,
      maxStreak: Math.max(newStreak, state.gamification.currentStreak),
      lastActivityDate: new Date().toISOString(),
      validStudyDays: newValidStudyDays,
      studyDaysCount: newStudyDaysCount
    }
  };
};

export const getXPMultiplier = (streak: number): number => {
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
};

export const TITLES = [
  "Interno", "Interno +", "Interno ++",
  "Médico Revalidado sem trabalho", "Médico Revalidado sem trabalho +", "Médico Revalidado sem trabalho ++",
  "Médico Generalista", "Médico Generalista +", "Médico Generalista ++",
  "Plantonista", "Plantonista +", "Plantonista ++",
  "Residente", "Residente +", "Residente ++",
  "Médico do SUS", "Médico do SUS +", "Médico do SUS ++",
  "Médico Especialista", "Médico Especialista +", "Médico Especialista ++",
  "Médico Professor Universitário", "Médico Professor Universitário +", "Médico Professor Universitário ++",
  "Referência Nacional"
];

export const getTitle = (level: number): string => {
  const index = Math.min(Math.floor((level - 1) / 2), TITLES.length - 1);
  return TITLES[index];
};

export const findNewMedals = (state: AppState): Medal[] => {
  const existingMedals = state.gamification.medals || [];
  const historyCount = state.history.length;
  const errorRevisedCount = (state.errorLog || []).filter(e => e.isRevised).length;

  const medalConfigs = [
    { id: 'first_test', title: 'Primeiro Passo', description: 'Concluiu o primeiro simulado', criteria: historyCount >= 1, icon: '🏆' },
    { id: 'ten_tests', title: 'Veterano', description: 'Concluiu 10 simulados', criteria: historyCount >= 10, icon: '🎖️' },
    { id: 'streak_3', title: 'Foco Total', description: 'Manteve 3 dias de sequência', criteria: state.gamification.currentStreak >= 3, icon: '🔥' },
    { id: 'error_master', title: 'Mestre da Revisão', description: 'Revisou 10 questões do caderno de erros', criteria: errorRevisedCount >= 10, icon: '📚' }
  ];

  const found: Medal[] = [];
  medalConfigs.forEach(m => {
    if (m.criteria && !existingMedals.find(nm => nm.id === m.id)) {
      found.push({
        id: m.id,
        title: m.title,
        description: m.description,
        icon: m.icon,
        dateEarned: new Date().toISOString()
      });
    }
  });
  return found;
};

export const checkMedals = (state: AppState): AppState => {
  const newMedals = [...state.gamification.medals];
  const historyCount = state.history.length;
  const errorRevisedCount = state.errorLog.filter(e => e.isRevised).length;

  const medalConfigs = [
    { id: 'first_test', title: 'Primeiro Passo', description: 'Concluiu o primeiro simulado', criteria: historyCount >= 1, icon: '🏆' },
    { id: 'ten_tests', title: 'Veterano', description: 'Concluiu 10 simulados', criteria: historyCount >= 10, icon: '🎖️' },
    { id: 'streak_3', title: 'Foco Total', description: 'Manteve 3 dias de sequência', criteria: state.gamification.currentStreak >= 3, icon: '🔥' },
    { id: 'error_master', title: 'Mestre da Revisão', description: 'Revisou 10 questões do caderno de erros', criteria: errorRevisedCount >= 10, icon: '📚' }
  ];

  medalConfigs.forEach(m => {
    if (m.criteria && !newMedals.find(nm => nm.id === m.id)) {
      newMedals.push({
        id: m.id,
        title: m.title,
        description: m.description,
        icon: m.icon,
        dateEarned: new Date().toISOString()
      });
    }
  });

  return {
    ...state,
    gamification: {
      ...state.gamification,
      medals: newMedals
    }
  };
};

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return defaultState;
    }
    const parsed = JSON.parse(serializedState);
    
    // Deep merge gamification to avoid missing properties breaking the app
    const mergedGamification = {
      ...defaultState.gamification,
      ...(parsed.gamification || {}),
      chefaoStatus: {
        ...defaultState.gamification.chefaoStatus,
        ...(parsed.gamification?.chefaoStatus || {})
      }
    };

    return {
      ...defaultState,
      ...parsed,
      gamification: mergedGamification
    };
  } catch (err) {
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Could not save state', err);
  }
};

export const addTestToHistory = (result: TestResult): void => {
  const currentState = loadState();
  const newState: AppState = {
    ...currentState,
    points: result.scoreAfter,
    history: [result, ...currentState.history]
  };
  saveState(newState);
};

export const updatePoints = (points: number): void => {
  const currentState = loadState();
  const newState: AppState = {
    ...currentState,
    points
  };
  saveState(newState);
};
