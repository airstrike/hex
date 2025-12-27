# hexrgb

A simple web app for converting between HEX and RGB color formats.

**Demo:** [hexrgb.pages.dev](https://hexrgb.pages.dev)

## Features

- Convert HEX to RGB and vice versa
- Live background color preview
- Automatic dark/light text based on background brightness
- Multiple format support (rgb, comma, space for RGB and #, 0x, plain for HEX)
- Keyboard shortcuts for format switching
- URL-based color lookup: `/ff6600`, `/savoy-blue`, `/red`
- 140+ named CSS colors with fuzzy matching
- Dynamic Open Graph images for link previews

## Usage

1. Enter a HEX color in the top field (formats: #RRGGBB, RRGGBB, 0xRRGGBB)
2. Or enter RGB values in the bottom field (formats: rgb(R,G,B), R,G,B, R G B)
3. Or navigate directly to a color: `/4B61D1` or `/savoy-blue`

### Keyboard Shortcuts

**RGB Format Shortcuts:**
- `j` - Switch to rgb(R, G, B) format
- `k` - Switch to R, G, B format
- `l` - Switch to R G B format

**HEX Format Shortcuts:**
- `u` - Switch to #RRGGBB format
- `i` - Switch to 0xRRGGBB format
- `o` - Switch to RRGGBB format (plain)

## Architecture

```
├── app.html                 # Single-page app (vanilla JS)
├── colors.yaml              # Color definitions (custom + 140 CSS colors)
├── scripts/build.js         # Generates middleware from YAML
├── functions/
│   ├── _middleware.js       # [generated] Cloudflare Pages middleware
│   └── preview.png.js       # Dynamic OG image generation
└── wrangler.toml            # Cloudflare Pages config
```

**How it works:**

1. `colors.yaml` defines all colors (hex→name mapping + aliases)
2. Build script generates `_middleware.js` with both hex→name and name→hex lookups
3. Middleware intercepts requests, tries to parse URL as hex code first, then color name
4. Fuzzy matching: strips `-` and `_`, supports `startsWith` for unambiguous matches
5. Dynamic meta tags injected for social previews

## Development

```bash
# Install dependencies
bun install

# Build middleware from colors.yaml
bun run build

# Run local dev server
make dev

# Deploy to Cloudflare Pages
make deploy
```

## Adding Colors

Edit `colors.yaml`:

```yaml
custom:
  # Simple format (fuzzy matching handles savoy-blue, savoy_blue, etc.)
  iced: "001ced"
  savoy blue: "4b61d1"

css:
  # Aliases for genuinely different names (same hex)
  cyan:
    hex: "00ffff"
    aliases: [aqua]
```

Then rebuild: `bun run build`