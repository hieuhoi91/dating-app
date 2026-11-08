export async function matchesImageType(file: File, allowedTypes: readonly string[]) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const signatures = new Map<string, boolean>([
    ["image/jpeg", bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff],
    ["image/png", ascii(0, 8) === "\x89PNG\r\n\x1a\n"],
    ["image/webp", ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"],
    ["image/gif", ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a"],
  ]);
  return allowedTypes.includes(file.type) && signatures.get(file.type) === true;
}
