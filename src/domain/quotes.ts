import type { DayKey } from './date';

/**
 * One line at the top of the home screen, changing daily.
 *
 * Chosen for one thing: they are all about dreams, carrying on, or coming
 * back. Nothing here scolds, and nothing implies you are behind — the home
 * screen is the first thing you see on a bad day as well as a good one.
 *
 * Wording varies between the original, the Viz translation, and the dub, so
 * these are the commonly quoted English renderings rather than one canonical
 * source. Edit freely; this file is meant to be yours.
 */

export type Quote = {
  text: string;
  who: string;
};

export const QUOTES: Quote[] = [
  { text: "People's dreams never end!", who: 'Marshall D. Teach' },
  {
    text: 'When do you think people die? When they are forgotten.',
    who: 'Dr. Hiluluk',
  },
  {
    text: "Forget about what you've lost. What is it you have left?",
    who: 'Jinbe',
  },
  {
    text: "If you don't take risks, you can't create a future.",
    who: 'Monkey D. Luffy',
  },
  {
    text: 'Inherited will, the destiny of the age, the dreams of the people — as long as people seek the answer to freedom, these things will never cease to be.',
    who: 'Gol D. Roger',
  },
  { text: 'I want to live!', who: 'Nico Robin' },
  { text: 'Nothing happened.', who: 'Roronoa Zoro' },
  {
    text: 'The person with the most freedom on the sea is the Pirate King.',
    who: 'Monkey D. Luffy',
  },
  {
    text: 'It is not a crime to be weak. It is a crime to stay weak because you were too proud to ask.',
    who: 'Jinbe',
  },
  { text: 'A scar on the back is a swordsman’s shame.', who: 'Roronoa Zoro' },
  {
    text: 'Whether I can do it or not, I have to do it.',
    who: 'Monkey D. Luffy',
  },
  {
    text: 'There is nothing more precious than the will to keep going.',
    who: 'Portgas D. Ace',
  },
];

/**
 * The quote for a given day.
 *
 * Deterministic rather than random: the line has to stay put while you use the
 * app, and a quote that reshuffles on every render reads as noise. It changes
 * once, at midnight, on its own.
 */
export function quoteForDay(day: DayKey, quotes: Quote[] = QUOTES): Quote {
  if (quotes.length === 0) throw new Error('quoteForDay needs at least one quote');

  let hash = 0;
  for (let i = 0; i < day.length; i += 1) {
    hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
  }
  return quotes[hash % quotes.length];
}
