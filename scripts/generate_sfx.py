#!/usr/bin/env python3
"""Reproducible small offline PCM WAV effects for Android SoundPool.

Only Python standard library; files are local assets, never downloaded. 24kHz,
16-bit mono PCM WAV is decoded directly by Android, including older WebViews.
"""
from pathlib import Path
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sfx"
RATE = 24000

# (time, frequency Hz, duration seconds, amplitude, kind)
CUES = {
    "stone": [(0, 320, .125, .75, "wood")],
    "capture": [(0, 380, .105, .73, "wood"), (.084, 290, .15, .61, "wood")],
    "correct": [(0, 340, .07, .44, "wood"), (.055, 690, .13, .38, "bell")],
    "error": [(0, 360, .12, .36, "bell"), (.11, 285, .16, .34, "bell")],
    "pass": [(0, 490, .115, .38, "bell"), (.087, 398, .13, .33, "bell")],
    "undo": [(0, 475, .105, .39, "bell"), (.08, 570, .13, .33, "bell")],
    "hint": [(0, 690, .17, .37, "bell")],
    "mark": [(0, 425, .09, .5, "wood")],
    "finish": [(0, 523, .19, .44, "bell"), (.13, 659, .21, .46, "bell"), (.28, 784, .28, .47, "bell")],
    "toggle": [(0, 745, .14, .42, "bell")],
}

def compose(events, seed):
    rng = random.Random(seed)
    duration = max(start + length for start, _, length, _, _ in events) + .025
    frames = max(1, int(RATE * duration))
    out = []
    for i in range(frames):
        t = i / RATE
        value = 0.
        for start, frequency, length, amount, kind in events:
            u = t - start
            if u < 0 or u >= length:
                continue
            if kind == "wood":
                # A broad but brief wooden impact, lightly low-pass shaped with a
                # pitched resonant body. No long hiss or high-frequency alarm.
                env = (1.0 - math.exp(-u * 900)) * math.exp(-u * 42)
                body = .68 * math.sin(2 * math.pi * frequency * u)
                body += .18 * math.sin(2 * math.pi * frequency * 2.17 * u)
                body += .10 * math.sin(2 * math.pi * frequency * 3.3 * u)
                noise = .25 * (rng.random() * 2 - 1) * math.exp(-u * 125)
                sample = amount * (env * body + noise)
            else:
                attack = min(1., u / .013)
                tail = math.exp(-3.2 * u / length)
                fade = max(0., min(1., (length - u) / .025))
                sample = amount * attack * tail * fade * (
                    .82 * math.sin(2 * math.pi * frequency * u) +
                    .16 * math.sin(2 * math.pi * frequency * 2.01 * u)
                )
            value += sample
        out.append(value)
    peak = max(abs(x) for x in out) or 1.
    gain = min(1., .81 / peak)
    return b"".join(struct.pack("<h", int(max(-1., min(1., v * gain)) * 32767)) for v in out)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for index, (name, events) in enumerate(CUES.items()):
        destination = OUT / (name + ".wav")
        pcm = compose(events, 20261114 + index)
        with wave.open(str(destination), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(pcm)
        print("%-8s %6d bytes" % (name, destination.stat().st_size))
    print("Generated %d short offline Android sound effects." % len(CUES))

if __name__ == "__main__":
    main()
