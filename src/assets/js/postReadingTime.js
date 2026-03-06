export function readingTime(text) {
  const wordsPerMinute = 80;
  const numberOfWords = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(numberOfWords / wordsPerMinute);
  return `${minutes} min read`;
}