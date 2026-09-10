/**
 * Unit tests for Markdown link formatting used by the popup copy button.
 */

import { describe, test, expect } from 'vitest';

import { formatMarkdownLink } from '../../utils/format-markdown-link';

describe('formatMarkdownLink', () => {
  test('copies the page title and URL as a Markdown link', () => {
    // Arrange
    const title = 'Example Domain';
    const url = 'https://example.com/?utm_source=google';

    // Act
    const markdown = formatMarkdownLink(title, url);

    // Assert
    expect(markdown).toBe(
      '[Example Domain](https://example.com/?utm_source=google)',
    );
  });

  test('uses the URL as link text when the page title is blank', () => {
    // Arrange
    const title = '   ';
    const url = 'https://example.com/path';

    // Act
    const markdown = formatMarkdownLink(title, url);

    // Assert
    expect(markdown).toBe('[https://example.com/path](https://example.com/path)');
  });

  test('collapses whitespace in the title so the Markdown link stays on one line', () => {
    // Arrange
    const title = 'GitHub\nlaststance\tclean-url';
    const url = 'https://github.com/laststance/clean-url';

    // Act
    const markdown = formatMarkdownLink(title, url);

    // Assert
    expect(markdown).toBe(
      '[GitHub laststance clean-url](https://github.com/laststance/clean-url)',
    );
  });

  test('escapes closing brackets in the title so the Markdown link stays valid', () => {
    // Arrange
    const title = 'Array[0] notes';
    const url = 'https://example.com/notes';

    // Act
    const markdown = formatMarkdownLink(title, url);

    // Assert
    expect(markdown).toBe('[Array[0\\] notes](https://example.com/notes)');
  });

  test('wraps URLs that contain parentheses so the destination does not truncate', () => {
    // Arrange
    const title = 'Foo (bar)';
    const url = 'https://en.wikipedia.org/wiki/Foo_(bar)';

    // Act
    const markdown = formatMarkdownLink(title, url);

    // Assert
    expect(markdown).toBe(
      '[Foo (bar)](<https://en.wikipedia.org/wiki/Foo_(bar)>)',
    );
  });
});
