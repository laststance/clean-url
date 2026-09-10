/**
 * Builds a pasteable Markdown link `[title](url)` for the popup clipboard action. Called by {@link CleanUrlPopup.copyMarkdownLink} when the Current URL copy button is clicked.
 * @example
 * formatMarkdownLink('Example Domain', 'https://example.com/') // '[Example Domain](https://example.com/)'
 */
export function formatMarkdownLink(title: string, url: string): string {
  // Prefer a trimmed title; use the URL when Chrome has not set one
  const rawTitle = title.trim() || url;
  // Collapse whitespace so multi-line tab titles stay on one Markdown line
  const normalizedTitle = rawTitle.replace(/\s+/g, ' ');
  // Escape `]` so a title like `Foo]Bar` cannot close the link text early
  const linkTitle = normalizedTitle.replace(/\\/g, '\\\\').replace(/]/g, '\\]');

  // Angle-bracket destination keeps `(` / `)` in the URL from truncating the link
  if (url.includes('(') || url.includes(')')) {
    return `[${linkTitle}](<${url}>)`;
  }

  return `[${linkTitle}](${url})`;
}
