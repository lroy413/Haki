import { describe, expect, it } from 'vitest';
import {
  ROAD_MAX,
  ROAD_TARGET,
  arrivalMessage,
  bearing,
  canOpen,
  logPose,
  needleLine,
  passedMessage,
  reachedLine,
  roadRoom,
  stateName,
  type Poneglyph,
  type PoneglyphState,
  type Road,
} from '../logpose';
import { addDays, type DayKey } from '../date';

const TODAY = '2026-08-23' as DayKey;
const DREAM = 'Be the one they call when it actually matters';

const road = (key: number, over: Partial<Road> = {}): Road => ({
  id: key,
  key,
  title: `Pillar ${key}`,
  why: null,
  retired: false,
  ...over,
});

const glyph = (roadKey: number, over: Partial<Poneglyph> = {}): Poneglyph => ({
  id: Math.random(),
  roadKey,
  title: 'An island',
  state: 'open',
  openedOn: TODAY,
  closedOn: null,
  reason: null,
  ...over,
});

const roads = (n: number) => Array.from({ length: n }, (_, i) => road(i + 1));

describe('the shape of it', () => {
  it('reads one needle per living Road Poneglyph', () => {
    const pose = logPose(DREAM, roads(4), [], TODAY);
    expect(pose.needles).toHaveLength(4);
    expect(pose.needles.every((n) => n.next === null)).toBe(true);
  });

  it('drops a retired pillar off the needles', () => {
    const pose = logPose(DREAM, [road(1), road(2, { retired: true })], [], TODAY);
    expect(pose.needles.map((n) => n.road.key)).toEqual([1]);
  });

  it('still counts water sailed under a pillar you stepped away from', () => {
    // Retiring a front does not un-reach the islands behind it.
    const done = glyph(2, { state: 'reached', closedOn: TODAY });
    const pose = logPose(DREAM, [road(1), road(2, { retired: true })], [done], TODAY);
    expect(pose.reached).toBe(1);
  });

  it('points a needle at the one open island under it', () => {
    const open = glyph(1, { title: 'Ship the thing' });
    const old = glyph(1, { state: 'reached', closedOn: addDays(TODAY, -30) });
    const pose = logPose(DREAM, [road(1)], [old, open], TODAY);
    expect(pose.needles[0].next?.title).toBe('Ship the thing');
    expect(pose.needles[0].reached).toBe(1);
  });

  it('keeps each pillar to its own islands', () => {
    const pose = logPose(DREAM, roads(2), [glyph(2)], TODAY);
    expect(pose.needles[0].next).toBeNull();
    expect(pose.needles[1].next).not.toBeNull();
    expect(pose.open).toBe(1);
  });

  it('orders what is astern by when it closed, most recent first', () => {
    const older = glyph(1, { title: 'Older', state: 'reached', closedOn: addDays(TODAY, -40) });
    const newer = glyph(1, { title: 'Newer', state: 'passed', closedOn: addDays(TODAY, -2) });
    const pose = logPose(DREAM, [road(1)], [older, newer], TODAY);
    expect(pose.needles[0].astern.map((g) => g.title)).toEqual(['Newer', 'Older']);
  });

  it('treats a blank dream as no dream', () => {
    expect(logPose('   ', [], [], TODAY).dream).toBeNull();
    expect(logPose(null, [], [], TODAY).dream).toBeNull();
  });
});

describe('days at sea', () => {
  it('starts at day 1 on the day it opened', () => {
    const pose = logPose(DREAM, [road(1)], [glyph(1, { openedOn: TODAY })], TODAY);
    expect(pose.needles[0].atSea).toBe(1);
    expect(needleLine(pose.needles[0])).toBe('Day 1 at sea');
  });

  it('counts up, because an open loop nobody is counting is the whole problem', () => {
    const pose = logPose(
      DREAM,
      [road(1)],
      [glyph(1, { openedOn: addDays(TODAY, -63) })],
      TODAY,
    );
    expect(pose.needles[0].atSea).toBe(64);
    expect(needleLine(pose.needles[0])).toContain('64');
  });

  it('is null with nothing at sea', () => {
    expect(logPose(DREAM, [road(1)], [], TODAY).needles[0].atSea).toBeNull();
  });
});

