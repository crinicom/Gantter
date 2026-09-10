// Reconocimiento de voz del huddle (§10, Web Speech API — Chrome/Edge). El
// micrófono es una vía más del transcript: los resultados finales se entregan a
// `onFinal` como otra línea del usuario activo (Lucía). Cada resultado final se
// persiste y el reconocimiento vuelve a escuchar (autoRestart); los recognizing
// intermedios solo se muestran en vivo y nunca se persisten.
//
// Sin soporte (Firefox/Safari o contextos no seguros) `supported` es false y la
// UI oculta el botón: quedan la línea escrita y el demo.

import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speechToTextSupported() {
  return Boolean(getRecognition());
}

export function useSpeechToText({
  lang = 'es-AR',
  interimResults = true,
  continuous = true,
  autoRestart = true,
  onFinal,
} = {}) {
  const [supported] = useState(speechToTextSupported);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');

  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stopRef = useRef(false);
  const recognitionRef = useRef(null);

  const stop = useCallback(() => {
    stopRef.current = true;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch (_) {
        /* noop */
      }
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const SR = getRecognition();
    if (!SR) return;
    stopRef.current = false;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = interimResults;
    rec.continuous = continuous;

    rec.onresult = (event) => {
      let pendingInterim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || '';
        if (result.isFinal) finalText += ` ${transcript}`;
        else pendingInterim += transcript;
      }
      setInterim(pendingInterim.trim());
      const cleanFinal = finalText.trim();
      if (cleanFinal) {
        onFinalRef.current?.(cleanFinal);
      }
    };

    rec.onerror = () => {
      setListening(false);
      setInterim('');
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
      if (autoRestart && !stopRef.current && supported) {
        // El navegador corta solo: re-escuchamos para seguir el huddle.
        startRef.current?.();
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch (_) {
      setListening(false);
      setInterim('');
    }
  }, [supported, listening, lang, interimResults, continuous, autoRestart]);

  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    listening,
    interim,
    start,
    stop,
    toggle: listening ? stop : start,
  };
}