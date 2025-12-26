const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const colorsPath = path.join(__dirname, '..', 'colors.yaml');
const outputPath = path.join(__dirname, '..', 'functions', '_middleware.js');

const colors = yaml.load(fs.readFileSync(colorsPath, 'utf8'));

// Build hex -> name map (for display)
const hexToName = {};
// Build name -> hex map (for URL lookup)
const nameToHex = {};

// Process custom colors
for (const [name, value] of Object.entries(colors.custom || {})) {
  // Support both simple format (iced: "001ced") and object format ({hex, aliases})
  const hex = (typeof value === 'string' ? value : value.hex).toLowerCase();
  const aliases = typeof value === 'object' ? (value.aliases || []) : [];

  hexToName[hex] = name;
  nameToHex[name.toLowerCase()] = hex;

  for (const alias of aliases) {
    nameToHex[alias.toLowerCase()] = hex;
  }
}

// Process CSS colors
for (const [name, hex] of Object.entries(colors.css || {})) {
  const hexLower = String(hex).toLowerCase().padStart(6, '0');
  hexToName[hexLower] = name;
  nameToHex[name.toLowerCase()] = hexLower;
}

const middleware = `// AUTO-GENERATED - DO NOT EDIT
// Edit colors.yaml and run: npm run build

// Hex -> display name
const hexToName = ${JSON.stringify(hexToName, null, 2)};

// Name -> hex (includes aliases)
const nameToHex = ${JSON.stringify(nameToHex, null, 2)};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle counter endpoints
  if (url.pathname === '/counter/get') {
    return handleCounterGet(env);
  }

  if (url.pathname === '/counter/hit') {
    return handleCounterHit(env, request);
  }

  // For index requests or color paths, inject dynamic meta tags
  const isIndexPath = url.pathname === '/app.html' || url.pathname === '/';
  const isPotentialColorPath = !isIndexPath && !url.pathname.startsWith('/counter/') && !url.pathname.startsWith('/preview') && !url.pathname.startsWith('/functions/') && !url.pathname.startsWith('/index.');

  if (isIndexPath || isPotentialColorPath) {
    const queryString = url.search.slice(1);
    let colorParam = queryString;

    if (!colorParam && isPotentialColorPath) {
      colorParam = decodeURIComponent(url.pathname.slice(1));
    }

    if (colorParam) {
      const firstParam = colorParam.split('&')[0];
      let hex = tryParseColor(firstParam);

      if (hex) {
        const appUrl = new URL('/app.html', request.url);
        const response = await env.ASSETS.fetch(appUrl);
        let html = await response.text();

        const colorName = hexToName[hex];
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);

        const colorInfo = colorName
          ? \`\${colorName} \u2022 #\${hex.toUpperCase()} \u2022 rgb(\${r}, \${g}, \${b})\`
          : \`#\${hex.toUpperCase()} \u2022 rgb(\${r}, \${g}, \${b})\`;

        const title = \`\${colorInfo} \u2022 hex to rgb like it's 1999\`;

        const imageUrl = \`https://hexrgb.pages.dev/preview.png?color=\${hex}\`;
        html = html.replace(
          /<title>[^<]*<\\/title>/,
          \`<title>\${title}</title>\`
        );
        html = html.replace(
          /<meta property="og:image" content="[^"]*">/,
          \`<meta property="og:image" content="\${imageUrl}">\`
        );
        html = html.replace(
          /<meta name="twitter:image" content="[^"]*">/,
          \`<meta name="twitter:image" content="\${imageUrl}">\`
        );
        html = html.replace(
          /<meta property="og:description" content="[^"]*">/,
          \`<meta property="og:description" content="\${colorInfo}">\`
        );

        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          }
        });
      }
    }
  }

  if (url.pathname === '/' || url.pathname === '/app.html') {
    const appUrl = new URL('/app.html', request.url);
    return env.ASSETS.fetch(appUrl);
  }

  return context.next();
}

// Try to parse input as hex code first, then as color name
function tryParseColor(input) {
  // Clean prefix
  let cleaned = input.replace(/^0x/i, '').replace(/^#/, '');

  // 1. If input is ONLY hex chars, treat as hex code (highest priority)
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    return (cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2]).toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    return cleaned.toLowerCase();
  }

  // 2. Try as color name
  return lookupColorName(input);
}

// Lookup color name with fuzzy matching
function lookupColorName(input) {
  const normalized = input.toLowerCase().trim();

  // Exact match
  if (nameToHex[normalized]) {
    return nameToHex[normalized];
  }

  // Strip - and _ and try again
  const stripped = normalized.replace(/[-_]/g, '');
  if (nameToHex[stripped]) {
    return nameToHex[stripped];
  }

  // Check all keys with normalization
  for (const [name, hex] of Object.entries(nameToHex)) {
    if (name.replace(/[-_ ]/g, '') === stripped) {
      return hex;
    }
  }

  // startsWith match (only if unambiguous)
  const matches = Object.entries(nameToHex).filter(([name]) =>
    name.replace(/[-_ ]/g, '').startsWith(stripped)
  );
  if (matches.length === 1) {
    return matches[0][1];
  }

  return null;
}

async function handleCounterGet(env) {
  try {
    const count = await env.HEX_STORAGE.get('visitor_count');
    const value = count ? parseInt(count) : 0;

    return new Response(JSON.stringify({ value }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, value: 0 }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

async function handleCounterHit(env, request) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipKey = \`ip_\${ip}\`;

    const lastVisit = await env.HEX_STORAGE.get(ipKey);
    const now = Date.now();

    if (lastVisit && (now - parseInt(lastVisit)) < 3600000) {
      const count = await env.HEX_STORAGE.get('visitor_count');
      const currentValue = count ? parseInt(count) : 0;

      return new Response(JSON.stringify({ value: currentValue, cached: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const count = await env.HEX_STORAGE.get('visitor_count');
    const currentValue = count ? parseInt(count) : 0;
    const newValue = currentValue + 1;

    await env.HEX_STORAGE.put('visitor_count', newValue.toString());
    await env.HEX_STORAGE.put(ipKey, now.toString(), { expirationTtl: 3600 });

    return new Response(JSON.stringify({ value: newValue }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, value: 0 }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
`;

fs.writeFileSync(outputPath, middleware);
console.log('Generated functions/_middleware.js');
console.log(`  ${Object.keys(hexToName).length} colors (hex -> name)`);
console.log(`  ${Object.keys(nameToHex).length} entries (name -> hex, includes aliases)`);
