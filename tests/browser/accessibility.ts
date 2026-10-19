import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// Incluir los criterios A y AA de cada versión evita auditorías distintas según la suite.
export function accessibilityAudit(page: Page) {
  return new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
}
