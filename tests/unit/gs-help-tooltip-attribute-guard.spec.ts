import { describe, it, expect } from 'vitest';

// Load all TypeScript source files as raw strings so we can inspect template content
// without relying on Node.js fs — this runs in browser (Chromium) via vitest browser mode.
const sourceFiles = import.meta.glob<string>('../../src/**/*.ts', {
  query: '?raw',
  eager: true,
  import: 'default',
});

describe('gs-help-tooltip attribute guard', () => {
  /**
   * `message` was the old attribute name — Lit silently ignores unknown attributes,
   * so a typo like `message="..."` renders nothing without any warning. The correct
   * attribute is `content`.
   */
  it('never uses message= (only content= is valid on gs-help-tooltip)', () => {
    const violations: { file: string; tag: string }[] = [];

    for (const [filePath, content] of Object.entries(sourceFiles)) {
      if (!content.includes('gs-help-tooltip')) continue;

      // Match each <gs-help-tooltip ...> opening tag (multi-line)
      const openTagPattern = /<gs-help-tooltip[\s\S]*?>/g;
      for (const match of content.matchAll(openTagPattern)) {
        const tag = match[0];
        // Catch both `message="..."` (attribute) and `.message=${...}` (property binding)
        if (/[\s.]message=/.test(tag)) {
          violations.push({ file: filePath, tag: tag.slice(0, 120) });
        }
      }
    }

    if (violations.length > 0) {
      const detail = violations
        .map(({ file, tag }) => `  ${file}:\n    ${tag.trim()}`)
        .join('\n');
      expect.fail(
        `gs-help-tooltip uses forbidden "message=" attribute (use "content=" instead):\n${detail}`,
      );
    }
  });
});
