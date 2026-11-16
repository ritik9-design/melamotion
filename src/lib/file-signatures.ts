function startsWith(bytes: Uint8Array, text: string, offset = 0) {
  if (bytes.length < offset + text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function isZip(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
}

function isOle(bytes: Uint8Array) {
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function isPlainText(bytes: Uint8Array) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  let text = "";
  for (const byte of sample) {
    if (byte === 0) return false;
    text += String.fromCharCode(byte);
  }
  const trimmed = text.trimStart().toLowerCase();
  if (trimmed.startsWith("<") || trimmed.startsWith("<?xml") || trimmed.includes("<script") || trimmed.includes("<html")) return false;
  return true;
}

/** Confirm the file bytes match the type we are willing to store. */
export function fileMatchesDeclaredType(bytes: Uint8Array, mime: string) {
  if (bytes.length < 4) return false;
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "image/gif":
      return startsWith(bytes, "GIF87a") || startsWith(bytes, "GIF89a");
    case "image/webp":
      return startsWith(bytes, "RIFF") && bytes.length >= 12 && startsWith(bytes, "WEBP", 8);
    case "video/webm":
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "video/mp4":
    case "video/quicktime":
      return bytes.length > 11 && startsWith(bytes, "ftyp", 4);
    case "application/pdf":
      return startsWith(bytes, "%PDF");
    case "application/zip":
    case "application/x-zip-compressed":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return isZip(bytes);
    case "application/msword":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.ms-excel":
      return isOle(bytes);
    case "application/rtf":
      return startsWith(bytes, "{\\rtf");
    case "text/plain":
    case "text/csv":
      return isPlainText(bytes);
    default:
      return false;
  }
}
