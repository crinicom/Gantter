import { describe, it, expect } from 'vitest';
import { isDeclineMessage } from '../declineMessage';

describe('isDeclineMessage', () => {
  it('reconoce un "No" escueto', () => {
    expect(isDeclineMessage('No')).toBe(true);
    expect(isDeclineMessage('no')).toBe(true);
    expect(isDeclineMessage('No.')).toBe(true);
    expect(isDeclineMessage('No,')).toBe(true);
    expect(isDeclineMessage('No por ahora')).toBe(true);
    expect(isDeclineMessage('Ahora no')).toBe(true);
    expect(isDeclineMessage('Nah')).toBe(true);
  });

  it('no confunde un "No" con otras respuestas', () => {
    expect(isDeclineMessage('')).toBe(false);
    expect(isDeclineMessage('No sé')).toBe(false);
    expect(isDeclineMessage('No me parece')).toBe(false);
    expect(isDeclineMessage('No pasó nada')).toBe(false);
    expect(isDeclineMessage('Hoy no puedo')).toBe(false);
    expect(isDeclineMessage('No lo tomes a mano')).toBe(false);
  });
});