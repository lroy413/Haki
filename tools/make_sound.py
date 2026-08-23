#!/usr/bin/env python3
"""
Turn a raw sound effect into something a UI can actually use.

Source effects are mastered for video: long, stereo, 48kHz, often with leading
silence and a tail that outlasts any button press. Playing one of those on a
tap is how an app gets muted permanently.

    python3 tools/make_sound.py <source> <out.wav> [--start S] [--end S]
                                [--fade MS] [--fade-in MS] [--rate HZ]
                                [--peak DBFS]
    python3 tools/make_sound.py <source> --map

Defaults trim to the first transient, fold to mono, resample to 24kHz, and
normalise — which takes a ~870KB stereo file down to about 30KB.

`--map` prints a timestamped level readout instead of writing anything. Use it
to choose --start and --end: nobody working on this can listen to the file, so
the envelope is how a cut gets picked deliberately rather than guessed.

16-bit PCM WAV needs nothing but the standard library, which is the point — the
ffmpeg available here is built --disable-everything and has no audio decoders
at all. Other formats (mp3, m4a, ogg, flac) go through `miniaudio` if it is
installed: pip install miniaudio.
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


def read_encoded(path):
    """mp3/m4a/ogg/flac, via miniaudio if it is around."""
    try:
        import miniaudio
    except ImportError:
        raise SystemExit(
            f'{path} is not a WAV, and decoding it needs miniaudio.\n'
            f'    pip install miniaudio'
        )
    decoded = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.SIGNED16)
    return array.array('h', decoded.samples), decoded.nchannels, decoded.sample_rate


def read_source(path):
    with open(path, 'rb') as f:
        head = f.read(12)
    if head[:4] == b'RIFF' and head[8:12] == b'WAVE':
        return read_wav(path)
    return read_encoded(path)


def envelope(mono, rate, rows=48, rms=False):
    """
    Level per slice of time, as (start_seconds, level_0_to_1).

    Peak finds transients, which is what an effect is made of. Music mastered
    loud sits at peak everywhere and shows no structure at all under it — RMS
    is the only way to see where a track actually rises and falls.
    """
    if not mono:
        return []
    per = max(1, len(mono) // rows)
    out = []
    for i in range(0, len(mono), per):
        chunk = mono[i : i + per]
        if rms:
            level = math.sqrt(sum(v * v for v in chunk) / len(chunk)) / 32768
        else:
            level = max(abs(v) for v in chunk) / 32768
        out.append((i / rate, level))
    return out


def print_map(mono, rate, channels, rows=48, rms=False):
    """A readout to choose --start and --end from, since we cannot listen."""
    print(f'{len(mono) / rate:.2f}s  {channels}ch  {rate}Hz  {len(mono)} frames')
    peak = max((abs(s) for s in mono), default=0) / 32768
    print(f'peak {20 * math.log10(peak):.1f} dBFS' if peak else 'silent')
    print(f'onset at {find_onset(mono, rate) / rate:.3f}s')
    print(f"\n    time  {'rms' if rms else 'peak':>6}")
    scale = 60 if rms else 40
    for at, level in envelope(mono, rate, rows, rms):
        db = 20 * math.log10(level) if level else -99
        print(f'  {at:6.2f}  {db:6.1f}  {"#" * int(level * scale)}')


def to_channels(samples, channels):
    """Deinterleave into one list per channel."""
    if channels == 1:
        return [list(samples)]
    return [list(samples[c::channels]) for c in range(channels)]


def normalise_multi(chans, peak_dbfs):
    """
    One gain across every channel.

    Normalising each side independently would move the loud parts of a stereo
    image toward the centre — the balance is the recording, not a defect.
    """
    peak = max((max((abs(s) for s in c), default=0) for c in chans), default=0)
    if peak == 0:
        return chans
    gain = 32767 * (10 ** (peak_dbfs / 20)) / peak
    return [[max(-32768, min(32767, int(s * gain))) for s in c] for c in chans]


def interleave(chans):
    if len(chans) == 1:
        return array.array('h', chans[0])
    n = min(len(c) for c in chans)
    out = array.array('h', bytes(2 * n * len(chans)))
    for c, chan in enumerate(chans):
        out[c :: len(chans)] = array.array('h', chan[:n])
    return out


def write_mp3(path, chans, rate, bitrate):
    """
    Music, not an effect.

    A six-second orchestral cue as 16-bit PCM is a third of a megabyte shipped
    to the phone. The same cue as mp3 is under a hundred kilobytes and nobody
    can hear the difference through a phone speaker.
    """
    try:
        import lameenc
    except ImportError:
        raise SystemExit('writing mp3 needs lameenc.\n    pip install lameenc')
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(rate)
    enc.set_channels(len(chans))
    enc.set_quality(2)
    data = enc.encode(interleave(chans).tobytes()) + enc.flush()
    with open(path, 'wb') as f:
        f.write(bytes(data))
    return len(data)


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


def apply_fade_in(mono, rate, fade_ms):
    """Cutting into the middle of a waveform starts on a step, which clicks."""
    n = int(rate * fade_ms / 1000)
    if n <= 0 or n > len(mono):
        return mono
    for i in range(n):
        mono[i] = int(mono[i] * i / n)
    return mono


def normalise(mono, peak_dbfs):
    peak = max((abs(s) for s in mono), default=0)
    if peak == 0:
        return mono
    target = 32767 * (10 ** (peak_dbfs / 20))
    gain = target / peak
    return [max(-32768, min(32767, int(s * gain))) for s in mono]


def write_wav(path, chans, rate):
    nch = len(chans)
    body = interleave(chans).tobytes()
    with open(path, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(body)))
        f.write(b'WAVEfmt ')
        block = 2 * nch
        f.write(struct.pack('<IHHIIHH', 16, 1, nch, rate, rate * block, block, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(body)))
        f.write(body)
    return len(body) + 44


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('out', nargs='?', help='omit with --map')
    ap.add_argument('--map', action='store_true', help='print the envelope and stop')
    ap.add_argument('--rows', type=int, default=48, help='resolution of --map')
    ap.add_argument('--rms', action='store_true', help='--map by RMS; use for music')
    ap.add_argument('--start', type=float, default=None, help='seconds; default is the onset')
    ap.add_argument('--end', type=float, default=None, help='seconds from the source start')
    ap.add_argument('--fade', type=float, default=120, help='tail fade in ms')
    ap.add_argument('--fade-in', type=float, default=4, help='attack fade in ms; kills the cut click')
    ap.add_argument('--rate', type=int, default=24000)
    ap.add_argument('--stereo', action='store_true', help='keep both channels; for music')
    ap.add_argument('--bitrate', type=int, default=128, help='kbps, when the output is .mp3')
    ap.add_argument('--peak', type=float, default=-1.0, help='normalise target in dBFS')
    args = ap.parse_args()

    samples, channels, rate = read_source(args.source)
    mono = to_mono(samples, channels)

    if args.map:
        print_map(mono, rate, channels, args.rows, args.rms)
        return
    if not args.out:
        raise SystemExit('an output path is required unless you pass --map')

    print(f'source: {len(mono) / rate:.2f}s, {channels}ch, {rate}Hz')

    start = int(rate * args.start) if args.start is not None else find_onset(mono, rate)
    end = int(rate * args.end) if args.end is not None else len(mono)
    end = min(end, len(mono))
    if end <= start:
        raise SystemExit('end must come after start')

    chans = to_channels(samples, channels) if args.stereo else [mono]
    chans = [c[start:end] for c in chans]
    print(f'trimmed: {start / rate:.3f}s -> {end / rate:.3f}s  ({len(chans[0]) / rate:.2f}s)')

    chans = [resample(c, rate, args.rate) for c in chans]
    chans = normalise_multi(chans, args.peak)
    chans = [apply_fade_in(c, args.rate, args.fade_in) for c in chans]
    chans = [apply_fade(c, args.rate, args.fade) for c in chans]

    if args.out.lower().endswith('.mp3'):
        size = write_mp3(args.out, chans, args.rate, args.bitrate)
    else:
        size = write_wav(args.out, chans, args.rate)

    layout = {1: 'mono', 2: 'stereo'}.get(len(chans), f'{len(chans)}ch')
    seconds = len(chans[0]) / args.rate
    print(f'wrote {args.out}: {seconds:.2f}s {layout} {args.rate}Hz, {size / 1024:.1f}KB')


if __name__ == '__main__':
    sys.exit(main())
