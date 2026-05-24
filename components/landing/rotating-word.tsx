"use client";

import { useEffect, useState } from "react";

const DEFAULT_WORDS = [
  "Reimagined",
  "Quadrupled",
  "Insured",
  "Protected",
  "Rewarded",
];

type RotatingWordProps = {
  words?: string[];
  /** ms each word stays on screen */
  interval?: number;
};

export function RotatingWord({
  words = DEFAULT_WORDS,
  interval = 2200,
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span
      // keying on index re-triggers the enter animation on each swap
      key={index}
      className="inline-block pb-[0.15em] animate-word-in bg-gradient-to-r from-teal-400 to-teal-300 bg-clip-text text-transparent"
    >
      {words[index]}.
    </span>
  );
}
