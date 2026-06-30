# old-html/

The **original / legacy static HTML** for Suplaykart.

Drop the existing website's raw HTML, CSS, JS, and inline assets here exactly as
they are today. This is a *reference and migration source* — it is **not** wired
into the build and will not be deployed.

## What goes here

- Original `.html` pages (home, product, cart, checkout, admin mockups, etc.).
- The CSS / JS / images those pages depend on, kept in their original structure.
- Any exported template or theme the current site is based on.

## Why it exists

When we rebuild the Customer Web App and Admin Panel, this folder lets us:

1. Preserve the original markup, copy, and styling as ground truth.
2. Port layouts and design details faithfully into the new components.
3. Diff "old vs new" to confirm nothing was lost in the migration.

## Rules

- **Do not edit** these files to "improve" them — treat the folder as read-only
  history. Improvements belong in the new app, not here.
- Once a page has been fully migrated and verified, note it in
  `docs/guides/migration.md` rather than deleting the original.
