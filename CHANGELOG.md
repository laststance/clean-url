# Changelog

## [1.2.2] - 2026-11-03

### Fixed

- Remove all `utm_` tracking parameters regardless of casing, including vendor-specific fields such as `utm_campaignId` in Claude onboarding emails.
- Remove the `#ctaButton` email link marker from Claude Platform documentation URLs, including when it is the only remaining tracking element.
- Preserve functional query parameters, documentation heading anchors, and `#ctaButton` anchors outside Claude Platform documentation.

## [1.2.1] - 2026-10-08

### Changed

- Show a clipboard icon on the Markdown link copy button, matching the other copy button.