describe('one island at a time', () => {
  it('refuses a second island under a pillar that already has one', () => {
    // The WIP limit, and the reason this module exists: you cannot start a new
    // thing while an old one is technically still open.
    const pose = logPose(DREAM, [road(1)], [glyph(1)], TODAY);
    expect(canOpen(pose.needles[0])).toBe(false);
  });

  it('frees the needle the moment the open one is closed, either way', () => {
    for (const state of ['reached', 'passed'] as PoneglyphState[]) {
      const pose = logPose(DREAM, [road(1)], [glyph(1, { state, closedOn: TODAY })], TODAY);
      expect(canOpen(pose.needles[0])).toBe(true);
    }
  });

  it('does not stop a different pillar sailing', () => {
    // The owner's own correction: one dream, but life runs several fronts.
    const pose = logPose(DREAM, roads(3), [glyph(1)], TODAY);
    expect(canOpen(pose.needles[0])).toBe(false);
    expect(canOpen(pose.needles[1])).toBe(true);
    expect(canOpen(pose.needles[2])).toBe(true);
  });
});

describe('four, and the room above it', () => {
  it('targets four and caps at seven', () => {
    expect(ROAD_TARGET).toBe(4);
    expect(ROAD_MAX).toBe(7);
  });

  it('lets you add right up to the ceiling', () => {
    for (let n = 0; n < ROAD_MAX; n++) expect(roadRoom(n).canAdd).toBe(true);
    expect(roadRoom(ROAD_MAX).canAdd).toBe(false);
  });

  it('says what the fifth, sixth and seventh cost without refusing them', () => {
    // Life sometimes genuinely has five fronts. A system that says otherwise
    // only teaches you to keep the fifth one out of it.
    for (const n of [5, 6]) {
      expect(roadRoom(n).canAdd).toBe(true);
      expect(roadRoom(n).note).toContain(String(n));
    }
  });

  it('names the way out when it is full, rather than only saying no', () => {
    expect(roadRoom(ROAD_MAX).note.toLowerCase()).toContain('retiring one');
  });
});

describe('the bearing', () => {
  it('asks for the dream before anything else', () => {
    expect(bearing(logPose(null, [], [], TODAY)).toLowerCase()).toContain('dream');
  });

  it('asks what the dream requires once it is named', () => {
    expect(bearing(logPose(DREAM, [], [], TODAY))).toContain('has to happen');
  });

  it('says the needles are spinning when nothing is at sea', () => {
    expect(bearing(logPose(DREAM, roads(4), [], TODAY))).toContain('spinning');
  });

  it('counts what is at sea, and never what is left', () => {
    const two = logPose(DREAM, roads(4), [glyph(1), glyph(2)], TODAY);
    expect(bearing(two)).toBe('2 islands at sea.');
  });

  it('says something different when every needle is locked', () => {
    const all = logPose(DREAM, roads(3), [glyph(1), glyph(2), glyph(3)], TODAY);
    expect(bearing(all)).toContain('same place');
  });

  it('is never a percentage, a bar, or an N of M', () => {
    // A journey has no denominator. Nobody sailing knows how many islands are
    // left, and a number claiming to would be invented.
    const poses = [
      logPose(null, [], [], TODAY),
      logPose(DREAM, [], [], TODAY),
      logPose(DREAM, roads(4), [], TODAY),
      logPose(DREAM, roads(4), [glyph(1)], TODAY),
      logPose(DREAM, roads(4), [glyph(1), glyph(2), glyph(3), glyph(4)], TODAY),
    ];
    for (const pose of poses) {
      const text = bearing(pose);
      expect(text).not.toContain('%');
      expect(text).not.toMatch(/\d+\s*\/\s*\d+/);
      expect(text).not.toMatch(/\d+ of \d+/);
    }
  });
});

