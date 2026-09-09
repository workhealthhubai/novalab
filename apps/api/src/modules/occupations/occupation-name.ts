/** Turkish-aware lower-casing used as the duplicate key ("KAYNAKÇI" and "Kaynakçı" collide). */
export function occupationNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}
