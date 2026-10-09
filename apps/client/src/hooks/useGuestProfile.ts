import { useState, useEffect } from 'react';

const STORAGE_KEY_ID = 'games_guest_player_id';
const STORAGE_KEY_NAME = 'games_guest_player_name';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_AVATARS = ['🦊', '🐯', '🐼', '🦁', '🐸', '🐙', '🦄', '🚀', '⚡', '🎮'];

export function useGuestProfile() {
  const [playerId, setPlayerId] = useState<string>(() => {
    let saved = localStorage.getItem(STORAGE_KEY_ID);
    if (!saved) {
      saved = `guest_${generateUUID()}`;
      localStorage.setItem(STORAGE_KEY_ID, saved);
    }
    return saved;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    let saved = localStorage.getItem(STORAGE_KEY_NAME);
    if (!saved) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      saved = `Jugador #${randNum}`;
      localStorage.setItem(STORAGE_KEY_NAME, saved);
    }
    return saved;
  });

  const updateName = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      localStorage.setItem(STORAGE_KEY_NAME, trimmed);
    }
  };

  return {
    playerId,
    playerName,
    updateName,
  };
}
