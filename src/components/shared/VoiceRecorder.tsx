import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Square, Trash2, Check } from 'lucide-react';
import { Button } from '../ui/Button';

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

const LINE_COMMANDS: Record<string, string> = {
  'new line': '\n',
  'newline': '\n',
  'next line': '\n',
  'line break': '\n',
  'new paragraph': '\n\n',
  'next paragraph': '\n\n',
  'paragraph': '\n\n',
  'paragraph break': '\n\n',
};

const SENTENCE_ENDERS = ['.', '?', '!'];

function processTranscript(rawText: string): string {
  let text = rawText;

  for (const [command, replacement] of Object.entries(LINE_COMMANDS)) {
    const regex = new RegExp(`\\b${command}\\b`, 'gi');
    text = text.replace(regex, replacement);
  }

  for (const [command, replacement] of Object.entries(PUNCTUATION_COMMANDS)) {
    const regex = new RegExp(`\\s*\\b${command}\\b\\s*`, 'gi');
    text = text.replace(regex, replacement + ' ');
  }

  text = text.replace(/\s+([.,!?;:])/g, '$1');
  text = text.replace(/([.,!?;:])(?!\s|$|\n)/g, '$1 ');
  text = text.replace(/\s+\n/g, '\n');
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\s{2,}/g, ' ');

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

  return result.trim();
}

interface VoiceRecorderProps {
  onTranscription: (text: string, confidence: number) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  onInterimTranscript?: (text: string) => void;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  compact?: boolean;
}

export function VoiceRecorder({
  onTranscription,
  onRecordingChange,
  onInterimTranscript,
  placeholder = 'Click the microphone to start recording...',
  className = '',
  showPreview = true,
  compact = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      onRecordingChange?.(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
      onRecordingChange?.(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = finalTranscriptRef.current;
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const rawTranscript = result[0].transcript;
          final += rawTranscript + ' ';
          totalConfidence += result[0].confidence;
          confidenceCount++;
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final;
      const processedFinal = processTranscript(final);
      setTranscript(processedFinal);

      const processedInterim = processTranscript(interim);
      setInterimTranscript(processedInterim);
      onInterimTranscript?.(processedFinal + (processedInterim ? ' ' + processedInterim : ''));

      if (confidenceCount > 0) {
        setConfidence(totalConfidence / confidenceCount);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error !== 'aborted') {
        setError(`Error: ${event.error}`);
      }
      setIsRecording(false);
      onRecordingChange?.(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onRecordingChange, onInterimTranscript]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || isRecording) return;

    finalTranscriptRef.current = transcript ? transcript + ' ' : '';
    setInterimTranscript('');
    setError(null);

    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err instanceof Error && err.message.includes('already started')) {
        recognitionRef.current.stop();
      }
    }
  }, [isRecording, transcript]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current || !isRecording) return;
    recognitionRef.current.stop();
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    finalTranscriptRef.current = '';
  }, []);

  const handleConfirm = useCallback(() => {
    if (transcript.trim()) {
      onTranscription(transcript.trim(), confidence);
      clearTranscript();
    }
  }, [transcript, confidence, onTranscription, clearTranscript]);

  if (!isSupported) {
    return (
      <div className={`bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-default)] ${className}`}>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <MicOff size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const displayText = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={toggleRecording}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-black'
          }`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <Square size={16} className="fill-current" />
          ) : (
            <Mic size={18} />
          )}
          {isRecording && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
        </button>
        {isRecording && (
          <span className="text-xs text-red-500 font-medium">Recording...</span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRecording}
          className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-black'
          }`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <Square size={20} className="fill-current" />
          ) : (
            <Mic size={20} />
          )}
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </button>

        <div className="flex-1">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-red-500" />
              <span className="text-sm text-red-500 font-medium">Recording...</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${8 + Math.random() * 12}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">
              {transcript ? 'Recording saved' : placeholder}
            </span>
          )}
        </div>

        {transcript && !isRecording && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearTranscript}
              className="text-[var(--text-muted)] hover:text-red-500"
            >
              <Trash2 size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
            >
              <Check size={16} className="mr-1" /> Use Text
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {showPreview && displayText && (
        <div className="relative">
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-default)] min-h-[80px]">
            <p className="text-[var(--text-primary)] whitespace-pre-wrap">
              {transcript}
              {interimTranscript && (
                <span className="text-[var(--text-muted)] italic"> {interimTranscript}</span>
              )}
            </p>
          </div>
          {confidence > 0 && !isRecording && (
            <div className="absolute bottom-2 right-2">
              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      )}

      {isRecording && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)]">
            Speak clearly. Say "period", "comma", "question mark", "new paragraph" for punctuation.
          </p>
        </div>
      )}
    </div>
  );
}

export { processTranscript };
