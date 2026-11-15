export interface Fact {
  id: string;
  cat: string;
  tags: string[];
  title: string;
  text: string;
  /** options[0] is always the correct answer; shuffled on display */
  quiz?: { q: string; options: string[] };
  /** Wikipedia article title */
  wiki?: string;
  img?: string;
  url?: string;
  live?: boolean;
}

export interface Trivia {
  id: string;
  cat: string;
  q: string;
  /** options[0] is the correct answer */
  options: string[];
}

export type Item =
  | { key: string; kind: 'fact'; fact: Fact; why: string }
  | { key: string; kind: 'review'; fact: Fact }
  | { key: string; kind: 'trivia'; trivia: Trivia };
