import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeechToText(onResult: (transcript: string) => void, onError?: (error: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'vi-VN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (onError) onError(event.error);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onResult, onError]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (onError) onError("Trình duyệt không hỗ trợ nhận diện giọng nói");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition start error:', error);
        setIsListening(false);
      }
    }
  }, [isListening, onError]);

  return { isListening, toggleListening, isSupported: !!recognitionRef.current };
}
