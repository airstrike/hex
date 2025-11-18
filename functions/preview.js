// Generate preview image
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const queryString = url.searchParams.get('color');
  const format = url.searchParams.get('format') || 'svg'; // svg or png

  // If no color specified, show branded preview with VHS stripes
  if (!queryString) {
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="stripes" patternUnits="userSpaceOnUse" width="1697" height="1697" patternTransform="rotate(45)">
      <rect x="0" y="0" width="565" height="1697" fill="#CC3E28"/>
      <rect x="565" y="0" width="565" height="1697" fill="#216609"/>
      <rect x="1131" y="0" width="566" height="1697" fill="#1e6fcc"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#F2EEDE"/>
  <rect width="1200" height="630" fill="url(#stripes)"/>
  <text x="600" y="315" font-family="'Courier New', Courier, 'SF Mono', Monaco, monospace" font-size="120" text-anchor="middle" dominant-baseline="middle" fill="#F2EEDE" opacity="0.95">
    <tspan font-weight="700">hex</tspan><tspan font-weight="400">rgb</tspan>
  </text>
</svg>`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      }
    });
  }

  // Parse hex color
  let hex = queryString.replace(/^0x/i, '').replace(/^#/, '').replace(/[^0-9a-f]/gi, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Default to orange if invalid
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    hex = 'ff6600';
  }

  // Calculate if we need dark or light text (WCAG contrast ratio)
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const sRGB = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];

  // Choose white or black text based on WCAG recommendations
  const textColor = luminance > 0.179 ? '#000000' : '#ffffff';
  const colorText = `#${hex.toUpperCase()}`;

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#${hex}"/>
  <text x="600" y="315" font-family="'Courier New', Courier, 'SF Mono', Monaco, monospace" font-size="80" font-weight="700" letter-spacing="-0.05em" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" opacity="0.8">${colorText}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
  });
}
