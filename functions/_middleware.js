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

// CSS color names lookup (all 140 standard colors + extras)
function getCSSColorName(hex) {
  const cssColors = {
    // Custom
    '001ced': 'iced',
    // Standard CSS colors (140)
    'f0f8ff': 'aliceblue', 'faebd7': 'antiquewhite', '7fffd4': 'aquamarine',
    'f0ffff': 'azure', 'f5f5dc': 'beige', 'ffe4c4': 'bisque', '000000': 'black',
    'ffebcd': 'blanchedalmond', '0000ff': 'blue', '8a2be2': 'blueviolet', 'a52a2a': 'brown',
    'deb887': 'burlywood', '5f9ea0': 'cadetblue', '7fff00': 'chartreuse', 'd2691e': 'chocolate',
    'ff7f50': 'coral', '6495ed': 'cornflowerblue', 'fff8dc': 'cornsilk', 'dc143c': 'crimson',
    '00ffff': 'cyan', '00008b': 'darkblue', '008b8b': 'darkcyan', 'b8860b': 'darkgoldenrod',
    'a9a9a9': 'darkgray', '006400': 'darkgreen', 'bdb76b': 'darkkhaki', '8b008b': 'darkmagenta',
    '556b2f': 'darkolivegreen', 'ff8c00': 'darkorange', '9932cc': 'darkorchid', '8b0000': 'darkred',
    'e9967a': 'darksalmon', '8fbc8f': 'darkseagreen', '483d8b': 'darkslateblue', '2f4f4f': 'darkslategray',
    '00ced1': 'darkturquoise', '9400d3': 'darkviolet', 'ff1493': 'deeppink', '00bfff': 'deepskyblue',
    '696969': 'dimgray', '1e90ff': 'dodgerblue', 'b22222': 'firebrick', 'fffaf0': 'floralwhite',
    '228b22': 'forestgreen', 'dcdcdc': 'gainsboro', 'f8f8ff': 'ghostwhite',
    'ffd700': 'gold', 'daa520': 'goldenrod', '808080': 'gray', '008000': 'green',
    'adff2f': 'greenyellow', 'f0fff0': 'honeydew', 'ff69b4': 'hotpink', 'cd5c5c': 'indianred',
    '4b0082': 'indigo', 'fffff0': 'ivory', 'f0e68c': 'khaki', 'e6e6fa': 'lavender',
    'fff0f5': 'lavenderblush', '7cfc00': 'lawngreen', 'fffacd': 'lemonchiffon', 'add8e6': 'lightblue',
    'f08080': 'lightcoral', 'e0ffff': 'lightcyan', 'fafad2': 'lightgoldenrodyellow', 'd3d3d3': 'lightgray',
    '90ee90': 'lightgreen', 'ffb6c1': 'lightpink', 'ffa07a': 'lightsalmon', '20b2aa': 'lightseagreen',
    '87cefa': 'lightskyblue', '778899': 'lightslategray', 'b0c4de': 'lightsteelblue', 'ffffe0': 'lightyellow',
    '00ff00': 'lime', '32cd32': 'limegreen', 'faf0e6': 'linen', 'ff00ff': 'magenta',
    '800000': 'maroon', '66cdaa': 'mediumaquamarine', '0000cd': 'mediumblue', 'ba55d3': 'mediumorchid',
    '9370db': 'mediumpurple', '3cb371': 'mediumseagreen', '7b68ee': 'mediumslateblue', '00fa9a': 'mediumspringgreen',
    '48d1cc': 'mediumturquoise', 'c71585': 'mediumvioletred', '191970': 'midnightblue', 'f5fffa': 'mintcream',
    'ffe4e1': 'mistyrose', 'ffe4b5': 'moccasin', 'ffdead': 'navajowhite', '000080': 'navy',
    'fdf5e6': 'oldlace', '808000': 'olive', '6b8e23': 'olivedrab', 'ffa500': 'orange',
    'ff4500': 'orangered', 'da70d6': 'orchid', 'eee8aa': 'palegoldenrod', '98fb98': 'palegreen',
    'afeeee': 'paleturquoise', 'db7093': 'palevioletred', 'ffefd5': 'papayawhip', 'ffdab9': 'peachpuff',
    'cd853f': 'peru', 'ffc0cb': 'pink', 'dda0dd': 'plum', 'b0e0e6': 'powderblue',
    '800080': 'purple', '663399': 'rebeccapurple', 'ff0000': 'red', 'bc8f8f': 'rosybrown',
    '4169e1': 'royalblue', '8b4513': 'saddlebrown', 'fa8072': 'salmon', 'f4a460': 'sandybrown',
    '2e8b57': 'seagreen', 'fff5ee': 'seashell', 'a0522d': 'sienna', 'c0c0c0': 'silver',
    '87ceeb': 'skyblue', '6a5acd': 'slateblue', '708090': 'slategray', 'fffafa': 'snow',
    '00ff7f': 'springgreen', '4682b4': 'steelblue', 'd2b48c': 'tan', '008080': 'teal',
    'd8bfd8': 'thistle', 'ff6347': 'tomato', '40e0d0': 'turquoise', 'ee82ee': 'violet',
    'f5deb3': 'wheat', 'ffffff': 'white', 'f5f5f5': 'whitesmoke', 'ffff00': 'yellow',
    '9acd32': 'yellowgreen',
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
