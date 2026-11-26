(function () {
  'use strict';

  const KEY = 'maktaba:storage';
  const GAME_IDS = ['hangman', 'ladder', 'detective', 'sorter', 'tree', 'minigames', 'tycoon', 'race', 'traffic'];
  const EMPTY_STATE = () => ({ profile: { name: '' }, games: {}, badges: [], playedDates: [], totalPlays: 0 });
  let memoryState = null;
  let warnedStorage = false;

  function warnStorage(error) {
    if (warnedStorage) return;
    warnedStorage = true;
    console.warn('MPStorage is using in-memory data because localStorage is unavailable.', error);
  }

  function readStoredState() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object') throw new TypeError('Invalid stored data');
      return value;
    } catch (error) {
      warnStorage(error);
      return null;
    }
  }

  function getState() {
    const stored = readStoredState();
    if (stored) {
      const empty = EMPTY_STATE();
      return {
        profile: Object.assign(empty.profile, stored.profile || {}),
        games: Object.assign({}, stored.games || {}),
        badges: Array.isArray(stored.badges) ? stored.badges.slice() : [],
        playedDates: Array.isArray(stored.playedDates) ? stored.playedDates.slice() : [],
        totalPlays: Math.max(0, Number(stored.totalPlays) || 0)
      };
    }
    if (!memoryState) memoryState = EMPTY_STATE();
    return memoryState;
  }

  function saveState(state) {
    memoryState = state;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      warnStorage(error);
    }
  }

  function validGame(gameId) {
    if (GAME_IDS.includes(gameId)) return true;
    console.warn(`MPStorage ignored unknown game id: ${gameId}`);
    return false;
  }

  function addBadgeToState(state, name, earned) {
    if (!name || state.badges.includes(name)) return;
    state.badges.push(name);
    earned.push(name);
  }

  function hasThreeDayStreak(dates, today) {
    const dateSet = new Set(dates);
    const todayValue = Date.parse(`${today}T00:00:00Z`);
    return [0, 1, 2].every(offset => {
      const date = new Date(todayValue - offset * 86400000).toISOString().slice(0, 10);
      return dateSet.has(date);
    });
  }

  function nonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function dateKey(date) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function saveResult(gameId, result) {
    if (!validGame(gameId)) return null;
    const input = result || {};
    const score = nonNegativeNumber(input.score);
    const correct = nonNegativeNumber(input.correct);
    const total = nonNegativeNumber(input.total);
    const durationSec = nonNegativeNumber(input.durationSec);
    const now = new Date();
    const today = dateKey(now);
    const state = getState();
    const previous = state.games[gameId] || {
      bestScore: null, plays: 0, lastPlayed: null, correctTotal: 0, roundsTotal: 0
    };
    const newBest = previous.bestScore == null || score > previous.bestScore;
    const game = {
      bestScore: newBest ? score : previous.bestScore,
      plays: previous.plays + 1,
      lastPlayed: now.toISOString(),
      lastScore: score,
      correct,
      total,
      durationSec,
      correctTotal: (previous.correctTotal || 0) + correct,
      roundsTotal: (previous.roundsTotal || 0) + total
    };

    state.games[gameId] = game;
    state.totalPlays++;
    if (!state.playedDates.includes(today)) state.playedDates.push(today);

    const newBadges = [];
    if (state.totalPlays === 1) addBadgeToState(state, 'أول جولة', newBadges);
    if (total > 0 && correct === total) addBadgeToState(state, 'إجابة كاملة', newBadges);
    if (GAME_IDS.every(id => state.games[id] && state.games[id].plays > 0)) {
      addBadgeToState(state, 'مكتبي شامل', newBadges);
    }
    if (hasThreeDayStreak(state.playedDates, today)) addBadgeToState(state, 'سلسلة ثلاثة أيام', newBadges);

    saveState(state);
    return { bestScore: game.bestScore, newBest, newBadges };
  }

  function getBest(gameId) {
    if (!validGame(gameId)) return 0;
    const game = getState().games[gameId];
    return game && game.bestScore != null ? game.bestScore : 0;
  }

  function getAllBest() {
    const games = getState().games;
    return Object.fromEntries(GAME_IDS.map(id => [id, Object.assign(
      { bestScore: 0, plays: 0, lastPlayed: null, lastScore: 0, correct: 0, total: 0, durationSec: 0 },
      games[id] || {}
    )]));
  }

  function getStats() {
    const state = getState();
    const games = Object.values(state.games);
    const plays = games.reduce((sum, game) => sum + game.plays, 0);
    const correct = games.reduce((sum, game) => sum + (game.correctTotal || 0), 0);
    const total = games.reduce((sum, game) => sum + (game.roundsTotal || 0), 0);
    return {
      plays,
      gamesPlayed: games.filter(game => game.plays > 0).length,
      correct,
      total,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      badges: state.badges.length
    };
  }

  function addBadge(name) {
    const state = getState();
    const earned = [];
    addBadgeToState(state, String(name || '').trim(), earned);
    if (earned.length) saveState(state);
    return earned.length > 0;
  }

  function resetAll() {
    memoryState = EMPTY_STATE();
    try {
      window.localStorage.removeItem(KEY);
    } catch (error) {
      warnStorage(error);
    }
  }

  window.MPStorage = {
    getProfile: () => Object.assign({}, getState().profile),
    setName(name) {
      const state = getState();
      state.profile.name = String(name == null ? '' : name).trim();
      saveState(state);
      return Object.assign({}, state.profile);
    },
    saveResult,
    getBest,
    getAllBest,
    getStats,
    addBadge,
    getBadges: () => getState().badges.slice(),
    resetAll
  };
})();
