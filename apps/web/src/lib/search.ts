/** Turkish-aware, accent-insensitive folding so "cankaya" finds "Çankaya" and "IST" finds "İstanbul". */
export function foldSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

/** Prefix matches rank above substring matches; anything else is hidden. */
export function rankOption(label: string, query: string): number {
  if (!query) return 1;
  const haystack = foldSearch(label);
  const needle = foldSearch(query);
  if (haystack.startsWith(needle)) return 2;
  if (haystack.includes(needle)) return 1;
  return 0;
}
