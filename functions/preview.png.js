// PNG preview endpoint - generates minimal 1x1 PNG with solid color
// Returns as data URI for embedding directly in meta tags

function createSolidColorPNG(r, g, b, width = 600, height = 600) {
  // Create a PNG with solid color at specified size
  // Using indexed color mode (palette) for efficiency

  const header = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  ]);

  // IHDR chunk
  const ihdr = new Uint8Array([
    0x00, 0x00, 0x00, 0x0D, // Chunk length
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    (width >>> 24) & 0xFF, (width >>> 16) & 0xFF, (width >>> 8) & 0xFF, width & 0xFF, // Width
    (height >>> 24) & 0xFF, (height >>> 16) & 0xFF, (height >>> 8) & 0xFF, height & 0xFF, // Height
    0x08, // Bit depth
    0x03, // Color type: 3 (indexed)
    0x00, // Compression
    0x00, // Filter
    0x00, // Interlace
  ]);
  const ihdrCrc = crc32(ihdr.slice(4));
  const ihdrWithCrc = new Uint8Array([...ihdr, (ihdrCrc >>> 24) & 0xFF, (ihdrCrc >>> 16) & 0xFF, (ihdrCrc >>> 8) & 0xFF, ihdrCrc & 0xFF]);

  // PLTE chunk (palette with single color)
  const plte = new Uint8Array([
    0x00, 0x00, 0x00, 0x03, // Chunk length (3 bytes - 1 color)
    0x50, 0x4C, 0x54, 0x45, // "PLTE"
    r, g, b // Single palette entry
  ]);
  const plteCrc = crc32(plte.slice(4));
  const plteWithCrc = new Uint8Array([...plte, (plteCrc >>> 24) & 0xFF, (plteCrc >>> 16) & 0xFF, (plteCrc >>> 8) & 0xFF, plteCrc & 0xFF]);

  // IDAT chunk (compressed image data - all pixels are index 0)
  // Each row is: filter_byte (0) + width pixels (all 0s for palette index 0)
  const rowSize = width + 1; // filter byte + pixels
  const totalDataSize = rowSize * height;

  // Create uncompressed data
  const pixelData = new Uint8Array(totalDataSize);
  // All zeros means filter byte 0 and palette index 0 for all pixels

  // Calculate Adler-32 for pixel data
  const adler = adler32(pixelData);

  // Create zlib compressed data (using uncompressed blocks)
  const maxBlockSize = 65535;
  const idatData = [];

  // zlib header
  idatData.push(0x78, 0x01); // CMF and FLG

  // Split into uncompressed blocks if needed
  let offset = 0;
  while (offset < totalDataSize) {
    const blockSize = Math.min(maxBlockSize, totalDataSize - offset);
    const isLast = (offset + blockSize >= totalDataSize) ? 1 : 0;

    idatData.push(isLast); // BFINAL and BTYPE
    idatData.push(blockSize & 0xFF, (blockSize >>> 8) & 0xFF); // LEN
    idatData.push((~blockSize) & 0xFF, ((~blockSize) >>> 8) & 0xFF); // NLEN

    for (let i = 0; i < blockSize; i++) {
      idatData.push(pixelData[offset + i]);
    }

    offset += blockSize;
  }

  // Add Adler-32 checksum
  idatData.push((adler >>> 24) & 0xFF, (adler >>> 16) & 0xFF, (adler >>> 8) & 0xFF, adler & 0xFF);

  const idatContent = new Uint8Array(idatData);
  const idat = new Uint8Array([
    (idatContent.length >>> 24) & 0xFF, (idatContent.length >>> 16) & 0xFF,
    (idatContent.length >>> 8) & 0xFF, idatContent.length & 0xFF,
    0x49, 0x44, 0x41, 0x54, // "IDAT"
    ...idatContent
  ]);
  const idatCrc = crc32(idat.slice(4));
  const idatWithCrc = new Uint8Array([...idat, (idatCrc >>> 24) & 0xFF, (idatCrc >>> 16) & 0xFF, (idatCrc >>> 8) & 0xFF, idatCrc & 0xFF]);

  // IEND chunk
  const iend = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, // Chunk length
    0x49, 0x45, 0x4E, 0x44, // "IEND"
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  // Combine all chunks
  return new Uint8Array([...header, ...ihdrWithCrc, ...plteWithCrc, ...idatWithCrc, ...iend]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function adler32(data) {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const queryString = url.searchParams.get('color');

  // Parse hex color
  let hex = queryString ? queryString.replace(/^0x/i, '').replace(/^#/, '').replace(/[^0-9a-f]/gi, '') : 'f2eede';
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    hex = 'ff6600';
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Create the PNG with 1337x826 (golden ratio, leetness)
  const pngBuffer = createSolidColorPNG(r, g, b, 1337, 826);

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
  });
}
