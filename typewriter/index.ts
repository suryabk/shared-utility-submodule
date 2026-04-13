import { useState, useEffect, useRef } from "react";

interface TypewriterOptions {
  words: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
}

export function useTypewriter({
  words,
  typeSpeed = 100,
  deleteSpeed = 60,
  pauseDuration = 1500,
  loop = true,
}: TypewriterOptions) {
  const [displayText, setDisplayText] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordsRef = useRef(words);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // All mutable state lives in a ref — no stale closures, no cancelled pause timeouts
  const state = useRef({
    wordIndex: 0,
    charIndex: 0,
    isDeleting: false,
  });

  useEffect(() => {
    state.current = { wordIndex: 0, charIndex: 0, isDeleting: false };

    const tick = () => {
      const s = state.current;
      const word = wordsRef.current[s.wordIndex];

      if (!s.isDeleting) {
        s.charIndex++;
        setDisplayText(word.slice(0, s.charIndex));

        if (s.charIndex === word.length) {
          timeoutRef.current = setTimeout(() => {
            s.isDeleting = true;
            timeoutRef.current = setTimeout(tick, deleteSpeed);
          }, pauseDuration);
          return;
        }
      } else {
        s.charIndex--;
        setDisplayText(word.slice(0, s.charIndex));

        if (s.charIndex === 0) {
          s.isDeleting = false;
          const next = s.wordIndex + 1;
          if (next >= wordsRef.current.length) {
            if (!loop) return;
            s.wordIndex = 0;
          } else {
            s.wordIndex = next;
          }
        }
      }

      timeoutRef.current = setTimeout(tick, s.isDeleting ? deleteSpeed : typeSpeed);
    };

    timeoutRef.current = setTimeout(tick, typeSpeed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [deleteSpeed, loop, pauseDuration, typeSpeed]);

  return { text: displayText };
}
