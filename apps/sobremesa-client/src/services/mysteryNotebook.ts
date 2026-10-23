const PREFIX = 'sobremesa.mystery-notes.v1:';

function key(playerId: string, roomCode: string, matchId: string) {
  return `${PREFIX}${encodeURIComponent(playerId)}:${encodeURIComponent(roomCode)}:${encodeURIComponent(matchId)}`;
}

export function readMysteryNotes(playerId: string, roomCode: string, matchId: string): number[] {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(key(playerId, roomCode, matchId)) || '[]',
    );
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((card) => Number.isInteger(card) && card >= 0 && card < 18))];
  } catch {
    return [];
  }
}

export function writeMysteryNotes(
  playerId: string,
  roomCode: string,
  matchId: string,
  notes: number[],
) {
  try {
    sessionStorage.setItem(key(playerId, roomCode, matchId), JSON.stringify(notes));
  } catch {
    // The notebook is optional local convenience; storage restrictions must not block play.
  }
}

export function clearMysteryNotes(playerId: string, roomCode: string, matchId: string) {
  try {
    sessionStorage.removeItem(key(playerId, roomCode, matchId));
  } catch {
    // Storage may be disabled by the browser.
  }
}
