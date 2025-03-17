import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// ✅ Fix: Define `SpeechRecognition` properly for TypeScript
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [isListening, setIsListening] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const recognitionRef = React.useRef<SpeechRecognition | null>(null);

    React.useEffect(() => {
      if (typeof window !== "undefined") {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.lang = "en-US";
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
            setIsListening(true);
            console.log("🎤 Voice recording started...");
          };

          recognition.onend = () => {
            setIsListening(false);
            console.log("🛑 Voice recording ended.");
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log("🎤 Speech Event Triggered:", event);
            if (event.results.length > 0) {
              const transcript = event.results[event.results.length - 1][0].transcript.trim();
              console.log("✅ Recognized Speech:", transcript);
              if (inputRef.current) {
                inputRef.current.value = transcript;
                inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }
          };

          recognition.onerror = (event) => {
            console.error("❌ Speech Recognition Error:", event);
          };

          recognitionRef.current = recognition;
        }
      }
    }, []);

    const handleVoiceInput = () => {
      if (recognitionRef.current) {
        console.log("🎤 Starting voice recognition...");
        recognitionRef.current.start();
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    };

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
