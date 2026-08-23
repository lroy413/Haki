import type { DayKey } from './date';

/**
 * One line at the top of the home screen, changing daily.
 *
 * Chosen for one thing: they are all about dreams, carrying on, or coming
 * back. Nothing here scolds, and nothing implies you are behind — the home
 * screen is the first thing you see on a bad day as well as a good one.
 *
 * A few are funny on purpose. A bank that is only solemn becomes wallpaper,
 * and the joke ones land hardest on the mornings that need them.
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
  /* ------------------------------------------------- the crew's own dreams */
  // Nine people who said the thing out loud and then spent years on it. This
  // is the whole reason the app exists, so it leads.
  { text: "I'm going to be King of the Pirates!", who: 'Monkey D. Luffy' },
  { text: "I'm going to be the world's greatest swordsman.", who: 'Roronoa Zoro' },
  { text: "I'm going to draw a map of the entire world.", who: 'Nami' },
  { text: "I'm going to be a brave warrior of the sea!", who: 'Usopp' },
  { text: "I'm going to find the All Blue.", who: 'Vinsmoke Sanji' },
  {
    text: "I'm going to be a doctor who can cure any disease!",
    who: 'Tony Tony Chopper',
  },
  {
    text: 'I want to read the Rio Poneglyph and learn the true history.',
    who: 'Nico Robin',
  },
  { text: "I'm going to build a ship that sails around the world.", who: 'Franky' },
  { text: "I'm going back to Laboon.", who: 'Brook' },

  /* ------------------------------------------------ dreams, and their cost */
  { text: "People's dreams never end!", who: 'Marshall D. Teach' },
  {
    text: "Let them laugh. If you're aiming for the top, you don't always need your fists.",
    who: 'Marshall D. Teach',
  },
  {
    text: 'When do you think people die? When they are forgotten.',
    who: 'Dr. Hiluluk',
  },
  {
    text: 'Inherited will, the destiny of the age, the dreams of the people — as long as people seek the answer to freedom, these things will never cease to be.',
    who: 'Gol D. Roger',
  },
  {
    text: 'You want my treasure? You can have it. I left everything I gathered in one place — now you just have to find it.',
    who: 'Gol D. Roger',
  },
  { text: 'The One Piece is real!', who: 'Edward Newgate' },
  {
    text: 'On his proud back, in his whole pirate life, there is not one scar he got while running away.',
    who: 'Edward Newgate',
  },
  {
    text: 'The person with the most freedom on the sea is the Pirate King.',
    who: 'Monkey D. Luffy',
  },
  {
    text: 'There comes a time when a man must stand and fight — and that is when his friends’ dreams are being laughed at.',
    who: 'Usopp',
  },
  { text: "A man can't live without ambitions.", who: 'Sir Crocodile' },

  /* ---------------------------------------------------------- carrying on */
  {
    text: 'There is nothing more precious than the will to keep going.',
    who: 'Portgas D. Ace',
  },
  { text: 'Whether I can do it or not, I have to do it.', who: 'Monkey D. Luffy' },
  {
    text: "If you don't take risks, you can't create a future.",
    who: 'Monkey D. Luffy',
  },
  {
    text: "It's not a matter of can or can't. There are some things in life you just do.",
    who: 'Roronoa Zoro',
  },
  {
    text: "It's not about whether I can. I do it because I want to.",
    who: 'Monkey D. Luffy',
  },
  {
    text: "I don't want to live a thousand years. If I just live through today, that will be enough.",
    who: 'Monkey D. Luffy',
  },
  {
    text: 'No matter how hard or how impossible it is, never lose sight of your goal.',
    who: 'Monkey D. Luffy',
  },
  {
    text: 'When the world turns its back on you, push your way forward.',
    who: 'Roronoa Zoro',
  },
  {
    text: 'There is someone I must meet again — and until that day, not even death can take my life away.',
    who: 'Roronoa Zoro',
  },
  {
    text: 'No matter how deep the night, it always turns to day, eventually.',
    who: 'Brook',
  },
  {
    text: 'Neither god nor devil can aid those without the will to fight.',
    who: 'Brook',
  },
  {
    text: 'Maybe nothing in this world happens by accident. As everything happens for a reason, our destiny slowly takes shape.',
    who: 'Silvers Rayleigh',
  },
  {
    text: 'Life is like a pencil that will surely run out — but you have to keep writing with it.',
    who: 'Nami',
  },

  /* ------------------------------------- coming back, and what is left */
  {
    text: "Forget about what you've lost. What is it you have left?",
    who: 'Jinbe',
  },
  { text: 'I want to live! Take me with you — out to sea!', who: 'Nico Robin' },
  { text: 'Nothing happened.', who: 'Roronoa Zoro' },
  {
    text: 'Being alone is more painful than getting hurt.',
    who: 'Monkey D. Luffy',
  },
  { text: 'Thank you for loving me!', who: 'Portgas D. Ace' },
  {
    text: 'Forgetting is like a wound. The wound may heal, but it has already left a scar.',
    who: 'Monkey D. Luffy',
  },
  {
    text: 'Only those who have suffered long can see the light within the shadows.',
    who: 'Roronoa Zoro',
  },
  {
    text: 'What keeps me alive is neither organs nor muscles. It is my soul.',
    who: 'Brook',
  },

  /* ------------------------------------------------------- needing people */
  {
    text: 'It is not a crime to be weak. It is a crime to stay weak because you were too proud to ask.',
    who: 'Jinbe',
  },
  {
    text: "I can't use a sword, I can't navigate, I can't cook, and I can't lie. I know I can't survive without help.",
    who: 'Monkey D. Luffy',
  },
  { text: 'Luffy… help me.', who: 'Nami' },
  {
    text: 'You can pour drinks on me. You can throw food at me. But for good reason or not, nobody hurts a friend of mine.',
    who: 'Shanks',
  },
  {
    text: "If I can't even protect my captain's dream, then whatever ambition I have is nothing but talk!",
    who: 'Roronoa Zoro',
  },
  { text: 'I chose a path where I never lose a friend.', who: 'Monkey D. Luffy' },
  {
    text: 'No one is born into this world to be alone.',
    who: 'Jaguar D. Saul',
  },
  {
    text: 'Everyone has things they can do and things they cannot. Right now, I need you to do what I cannot.',
    who: 'Vinsmoke Sanji',
  },

  /* ---------------------------------------------------- pride in the work */
  { text: 'A scar on the back is a swordsman’s shame.', who: 'Roronoa Zoro' },
  {
    text: "I devoted my entire life to becoming the world's greatest swordsman. I made my choice, so I'm the only one who gets to call me stupid.",
    who: 'Roronoa Zoro',
  },
  { text: 'I will never forgive anyone who wastes food.', who: 'Vinsmoke Sanji' },
  {
    text: "Dying isn't repaying a debt. That's not what he saved you for.",
    who: 'Vinsmoke Sanji',
  },
  { text: "It isn't a crime just to exist.", who: 'Franky' },
  {
    text: "If we lose credibility by admitting fault, we didn't have any to begin with.",
    who: 'Issho',
  },

  /* ----------------------------------------------------------- and the rest */
  // Not every morning wants a speech.
  { text: 'I am the great Captain Usopp!', who: 'Usopp' },
  { text: 'I have my own adventures to live for!', who: 'Usopp' },
  { text: 'SUPER!', who: 'Franky' },
  { text: "Oden wouldn't be oden if it wasn't boiled!", who: 'Kozuki Oden' },
  {
    text: "Have you ever met a wild beast that promised it wouldn't bite? Because I haven't.",
    who: 'Roronoa Zoro',
  },
  {
    text: "I'm not a monster! My name is Tony Tony Chopper!",
    who: 'Tony Tony Chopper',
  },
];

/**
 * The quote for a given day.
 *
 * Deterministic rather than random: the line has to stay put while you use the
 * app, and a quote that reshuffles on every render reads as noise. It changes
 * once, at midnight, on its own.
 *
 * The multiply-and-add hash this used to end on was not mixed enough to be
 * taken modulo an arbitrary bank size. Date keys differ in only their last few
 * characters, so the low bits barely moved and whole stretches of the list were
 * unreachable — at sixty quotes it could only ever show thirty-seven of them.
 * The avalanche step below spreads a one-character change across all 32 bits,
 * which is what makes the remainder land evenly.
 */
export function quoteForDay(day: DayKey, quotes: Quote[] = QUOTES): Quote {
  if (quotes.length === 0) throw new Error('quoteForDay needs at least one quote');

  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i += 1) {
    hash = Math.imul(hash ^ day.charCodeAt(i), 0x01000193) >>> 0;
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;

  return quotes[hash % quotes.length];
}
