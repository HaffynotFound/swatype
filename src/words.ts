export const COMMON_WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well",
  "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "is", "are", "was", "were", "has", "had", 
  "been", "make", "made", "build", "design", "fast", "slow", "run", "race", "type", "word", "letter", "click", "sound", "music",
  "minimal", "dark", "light", "theme", "score", "timer", "count", "start", "stop", "ready", "lobby", "results", "player", "host",
  "friend", "join", "room", "code", "group", "game", "speed", "test", "clock", "watch", "track", "live", "progress", "correct",
  "mistake", "error", "accuracy", "final", "winner", "rank", "victory", "rematch", "return", "leave", "kick", "user", "name",
  "common", "english", "text", "mode", "preset", "second", "minute", "hour", "space", "button", "screen", "visual", "clean"
];

export function getRandomCorpus(count: number = 100): string[] {
  const shuffled = [...COMMON_WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
