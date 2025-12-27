// AUTO-GENERATED - DO NOT EDIT
// Edit colors.yaml and run: npm run build

const { hexToName, nameToHex, tryParseColor, lookupColorName } = require('../colors.js');

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
          ? `${colorName} • #${hex.toUpperCase()} • rgb(${r}, ${g}, ${b})`
          : `#${hex.toUpperCase()} • rgb(${r}, ${g}, ${b})`;

        const title = `${colorInfo} • hex to rgb like it's 1999`;

        const imageUrl = `https://hexrgb.pages.dev/preview.png?color=${hex}`;
        html = html.replace(
          /<title>[^<]*<\/title>/,
          `<title>${title}</title>`
        );
        html = html.replace(
          /<meta property="og:image" content="[^"]*">/,
          `<meta property="og:image" content="${imageUrl}">`
        );
        html = html.replace(
          /<meta name="twitter:image" content="[^"]*">/,
          `<meta name="twitter:image" content="${imageUrl}">`
        );
        html = html.replace(
          /<meta property="og:description" content="[^"]*">/,
          `<meta property="og:description" content="${colorInfo}">`
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
    const ipKey = `ip_${ip}`;

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
