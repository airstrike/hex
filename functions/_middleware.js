// Cloudflare Pages Function - runs on every request
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
  const isIndexPath = url.pathname === '/index.htm' || url.pathname === '/index.html' || url.pathname === '/';
  const isPotentialColorPath = !isIndexPath && !url.pathname.startsWith('/counter/') && !url.pathname.startsWith('/preview') && !url.pathname.startsWith('/functions/');

  if (isIndexPath || isPotentialColorPath) {
    // Try query string first, then path
    const queryString = url.search.slice(1);
    let colorParam = queryString;

    if (!colorParam && isPotentialColorPath) {
      // Use path as color (e.g., /ff6600 or /0xff6600)
      colorParam = url.pathname.slice(1);
    }

    if (colorParam) {
      // Parse color - take first part before any & (to handle cache-busting params)
      const firstParam = colorParam.split('&')[0];
      let hex = firstParam.replace(/^0x/i, '').replace(/^#/, '').replace(/[^0-9a-f]/gi, '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }

      if (/^[0-9a-f]{6}$/i.test(hex)) {
        // Fetch the static HTML
        const response = await context.next();
        let html = await response.text();

        // Get CSS color name if available
        const colorName = getCSSColorName(hex);
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);

        const colorInfo = colorName
          ? `${colorName} • #${hex.toUpperCase()} • rgb(${r}, ${g}, ${b})`
          : `#${hex.toUpperCase()} • rgb(${r}, ${g}, ${b})`;

        const title = `${colorInfo} • hex to rgb like it's 1999`;

        // Update meta tags and title
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

  // Pass through for all other requests
  return context.next();
}

// Get current counter value
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

// CSS color names lookup (common colors only)
function getCSSColorName(hex) {
  const cssColors = {
    'ffffff': 'white', '000000': 'black', 'ff0000': 'red', '00ff00': 'lime', '0000ff': 'blue',
    'ffff00': 'yellow', '00ffff': 'cyan', 'ff00ff': 'magenta', 'c0c0c0': 'silver', '808080': 'gray',
    '800000': 'maroon', '808000': 'olive', '008000': 'green', '800080': 'purple', '008080': 'teal',
    '000080': 'navy', 'ffa500': 'orange', 'ffc0cb': 'pink', 'a52a2a': 'brown', 'f0e68c': 'khaki',
    '4b0082': 'indigo', 'ee82ee': 'violet', 'dda0dd': 'plum', 'fa8072': 'salmon', 'f08080': 'lightcoral',
    '663399': 'rebeccapurple', '001ced': 'iced',
    'cd5c5c': 'indianred', 'dc143c': 'crimson', 'ff1493': 'deeppink', 'ff69b4': 'hotpink',
    'ffd700': 'gold', 'f5f5dc': 'beige', 'ffe4b5': 'moccasin', 'ffdab9': 'peachpuff', 'ffdead': 'navajowhite',
    'ffe4e1': 'mistyrose', 'fffacd': 'lemonchiffon', 'fff8dc': 'cornsilk', 'fffaf0': 'floralwhite',
    'f5fffa': 'mintcream', 'f0fff0': 'honeydew', 'f0f8ff': 'aliceblue', 'e6e6fa': 'lavender',
    'd3d3d3': 'lightgray', 'a9a9a9': 'darkgray', '696969': 'dimgray', '778899': 'lightslategray',
    '708090': 'slategray', '2f4f4f': 'darkslategray', '191970': 'midnightblue', '483d8b': 'darkslateblue',
    '6a5acd': 'slateblue', '7b68ee': 'mediumslateblue', '8a2be2': 'blueviolet', '9370db': 'mediumpurple',
    '9932cc': 'darkorchid', 'ba55d3': 'mediumorchid', 'dda0dd': 'plum', 'd8bfd8': 'thistle',
    '87ceeb': 'skyblue', '87cefa': 'lightskyblue', '00bfff': 'deepskyblue', '1e90ff': 'dodgerblue',
    '6495ed': 'cornflowerblue', '4169e1': 'royalblue', '0000cd': 'mediumblue', '00008b': 'darkblue',
    '20b2aa': 'lightseagreen', '48d1cc': 'mediumturquoise', '40e0d0': 'turquoise', '00ced1': 'darkturquoise',
    '5f9ea0': 'cadetblue', 'b0e0e6': 'powderblue', 'add8e6': 'lightblue', '00ffff': 'aqua',
    '7fffd4': 'aquamarine', 'afeeee': 'paleturquoise', '90ee90': 'lightgreen', '98fb98': 'palegreen',
    '00fa9a': 'mediumspringgreen', '00ff7f': 'springgreen', '3cb371': 'mediumseagreen', '2e8b57': 'seagreen',
    '228b22': 'forestgreen', '006400': 'darkgreen', '9acd32': 'yellowgreen', '6b8e23': 'olivedrab',
    'adff2f': 'greenyellow', '7fff00': 'chartreuse', '7cfc00': 'lawngreen', 'ffffe0': 'lightyellow',
    'fffacd': 'lemonchiffon', 'fafad2': 'lightgoldenrodyellow', 'ffebcd': 'blanchedalmond',
    'ffe4c4': 'bisque', 'ffdead': 'navajowhite', 'ffd700': 'gold', 'daa520': 'goldenrod',
    'b8860b': 'darkgoldenrod', 'bc8f8f': 'rosybrown', 'cd5c5c': 'indianred', '8b4513': 'saddlebrown',
    'a0522d': 'sienna', 'd2691e': 'chocolate', 'b22222': 'firebrick', 'ff6347': 'tomato',
    'ff4500': 'orangered', 'ff8c00': 'darkorange', 'ffa07a': 'lightsalmon', 'e9967a': 'darksalmon',
    'f4a460': 'sandybrown', 'deb887': 'burlywood', 'd2b48c': 'tan', 'bc8f8f': 'rosybrown',
  };

  return cssColors[hex.toLowerCase()] || null;
}

// Increment counter
async function handleCounterHit(env, request) {
  try {
    // Get IP address for deduplication
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipKey = `ip_${ip}`;

    // Check if this IP visited recently (within 1 hour)
    const lastVisit = await env.HEX_STORAGE.get(ipKey);
    const now = Date.now();

    if (lastVisit && (now - parseInt(lastVisit)) < 3600000) {
      // IP visited within the last hour, don't increment
      const count = await env.HEX_STORAGE.get('visitor_count');
      const currentValue = count ? parseInt(count) : 0;

      return new Response(JSON.stringify({ value: currentValue, cached: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Increment counter
    const count = await env.HEX_STORAGE.get('visitor_count');
    const currentValue = count ? parseInt(count) : 0;
    const newValue = currentValue + 1;

    await env.HEX_STORAGE.put('visitor_count', newValue.toString());

    // Store last visit time for this IP (expires after 1 hour)
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
