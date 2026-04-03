import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const SILENCE_TIMEOUT_MS = 5000;
const SILENCE_WARNING_MS = 2000;

const PUNCTUATION_COMMANDS: Record<string, string> = {
  'period': '.',
  'full stop': '.',
  'dot': '.',
  'comma': ',',
  'question mark': '?',
  'exclamation point': '!',
  'exclamation mark': '!',
  'colon': ':',
  'semicolon': ';',
  'semi colon': ';',
  'dash': '-',
  'hyphen': '-',
  'open quote': '"',
  'open quotes': '"',
  'quote': '"',
  'close quote': '"',
  'close quotes': '"',
  'end quote': '"',
  'open parenthesis': '(',
  'open paren': '(',
  'close parenthesis': ')',
  'close paren': ')',
  'apostrophe': "'",
  'ellipsis': '...',
  'ampersand': '&',
  'at sign': '@',
  'hashtag': '#',
  'hash': '#',
  'dollar sign': '$',
  'percent': '%',
  'percent sign': '%',
};

const LINE_COMMANDS: [RegExp, string][] = [
  [/new\s*paragraph|paragraph\s*break|double\s*enter|blank\s*line|next\s*paragraph/gi, '\n\n'],
  [/new\s*line|newline|next\s*line|line\s*break|single\s*enter/gi, '\n'],
];

const UNDO_COMMANDS = /\b(undo\s*that|scratch\s*that|delete\s*that|undo\s*last|take\s*that\s*back)\b/gi;
const CLEAR_COMMANDS = /\b(clear\s*all|start\s*over|erase\s*everything|clear\s*everything|delete\s*all)\b/gi;
const SPELL_COMMAND = /\bspell\s+([a-z\s-]+)/gi;

const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
  'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
  'million': 1000000, 'billion': 1000000000,
};

const CURRENCY_PATTERNS: [RegExp, (match: string, num: string) => string][] = [
  [/(\d+)\s*dollars?/gi, (_, num) => `$${num}`],
  [/(\d+)\s*cents?/gi, (_, num) => `${num}¢`],
  [/(\d+)\s*percent/gi, (_, num) => `${num}%`],
];

const SENTENCE_ENDERS = ['.', '?', '!'];

function convertNumberWords(text: string): string {
  const numberPattern = /\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\s*)+)\b/gi;

  return text.replace(numberPattern, (match) => {
    const words = match.toLowerCase().trim().split(/\s+/);
    let total = 0;
    let current = 0;

    for (const word of words) {
      const value = NUMBER_WORDS[word];
      if (value === undefined) continue;

      if (value === 100) {
        current = current === 0 ? 100 : current * 100;
      } else if (value === 1000 || value === 1000000 || value === 1000000000) {
        current = current === 0 ? value : current * value;
        total += current;
        current = 0;
      } else if (value >= 20 && value < 100) {
        current += value;
      } else {
        current += value;
      }
    }

    total += current;
    return total > 0 ? total.toString() : match;
  });
}

function processSpelling(text: string): string {
  return text.replace(SPELL_COMMAND, (_, letters: string) => {
    const cleaned = letters.replace(/[\s-]+/g, '').toLowerCase();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  });
}

function normalizeForCommands(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?]/g, '').trim();
}

function processTranscript(rawText: string): { text: string; shouldUndo: boolean; shouldClear: boolean } {
  let text = rawText;
  let shouldUndo = false;
  let shouldClear = false;

  const normalizedCheck = normalizeForCommands(text);

  if (UNDO_COMMANDS.test(normalizedCheck)) {
    shouldUndo = true;
    text = text.replace(UNDO_COMMANDS, '');
  }

  if (CLEAR_COMMANDS.test(normalizedCheck)) {
    shouldClear = true;
    text = text.replace(CLEAR_COMMANDS, '');
  }

  text = processSpelling(text);
  text = convertNumberWords(text);

  for (const [pattern, replacement] of LINE_COMMANDS) {
    text = text.replace(pattern, replacement);
  }

  for (const [command, replacement] of Object.entries(PUNCTUATION_COMMANDS)) {
    const regex = new RegExp(`\\s*\\b${command}\\b\\s*`, 'gi');
    text = text.replace(regex, replacement + ' ');
  }

  for (const [pattern, replacer] of CURRENCY_PATTERNS) {
    text = text.replace(pattern, replacer);
  }

  text = text.replace(/\s+([.,!?;:])/g, '$1');
  text = text.replace(/([.,!?;:])(?!\s|$|\n)/g, '$1 ');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  let result = '';
  let capitalizeNext = true;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (capitalizeNext && /[a-z]/.test(char)) {
      result += char.toUpperCase();
      capitalizeNext = false;
    } else {
      result += char;
    }

    if (SENTENCE_ENDERS.includes(char)) {
      capitalizeNext = true;
    }

    if (char === '\n') {
      capitalizeNext = true;
    }
  }

  return { text: result.trim(), shouldUndo, shouldClear };
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface VoiceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
  id?: string;
}

