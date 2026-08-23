#!/usr/bin/env python3
"""
Turn a raw sound-effect WAV into something a UI can actually use.

Source effects are mastered for video: long, stereo, 48kHz, often with leading
silence and a tail that outlasts any button press. Playing one of those on a
tap is how an app gets muted permanently.

    python3 tools/make_sound.py <source.wav> <out.wav> [--start S] [--end S]
                                [--fade MS] [--rate HZ] [--peak DBFS]

Defaults trim to the first transient, fold to mono, resample to 24kHz, and
normalise — which takes a ~870KB stereo file down to about 30KB.

No ffmpeg here on purpose: the bundled build is video-only, so this works with
nothing but the standard library.
"""

import argparse
import array
import math
import struct
import sys


def read_wav(path):
    raw = open(path, 'rb').read()
    if raw[:4] != b'RIFF' or raw[8:12] != b'WAVE':
        raise SystemExit(f'{path} is not a RIFF/WAVE file')

    channels = rate = bits = None
    i = 12
    while i + 8 <= len(raw):
        cid = raw[i : i + 4]
        size = struct.unpack('<I', raw[i + 4 : i + 8])[0]

        if cid == b'fmt ':
            channels = struct.unpack('<H', raw[i + 10 : i + 12])[0]
            rate = struct.unpack('<I', raw[i + 12 : i + 16])[0]
            bits = struct.unpack('<H', raw[i + 22 : i + 24])[0]
        elif cid == b'data':
            # Streaming exports declare 0xFFFFFFFF here; trust the file length.
            declared = size
            available = len(raw) - (i + 8)
            body = raw[i + 8 : i + 8 + min(declared, available)]
            if bits != 16:
                raise SystemExit(f'only 16-bit PCM is supported, got {bits}-bit')
            samples = array.array('h')
            samples.frombytes(body[: len(body) // 2 * 2])
            return samples, channels, rate

        i += 8 + size + (size & 1)

    raise SystemExit('no data chunk found')


def to_mono(samples, channels):
    if channels == 1:
        return list(samples)
    out = []
    for i in range(0, len(samples) - channels + 1, channels):
        out.append(sum(samples[i : i + channels]) // channels)
    return out


def resample(mono, src_rate, dst_rate):
    """Linear resampling. Fine for a sub-second effect."""
    if src_rate == dst_rate:
        return mono
    ratio = src_rate / dst_rate
    out = []
    n = len(mono)
    for i in range(int(n / ratio)):
        pos = i * ratio
        left = int(pos)
        frac = pos - left
        a = mono[left]
        b = mono[left + 1] if left + 1 < n else a
        out.append(int(a + (b - a) * frac))
    return out


def find_onset(mono, rate, threshold_ratio=0.06):
    """First sample that crosses a fraction of the peak — the transient."""
    peak = max((abs(s) for s in mono), default=0)
    if peak == 0:
        return 0
    threshold = peak * threshold_ratio
    for i, s in enumerate(mono):
        if abs(s) >= threshold:
            # Back off a hair so the attack is not clipped off.
            return max(0, i - int(rate * 0.005))
    return 0


def apply_fade(mono, rate, fade_ms):
    """Fade the tail to zero so the sound never ends on a click."""
    n = int(rate * fade_ms / 1000)
    if n <= 0 or n > len(mono):
        return mono
    for i in range(n):
        mono[len(mono) - n + i] = int(mono[len(mono) - n + i] * (1 - i / n))
    return mono


def normalise(mono, peak_dbfs):
    peak = max((abs(s) for s in mono), default=0)
    if peak == 0:
        return mono
    target = 32767 * (10 ** (peak_dbfs / 20))
    gain = target / peak
    return [max(-32768, min(32767, int(s * gain))) for s in mono]


def write_wav(path, mono, rate):
    body = array.array('h', mono).tobytes()
    with open(path, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(body)))
        f.write(b'WAVEfmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, rate, rate * 2, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(body)))
        f.write(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('out')
    ap.add_argument('--start', type=float, default=None, help='seconds; default is the onset')
    ap.add_argument('--end', type=float, default=None, help='seconds from the source start')
    ap.add_argument('--fade', type=float, default=120, help='tail fade in ms')
    ap.add_argument('--rate', type=int, default=24000)
    ap.add_argument('--peak', type=float, default=-1.0, help='normalise target in dBFS')
    args = ap.parse_args()

    samples, channels, rate = read_wav(args.source)
    mono = to_mono(samples, channels)
    print(f'source: {len(mono) / rate:.2f}s, {channels}ch, {rate}Hz')

    start = int(rate * args.start) if args.start is not None else find_onset(mono, rate)
    end = int(rate * args.end) if args.end is not None else len(mono)
    end = min(end, len(mono))
    if end <= start:
        raise SystemExit('end must come after start')

    clipped = mono[start:end]
    print(f'trimmed: {start / rate:.3f}s -> {end / rate:.3f}s  ({len(clipped) / rate:.2f}s)')

    clipped = resample(clipped, rate, args.rate)
    clipped = normalise(clipped, args.peak)
    clipped = apply_fade(clipped, args.rate, args.fade)

    write_wav(args.out, clipped, args.rate)
    size = len(clipped) * 2 + 44
    print(f'wrote {args.out}: {len(clipped) / args.rate:.2f}s mono {args.rate}Hz, {size / 1024:.1f}KB')


if __name__ == '__main__':
    sys.exit(main())
