/** A person's initials on a green disc, in place of a photo (a small picture, as a data address). */
export function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07643f"/><stop offset="1" stop-color="#0fa46b"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="62" text-anchor="middle" dominant-baseline="central" font-family="Heebo,Arial,sans-serif" font-size="46" font-weight="800" fill="#fff">${letters}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