/** Every user-facing string this module can produce, in one mode. */
const ALL_COPY = (plain: boolean) => {
  const lines: string[] = [];
  for (let n = 0; n <= ROAD_MAX; n++) lines.push(roadRoom(n, plain).note);
  for (const state of ['open', 'reached', 'passed'] as PoneglyphState[]) {
    lines.push(stateName(state, plain));
  }
  for (const n of [0, 1, 2, 9]) {
    lines.push(reachedLine(n, plain), arrivalMessage(Math.max(1, n), plain));
  }
  lines.push(passedMessage(plain));
  const poses = [
    logPose(null, [], [], TODAY),
    logPose(DREAM, [], [], TODAY),
    logPose(DREAM, roads(4), [], TODAY),
    logPose(DREAM, roads(4), [glyph(1)], TODAY),
    logPose(DREAM, roads(1), [glyph(1)], TODAY),
    logPose(DREAM, roads(3), [glyph(1), glyph(2), glyph(3)], TODAY),
  ];
  for (const pose of poses) lines.push(bearing(pose, plain));
  lines.push(needleLine(logPose(DREAM, [road(1)], [], TODAY).needles[0], plain));
  lines.push(needleLine(logPose(DREAM, [road(1)], [glyph(1)], TODAY).needles[0], plain));
  lines.push(
    needleLine(
      logPose(DREAM, [road(1)], [glyph(1, { state: 'reached', closedOn: TODAY })], TODAY)
        .needles[0],
      plain,
    ),
  );
  return lines;
};

describe('plain mode', () => {
  it('gives nothing away on a shared screen', () => {
    // Plain mode is a mute button for waiting rooms and screenshares. The
    // system underneath is identical; the vocabulary cannot survive the trip.
    for (const line of ALL_COPY(true)) {
      const text = line.toLowerCase();
      for (const word of [
        'poneglyph',
        'island',
        'needle',
        'at sea',
        'astern',
        'sail',
        'haki',
        'log pose',
        'dream',
        'triangulat',
      ]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('is a real second vocabulary and not the same strings twice', () => {
    // Guards the test above from passing vacuously: the words it forbids have
    // to actually be present in the mode it is muting.
    const haki = ALL_COPY(false).join(' ').toLowerCase();
    for (const word of ['island', 'needle', 'at sea', 'astern', 'dream']) {
      expect(haki).toContain(word);
    }
    expect(ALL_COPY(true).join(' ')).not.toBe(ALL_COPY(false).join(' '));
  });

  it('still refuses a denominator', () => {
    for (const line of ALL_COPY(true)) {
      expect(line).not.toContain('%');
      expect(line).not.toMatch(/\d+\s*\/\s*\d+/);
      expect(line).not.toMatch(/\d+ of \d+/);
    }
  });

  it('says something for every state, rather than falling back to the kanji one', () => {
    for (const state of ['open', 'reached', 'passed'] as PoneglyphState[]) {
      expect(stateName(state, true)).not.toBe(stateName(state, false));
    }
  });
});

describe('what it says', () => {
  it('never shames, anywhere, in either mode', () => {
    for (const line of [...ALL_COPY(false), ...ALL_COPY(true)]) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'behind',
        'finally',
        'abandon',
        'quit',
        'missed',
        'give up',
      ]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('calls sailing past what it is, and not what it is not', () => {
    // The event has to be a decision — logged, with a reason — or it is drift
    // wearing a hat. The *record* of it lives in this app for years, and a
    // list of things marked ABANDONED is a monument to being someone who quits.
    expect(stateName('passed')).toBe('Sailed past');
  });

  it('lets arriving just be arriving', () => {
    // No count of what is left, no pointer at the next one.
    expect(arrivalMessage(1)).toContain('First island');
    expect(arrivalMessage(4)).not.toContain('%');
  });

  it('says nothing warm about sailing past', () => {
    // Neutral on purpose. Warmth here would make it a thing to seek out.
    const text = passedMessage().toLowerCase();
    for (const word of ['good', 'well done', 'right call', 'brave']) {
      expect(text).not.toContain(word);
    }
  });

  it('offers rather than reports absence on an untouched pillar', () => {
    const fresh = needleLine(logPose(DREAM, [road(1)], [], TODAY).needles[0]);
    expect(fresh).toContain('weeks not years');
  });

  it('reports what is astern without a total beside it', () => {
    expect(reachedLine(0)).toBe('No islands astern yet.');
    expect(reachedLine(1)).toBe('1 island astern.');
    expect(reachedLine(6)).toBe('6 islands astern.');
  });
});
