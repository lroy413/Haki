import { describe, expect, it } from 'vitest';
import {
  MAX_FINDINGS,
  MIN_EFFECT,
  MIN_GROUP,
  MIN_READ_DAYS,
  MIN_T,
  directionNote,
  findingEvidence,
  findingLine,
  foresight,
  stateMessage,
  type DayRecord,
  type Finding,
  type Foresight,
} from '../foresight';
import { addDays, type DayKey } from '../date';

const START = '2026-01-01' as DayKey;
const TARGET = 7.5;

const day = (i: number, over: Partial<DayRecord> = {}): DayRecord => ({
  day: addDays(START, i),
  read: { energy: 3, mood: 3, clarity: 3, tension: 3 },
  sleepHours: null,
  sat: false,
  trained: false,
  struck: 0,
  gearMinutes: 0,
  wrote: false,
  ...over,
});

/** `n` days, every other one carrying `on`, the rest carrying `off`. */
const alternating = (n: number, on: Partial<DayRecord>, off: Partial<DayRecord> = {}) =>
  Array.from({ length: n }, (_, i) => day(i, i % 2 === 0 ? on : off));

const findingFor = (reading: Foresight, source: string): Finding | undefined =>
  reading.state === 'reading' ? reading.findings.find((f) => f.source === source) : undefined;

describe('it says nothing until it can', () => {
  it('is watching before there is enough history', () => {
    const reading = foresight(alternating(MIN_READ_DAYS - 1, { sat: true }), TARGET);
    expect(reading.state).toBe('watching');
    if (reading.state !== 'watching') return;
    expect(reading.readDays).toBe(MIN_READ_DAYS - 1);
    expect(reading.needed).toBe(1);
  });

  it('does not count days that had no read', () => {
    // A day with acts but no Daily Read cannot answer any question here.
    const days = Array.from({ length: 40 }, (_, i) => day(i, { read: null, sat: true }));
    const reading = foresight(days, TARGET);
    expect(reading.state).toBe('watching');
    if (reading.state !== 'watching') return;
    expect(reading.readDays).toBe(0);
  });

  it('needs enough of both kinds of day, not just enough days', () => {
    // A habit kept nearly every day must not produce a finding off two
    // exceptions, however large the gap between them looks.
    const days = Array.from({ length: 40 }, (_, i) =>
      i < MIN_GROUP - 1
        ? day(i, { sat: false, read: { energy: 1, mood: 1, clarity: 1, tension: 3 } })
        : day(i, { sat: true, read: { energy: 5, mood: 5, clarity: 5, tension: 3 } }),
    );
    expect(foresight(days, TARGET).state).toBe('quiet');
  });

  it('never treats an unlogged night as a short one', () => {
    // Null is missing, not zero. Inventing the missing side would put made-up
    // data straight into the comparison.
    const days = Array.from({ length: 40 }, (_, i) =>
      day(i, { sleepHours: null, read: { energy: 5, mood: 5, clarity: 5, tension: 1 } }),
    );
    expect(foresight(days, TARGET).state).toBe('quiet');
  });
});

describe('it says nothing when there is nothing to say', () => {
  it('is quiet when the two kinds of day read the same', () => {
    const reading = foresight(alternating(40, { sat: true }), TARGET);
    expect(reading.state).toBe('quiet');
  });

  it('is quiet when a real difference is too small to be worth a sentence', () => {
    const days = alternating(
      40,
      { sat: true, read: { energy: 3, mood: 3.4, clarity: 3, tension: 3 } },
      { sat: false, read: { energy: 3, mood: 3, clarity: 3, tension: 3 } },
    );
    expect(foresight(days, TARGET).state).toBe('quiet');
  });

  it('refuses a finding carried by one loud day', () => {
    // Thirty ordinary days and a single catastrophe. The means move; the
    // medians do not, so nothing is reported.
    const days = Array.from({ length: 40 }, (_, i) => {
      const sat = i % 2 === 0;
      const mood = i === 1 ? -40 : 3;
      return day(i, { sat, read: { energy: 3, mood, clarity: 3, tension: 3 } });
    });
    expect(foresight(days, TARGET).state).toBe('quiet');
  });
});

