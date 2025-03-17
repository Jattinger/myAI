import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// ✅ Ensure TypeScript recognizes SpeechRecognition and SpeechRecognitionEvent
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [isListening, setIsListening] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null); 
    const [recognition, setRecognition] = React.useState<SpeechRecognitionInstance | null>(null);

    // ✅ Ensure `window` is accessed only on the client side
    React.useEffect(() => {
      if (typeof window !== "undefined") {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognitionInstance: SpeechRecognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false;
          recognitionInstance.lang = "en-US";
          recognitionInstance.interimResults = false;

          recognitionInstance.onstart = () => setIsListening(true);
          recognitionInstance.onend = () => setIsListening(false);

          // ✅ Fix: Ensure speech is stored in the input field
          recognitionInstance.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Recognized Speech:", transcript); // Debugging output

            if (inputRef.current) {
              inputRef.current.value = transcript; // ✅ Store speech data in input field
              inputRef.current.dispatchEvent(new Event("input", { bubbles: true })); // ✅ Ensure React recognizes the input change
            }
          };

          setRecognition(recognitionInstance);
        }
      }
    }, []); // ✅ Runs only once on mount (c