export function VoiceTextArea({
  value,
  onChange,
  label,
  placeholder,
  rows = 6,
  required,
  className = '',
  id,
}: VoiceTextAreaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [silenceTime, setSilenceTime] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const segmentsRef = useRef<string[]>([]);
  const lastSpeechTimeRef = useRef<number>(0);
  const isManualStopRef = useRef(false);
  const recordingStartRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldRestartRef = useRef(false);
  const isRecordingRef = useRef(false);
  const valueRef = useRef(value);

  valueRef.current = value;

  const stopTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    stopTimers();
    recordingStartRef.current = Date.now();
    lastSpeechTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setRecordingTime(now - recordingStartRef.current);

      const silence = now - lastSpeechTimeRef.current;
      setSilenceTime(silence);

      if (silence >= SILENCE_TIMEOUT_MS && !isManualStopRef.current) {
        isManualStopRef.current = true;
        shouldRestartRef.current = false;
        recognitionRef.current?.stop();
      }
    }, 100);
  }, [stopTimers]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current || !isRecordingRef.current) return;
    isManualStopRef.current = true;
    shouldRestartRef.current = false;
    isRecordingRef.current = false;
    recognitionRef.current.stop();
    stopTimers();
    setIsRecording(false);
    setInterimText('');
    setRecordingTime(0);
    setSilenceTime(0);
  }, [stopTimers]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && !isManualStopRef.current) {
        const silence = Date.now() - lastSpeechTimeRef.current;
        if (silence < SILENCE_TIMEOUT_MS) {
          try {
            recognition.start();
            return;
          } catch {
            // Failed to restart
          }
        }
      }

      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimText('');
      stopTimers();
      setRecordingTime(0);
      setSilenceTime(0);
      shouldRestartRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      lastSpeechTimeRef.current = Date.now();

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {

        const { text: processedFinal, shouldUndo, shouldClear } = processTranscript(final);

        if (shouldClear) {
          segmentsRef.current = [];
          onChange('');
        } else if (shouldUndo) {
          if (segmentsRef.current.length > 0) {
            segmentsRef.current.pop();
            onChange(segmentsRef.current.join(' '));
          }
        } else if (processedFinal) {
          segmentsRef.current.push(processedFinal);
          onChange(segmentsRef.current.join(' '));
        }
      }

      const processedInterim = interim ? processTranscript(interim).text : '';
      setInterimText(processedInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied');
        isManualStopRef.current = true;
      } else if (event.error === 'no-speech') {
        return;
      } else if (event.error !== 'aborted') {
        setError(`Error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      stopTimers();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onChange, stopTimers]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || isRecordingRef.current) return;

    const currentValue = valueRef.current;
    const existingSegments = currentValue ? currentValue.split(/(?<=[.!?])\s+/).filter(Boolean) : [];
    segmentsRef.current = existingSegments.length > 0 ? existingSegments : (currentValue ? [currentValue] : []);

    setInterimText('');
    setError(null);
    isManualStopRef.current = false;
    shouldRestartRef.current = true;
    lastSpeechTimeRef.current = Date.now();

    try {
      recognitionRef.current.start();
      startTimers();
    } catch (err) {
      if (err instanceof Error && err.message.includes('already started')) {
        recognitionRef.current.stop();
      }
    }
  }, [startTimers]);

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (!isRecordingRef.current) {
      const segments = e.target.value.split(/(?<=[.!?])\s+/).filter(Boolean);
      segmentsRef.current = segments.length > 0 ? segments : (e.target.value ? [e.target.value] : []);
    }
  };

  const displayValue = isRecording && interimText
    ? value + (value ? ' ' : '') + interimText
    : value;

  const silenceProgress = Math.min(silenceTime / SILENCE_TIMEOUT_MS, 1);
  const showSilenceWarning = silenceTime >= SILENCE_WARNING_MS;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={displayValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          readOnly={isRecording}
          className={`w-full px-4 py-3 pr-14 rounded-lg border transition-colors resize-none ${
            isRecording
              ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10'
              : 'border-[var(--border-default)] bg-[var(--bg-secondary)] focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)]'
          } text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none`}
        />

        {isSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-black'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <>
                <Square size={14} className="fill-current" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              </>
            ) : (
              <Mic size={16} />
            )}
          </button>
        )}

        {!isSupported && (
          <div className="absolute top-3 right-3" title="Voice input not supported in this browser">
            <MicOff size={16} className="text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {isRecording && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording {formatTime(recordingTime)}
            </span>
            {showSilenceWarning && (
              <span className="text-amber-600">
                Silence: {((SILENCE_TIMEOUT_MS - silenceTime) / 1000).toFixed(1)}s remaining
              </span>
            )}
          </div>

          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                showSilenceWarning ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${(1 - silenceProgress) * 100}%` }}
            />
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Commands: "period" "comma" "new paragraph" "undo that" "clear all" "spell [letters]"
          </p>
        </div>
      )}

      {error && !isRecording && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
