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

          recognitionInstance.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (inputRef.current) {
              inputRef.current.value = transcript; // Set recognized speech as input
            }
          };

          setRecognition(recognitionInstance);
        }
      }
    }, []); // ✅ Runs only once on mount (client-side)

    const handleVoiceInput = () => {
      if (recognition) {
        recognition.start();
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    };

    // ✅ Make sure the function correctly RETURNS JSX
    return (
      <div className="relative flex items-center w-full">
        {/* Input Field */}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={(el) => {
            if (typeof ref === "function") {
              ref(el);
            } else if (ref && "current" in ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }
            inputRef.current = el; 
          }}
          {...props}
        />

        {/* Voice Input Button */}
        <button
          type="button"
          onClick={handleVoiceInput}
          className="absolute right-3 p-2 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none"
        >
          🎤
        </button>
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
