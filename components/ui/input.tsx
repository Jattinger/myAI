import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [isListening, setIsListening] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Check if the browser supports speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (inputRef.current) {
          inputRef.current.value = transcript; // Set recognized speech as input
        }
      };
    }

    const handleVoiceInput = () => {
      if (recognition) {
        recognition.start();
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
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
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
