import { describe, it, expect } from 'vitest';
import {
  SHORTCUTS_MAX,
  defaultShortcuts,
  labelForUrl,
  normalizeShortcut,
  normalizeUrl,
} from '../shortcutsService';

describe('shortcutsService', () => {
  it('labelForUrl extrae el hostname sin www', () => {
    expect(labelForUrl('https://www.figma.com/file/abc')).toBe('figma.com');
    expect(labelForUrl('http://jira.example.com/browse/X-1')).toBe('jira.example.com');
    expect(labelForUrl('no-es-una-url')).toBe('');
    expect(labelForUrl('')).toBe('');
  });

  it('normalizeUrl auto-prepende https:// cuando falta el scheme', () => {
    expect(normalizeUrl('figma.com/file/abc')).toBe('https://figma.com/file/abc');
    expect(normalizeUrl('https://jira.example.com/x')).toBe('https://jira.example.com/x');
  });

  it('normalizeUrl bloquea javascript:, data: y vacío', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,<x>')).toBeNull();
    expect(normalizeUrl('file:///c:/bye')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });

  it('normalizeUrl recorta y baja solo si es http/https', () => {
    expect(normalizeUrl('  HTTP://Example.COM/PATH  ')).toMatch(/^http:\/\/example\.com\/path$/i);
  });

  it('normalizeShortcut conserva los datos y deriva el label del hostname', () => {
    const s = normalizeShortcut({
      id: 's1',
      url: 'https://figma.com/file/x',
      createdAt: '2026-09-10T00:00:00.000Z',
    });
    expect(s).toEqual({
      id: 's1',
      url: 'https://figma.com/file/x',
      label: 'figma.com',
      createdAt: '2026-09-10T00:00:00.000Z',
    });
  });

  it('normalizeShortcut respeta el label manual y tolera entradas sucias', () => {
    expect(
      normalizeShortcut({ id: 's2', url: 'https://x.com', label: '  Mi enlace  ' }).label,
    ).toBe('Mi enlace');
    const empty = normalizeShortcut({});
    expect(empty.id).toBeNull();
    expect(empty.url).toBe('');
    expect(empty.label).toBe('Enlace');
    expect(empty.createdAt).toBeNull();
  });

  it('defaultShortcuts arranca vacío', () => {
    expect(defaultShortcuts()).toEqual([]);
  });

  it('el límite de accesos es 30', () => {
    expect(SHORTCUTS_MAX).toBe(30);
  });
});