// Turn a user-pasted product image link into something usable as an <img> src.
//
// Owners typically paste a Google Drive "share" link, which points at a viewer
// page rather than the image bytes. We extract the file id and rewrite it to the
// Drive thumbnail endpoint, which serves the image directly for files shared as
// "Anyone with the link". Any other http(s) URL is passed through unchanged so a
// plain direct image link also works. Empty/unusable input yields null.

/** Extract a Google Drive file id from the common share-link shapes. */
export function driveFileId(s: string): string | null {
  // …/file/d/<id>/…  or  …/d/<id>
  const byPath = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (byPath) return byPath[1];
  // …?id=<id>  or  …&id=<id>
  const byQuery = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byQuery) return byQuery[1];
  return null;
}

/** Normalize a pasted link to an embeddable image URL, or null if unusable. */
export function driveImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (/(?:drive|docs)\.google\.com/i.test(s)) {
    const id = driveFileId(s);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : null;
  }
  // Already a Drive thumbnail/googleusercontent or any other direct image URL.
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}
