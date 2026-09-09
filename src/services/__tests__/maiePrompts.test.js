import { describe, it, expect } from 'vitest';
import { INQUIRY_KINDS } from '../../constants/maie';
import { collectTokens, renderPrompt, sectionText } from '../../utils/renderPrompt';
import thinTemplate from '@maie/templates/thin.md?raw';
import unassignedTemplate from '@maie/templates/unassigned.md?raw';
import staleTemplate from '@maie/templates/stale.md?raw';
import missingDateTemplate from '@maie/templates/missing-date.md?raw';
import overlapTemplate from '@maie/templates/overlap.md?raw';
import genericTemplate from '@maie/templates/generic.md?raw';
import welcomeMd from '@maie/huddle/welcome.md?raw';
import replyMd from '@maie/huddle/reply.md?raw';
import demoMd from '@maie/huddle/demo.md?raw';
import recapMd from '@maie/huddle/recap.md?raw';

const KIND_TEMPLATES = {
  [INQUIRY_KINDS.THIN]: thinTemplate,
  [INQUIRY_KINDS.UNASSIGNED]: unassignedTemplate,
  [INQUIRY_KINDS.STALE]: staleTemplate,
  [INQUIRY_KINDS.MISSING_DATE]: missingDateTemplate,
  [INQUIRY_KINDS.OVERLAP]: overlapTemplate,
};

describe('templates de Maie (markdown configurable)', () => {
  it('cada kind (y el genérico) declara los tokens que su código le pasa', () => {
    const byKind = {
      [INQUIRY_KINDS.THIN]: ['title'],
      [INQUIRY_KINDS.UNASSIGNED]: ['title', 'column'],
      [INQUIRY_KINDS.STALE]: ['title', 'since'],
      [INQUIRY_KINDS.MISSING_DATE]: ['title', 'milestone'],
      [INQUIRY_KINDS.OVERLAP]: ['title'],
    };
    for (const [kind, tokens] of Object.entries(byKind)) {
      expect([...collectTokens(KIND_TEMPLATES[kind])].sort(), `template ${kind}`).toEqual([...tokens].sort());
    }
    expect([...collectTokens(genericTemplate)].sort()).toEqual(['title']);
  });

  it('con los vars de ejemplo no queda ningún token sin resolver', () => {
    const samples = {
      [INQUIRY_KINDS.THIN]: { title: 'X' },
      [INQUIRY_KINDS.UNASSIGNED]: { title: 'X', column: 'Listo' },
      [INQUIRY_KINDS.STALE]: { title: 'X', since: '5 días' },
      [INQUIRY_KINDS.MISSING_DATE]: { title: 'X', milestone: 'hay un hito cerca' },
      [INQUIRY_KINDS.OVERLAP]: { title: 'X' },
    };
    for (const [kind, vars] of Object.entries(samples)) {
      expect(renderPrompt(KIND_TEMPLATES[kind], vars)).not.toMatch(/\{/);
    }
    expect(renderPrompt(genericTemplate, { title: 'X' })).not.toMatch(/\{/);
  });

  it('los comentarios # del editor nunca se filtra al prompt', () => {
    expect(renderPrompt(unassignedTemplate, { title: 'A', column: 'B' })).not.toContain('#');
    expect(renderPrompt(genericTemplate, { title: 'A' })).not.toContain('#');
  });

  it('welcome.md tiene sección no vacía para cada ritual y sin tokens', () => {
    for (const ritual of ['standup', 'refinement', 'planning', 'blockers']) {
      const body = sectionText(welcomeMd, ritual);
      expect(body, `welcome ${ritual}`).not.toBe('');
      expect(collectTokens(body).size).toBe(0);
    }
  });

  it('reply.md: contextual usa {card}/{gaps} y generica {line}', () => {
    expect([...collectTokens(sectionText(replyMd, 'contextual'))].sort()).toEqual(['card', 'gaps']);
    expect([...collectTokens(sectionText(replyMd, 'generica'))].sort()).toEqual(['line']);
  });

  it('demo.md: cada sección del guion existe y sus tokens están cubiertos', () => {
    const sections = [
      ['webhook-blocker', ['webhook']],
      ['magic-link-owner', ['magicLink']],
      ['onboarding-stale', ['onboarding']],
      ['onboarding-stale-pregunta', ['onboarding']],
      ['qa-staging-dates-con-hito', ['qa', 'milestone', 'milestoneDays', 'milestonePlural']],
      ['qa-staging-dates-sin-hito', ['qa']],
    ];
    for (const [section, tokens] of sections) {
      expect(sectionText(demoMd, section), `sección ${section}`).not.toBe('');
      expect([...collectTokens(sectionText(demoMd, section))].sort(), `tokens ${section}`).toEqual([...tokens].sort());
    }
    const rendered = renderPrompt(sectionText(demoMd, 'qa-staging-dates-con-hito'), {
      qa: 'QA staging release',
      milestone: 'Go-live',
      milestoneDays: 3,
      milestonePlural: 's',
    });
    expect(rendered).not.toMatch(/\{/);
    expect(rendered).toContain('QA staging release');
  });

  it('recap.md: la sección final es no vacía y sin tokens', () => {
    expect(sectionText(recapMd, 'final')).not.toBe('');
    expect(collectTokens(sectionText(recapMd, 'final')).size).toBe(0);
  });
});