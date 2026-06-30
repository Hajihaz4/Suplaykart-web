# assets/

Shared **brand and design assets** for Suplaykart.

Source-of-truth media that is shared across apps (Customer Web App, Admin Panel,
docs). App-specific runtime assets that need to be served by the bundler will
later live inside each app's own `public/` folder — this directory is the
canonical, version-controlled original.

## What goes here

| Subfolder   | Purpose                                                      |
| ----------- | ----------------------------------------------------------- |
| `logo/`     | Logo lockups, marks, and variants (SVG preferred).          |
| `images/`   | Photography, illustrations, marketing imagery.              |
| `icons/`    | Icon source files and exported sets.                        |
| `fonts/`    | Licensed font files + license notes.                        |
| `brand/`    | Color palette, typography scale, logo usage guidelines.     |
| `design/`   | Design source files (Figma exports, mockups, PSDs).         |

## Conventions

- Prefer **SVG** for logos/icons and optimized **WebP/AVIF** for raster images.
- Keep large binaries out of the main history where possible (consider Git LFS
  for anything over a few MB — decide before committing big files).
- Record any font/image **license** alongside the file so usage stays compliant.
