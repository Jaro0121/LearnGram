export interface Category {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** gradient colours for cards */
  from: string;
  to: string;
  /** Open Trivia DB category id, when a good match exists */
  trivia?: number;
}

export const CATEGORIES: Category[] = [
  { id: 'space', name: 'Space & Physics', emoji: '🪐', blurb: 'Planets, stars, light and time', from: '#1b1464', to: '#6a2fb5', trivia: 17 },
  { id: 'nature', name: 'Nature & Animals', emoji: '🦉', blurb: 'Wild facts about living things', from: '#0b4d3a', to: '#1f8a4c', trivia: 27 },
  { id: 'body', name: 'Body & Health', emoji: '🫀', blurb: 'How your body really works', from: '#7a1c3a', to: '#c2413b' },
  { id: 'history', name: 'History', emoji: '🏛️', blurb: 'Moments that shaped the world', from: '#5a3a1a', to: '#a8702a', trivia: 23 },
  { id: 'geography', name: 'Geography', emoji: '🌍', blurb: 'Places, maps and extremes', from: '#0d4a6b', to: '#1c8aa8', trivia: 22 },
  { id: 'tech', name: 'Technology', emoji: '💡', blurb: 'Computers, the internet, inventions', from: '#14213d', to: '#2f5fd0', trivia: 18 },
  { id: 'mind', name: 'Psychology', emoji: '🧠', blurb: 'Memory, biases and behaviour', from: '#4a1a6b', to: '#b03a8c' },
  { id: 'math', name: 'Math & Logic', emoji: '♾️', blurb: 'Surprising numbers and puzzles', from: '#12384a', to: '#2a9d8f', trivia: 19 },
  { id: 'culture', name: 'Language & Arts', emoji: '🎨', blurb: 'Words, music and masterpieces', from: '#6b2a1a', to: '#d0652f', trivia: 25 },
  { id: 'money', name: 'Money & Economics', emoji: '💰', blurb: 'Ideas that make you financially smarter', from: '#1f4a1a', to: '#7a9a1f' },
];

export const CAT: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
