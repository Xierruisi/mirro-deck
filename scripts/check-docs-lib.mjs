export function isEnglishDefaultReadme(source) {
  const normalizedSource = source.replace(/\r\n?/g, "\n");
  return normalizedSource.startsWith("# MirroDeck\n\n**English**");
}
