"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Speech to text with the browser's own speech recognition: free and on the
// device or the browser's service, no audio is sent to this app. Chrome, Edge
// and Safari have it; elsewhere `supported` is false and typing still works.

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

type RecognitionConstructor = new () => Recognition;

const getConstructor = (): RecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const subscribeNothing = () => () => {};

export function useSpeechToText(onFinal: (text: string) => void, lang = "en-US") {
  // Known only in the browser; false while rendering on the server.
  const supported = useSyncExternalStore(subscribeNothing, () => getConstructor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Constructor = getConstructor();
    if (!Constructor || recognition.current) return;
    const r = new Constructor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onFinalRef.current(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    r.onerror = (event) => {
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "The microphone is blocked. Allow it in the browser's address bar, or type instead."
          : event.error === "no-speech"
            ? null
            : "Speech recognition stopped. Try again, or type instead.",
      );
    };
    r.onend = () => {
      recognition.current = null;
      setListening(false);
      setInterim("");
    };
    recognition.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [lang]);

  useEffect(() => () => recognition.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
