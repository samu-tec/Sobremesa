import { useCallback, useState } from 'react';
import { sessionStore } from '../services/socket';
export function useGuestProfile() {
  const [confirmed, setConfirmed] = useState(() => {
    try {
      return (
        localStorage.getItem('sobremesa.profileConfirmed') === 'true' &&
        !!localStorage.getItem('sobremesa.name')?.trim()
      );
    } catch {
      return false;
    }
  });
  const [playerId, setId] = useState(sessionStore.get('sobremesa.playerId') || '');
  const [playerName, setName] = useState(() => {
    const generated = '';
    try {
      const saved = localStorage.getItem('sobremesa.name');
      if (saved) return saved;
      localStorage.setItem('sobremesa.name', generated);
      return generated;
    } catch {
      return generated;
    }
  });
  const updateName = (value: string) => {
    const name = value
      .normalize('NFC')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim()
      .slice(0, 24);
    if (!name) return;
    setName(name);
    setConfirmed(true);
    try {
      localStorage.setItem('sobremesa.name', name);
      localStorage.setItem('sobremesa.profileConfirmed', 'true');
    } catch {
      /* Optional preference. */
    }
  };
  const updatePlayerId = useCallback((id: string) => {
    sessionStore.set('sobremesa.playerId', id);
    setId(id);
  }, []);
  return { confirmed, playerId, playerName, updateName, updatePlayerId };
}