describe('what it does find', () => {
  /**
   * Real days scatter, so these fixtures do too. A group of identical values
   * is the clean-separation limit, which skips the statistics entirely — not
   * the path the app ever actually runs.
   */
  const jitter = (i: number) => (i % 4 === 0 ? 1 : i % 3 === 0 ? -1 : 0);
  const clamp = (v: number) => Math.max(1, Math.min(5, v));

  /**
   * Sleep moves energy and nothing else. The other three dials scatter the
   * same way on both kinds of day, so the only thing there is to find here is
   * the one thing planted.
   */
  const sleepDays = Array.from({ length: 60 }, (_, i) => {
    const slept = i % 2 === 0;
    // Paired so both groups see an identical sequence. Jittering on `i`
    // instead lines the scatter up with the even/odd split and quietly
    // plants three more signals — which the engine duly found.
    const flat = clamp(3 + jitter(Math.floor(i / 2)));
    return day(i, {
      sleepHours: slept ? 8 : 5,
      read: {
        energy: clamp((slept ? 4 : 2) + jitter(i)),
        mood: flat,
        clarity: flat,
        tension: flat,
      },
    });
  });

  it('finds the cascade, which is what it is here for', () => {
    const reading = foresight(sleepDays, TARGET);
    expect(reading.state).toBe('reading');
    if (reading.state !== 'reading') return;
    const energy = reading.findings.find((f) => f.source === 'sleep' && f.dial === 'energy');
    expect(energy).toBeDefined();
    expect(energy!.effect).toBeGreaterThan(1.5);
    expect(energy!.withDays).toBe(30);
    expect(energy!.withoutDays).toBe(30);
    // Nothing else was planted, so nothing else should be reported.
    expect(reading.findings.every((f) => f.dial === 'energy')).toBe(true);
  });

  it('reports the direction of a fall as readily as a rise', () => {
    const days = Array.from({ length: 60 }, (_, i) => {
      const sat = i % 2 === 0;
      return day(i, {
        sat,
        read: { energy: 3, mood: 3, clarity: 3, tension: clamp((sat ? 1 : 4) + jitter(i)) },
      });
    });
    const reading = foresight(days, TARGET);
    const tension = findingFor(reading, 'sat');
    expect(tension).toBeDefined();
    expect(tension!.effect).toBeLessThan(0);
    expect(findingLine(tension!)).toContain('lower');
  });

  it('ranks the strongest signal first and never lists more than the cap', () => {
    const days = Array.from({ length: 60 }, (_, i) => {
      const on = i % 2 === 0;
      return day(i, {
        sat: on,
        trained: on,
        wrote: on,
        struck: on ? 2 : 0,
        gearMinutes: on ? 30 : 0,
        sleepHours: on ? 8 : 5,
        read: on
          ? { energy: clamp(5 + jitter(i)), mood: 5, clarity: clamp(4 + jitter(i)), tension: 1 }
          : {
              energy: clamp(1 + jitter(i)),
              mood: 1,
              clarity: clamp(2 + jitter(i)),
              tension: 5,
            },
      });
    });
    const reading = foresight(days, TARGET);
    expect(reading.state).toBe('reading');
    if (reading.state !== 'reading') return;
    expect(reading.findings.length).toBeLessThanOrEqual(MAX_FINDINGS);
    // Ranked by strength of signal, not by raw gap.
    const strengths = reading.findings.map((f) => Math.abs(f.t));
    expect([...strengths].sort((a, b) => b - a)).toEqual(strengths);
    for (const f of reading.findings) {
      expect(Math.abs(f.effect)).toBeGreaterThanOrEqual(MIN_EFFECT);
      expect(Math.abs(f.t)).toBeGreaterThanOrEqual(MIN_T);
    }
  });

  it('splits sleep at the target it is given, not a number of its own', () => {
    const days = Array.from({ length: 60 }, (_, i) =>
      i % 2 === 0
        ? day(i, {
            sleepHours: 7,
            read: { energy: clamp(5 + jitter(i)), mood: 3, clarity: 3, tension: 3 },
          })
        : day(i, {
            sleepHours: 6,
            read: { energy: clamp(2 + jitter(i)), mood: 3, clarity: 3, tension: 3 },
          }),
    );
    // With a 6.5h target the two groups split; with 9h everything is "short"
    // and there is no comparison left to make.
    expect(foresight(days, 6.5).state).toBe('reading');
    expect(foresight(days, 9).state).toBe('quiet');
  });
});

describe('what it says', () => {
  const sample: Finding = {
    source: 'sat',
    dial: 'clarity',
    withMean: 4,
    withoutMean: 3.2,
    effect: 0.8,
    t: 4.1,
    withDays: 12,
    withoutDays: 14,
  };

  const ALL = () => {
    const lines: string[] = [];
    for (const source of ['sleep', 'sat', 'trained', 'struck', 'gear', 'wrote'] as const) {
      for (const dial of ['energy', 'mood', 'clarity', 'tension'] as const) {
        for (const effect of [0.8, -0.8]) {
          const f: Finding = { ...sample, source, dial, effect };
          for (const plain of [false, true]) {
            lines.push(findingLine(f, plain));
            const note = directionNote(f, plain);
            if (note) lines.push(note);
          }
        }
      }
    }
    const states: Foresight[] = [
      { state: 'watching', readDays: 0, needed: MIN_READ_DAYS },
      { state: 'watching', readDays: 11, needed: 10 },
      { state: 'quiet', readDays: 40 },
      { state: 'reading', readDays: 40, findings: [sample] },
    ];
    for (const s of states) lines.push(stateMessage(s, false), stateMessage(s, true));
    return lines;
  };

  it('never gives advice, in any line it can produce', () => {
    // The moment a readout starts recommending, it is a coach. This app does
    // not have a coach in it.
    for (const line of ALL()) {
      const text = line.toLowerCase();
      for (const word of ['you should', 'try to', 'make sure', 'need to', 'must ', 'aim for']) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('never claims a cause', () => {
    for (const line of ALL()) {
      const text = line.toLowerCase();
      for (const word of ['because', 'causes', 'caused', 'leads to', 'makes you', 'proves']) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('never shames', () => {
    for (const line of ALL()) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'behind',
        'finally',
        'only',
        'poor',
        'bad',
      ]) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('carries the direction caveat on everything except sleep', () => {
    // Sleep is keyed to the morning you woke, so the night is always before
    // the day — the one direction that cannot be reversed.
    expect(directionNote({ ...sample, source: 'sleep' })).toBeNull();
    for (const source of ['sat', 'trained', 'struck', 'gear', 'wrote'] as const) {
      expect(directionNote({ ...sample, source })).not.toBeNull();
    }
  });

  it('says which way and how much, in dial points', () => {
    expect(findingLine(sample)).toContain('0.8');
    expect(findingLine(sample)).toContain('higher');
    expect(findingLine({ ...sample, effect: -0.8 })).toContain('lower');
  });

  it('shows the evidence behind a finding rather than only the result', () => {
    expect(findingEvidence(sample)).toBe('12 against 14 days');
  });

  it('writes a quiet result as an ordinary outcome, not a failure', () => {
    const quiet = stateMessage({ state: 'quiet', readDays: 40 }).toLowerCase();
    expect(quiet).toContain('ordinary');
    expect(quiet).not.toContain('yet');
  });

  it('tells a waiting reader what it is waiting for without asking for it', () => {
    const waiting = stateMessage({ state: 'watching', readDays: 11, needed: 10 });
    expect(waiting).toContain('11');
    expect(waiting).toContain(String(MIN_READ_DAYS));
    expect(waiting.toLowerCase()).not.toContain('keep going');
  });

  it('calls its output patterns rather than rules', () => {
    const reading = stateMessage({ state: 'reading', readDays: 40, findings: [sample] });
    expect(reading.toLowerCase()).toContain('not rules');
  });
});
