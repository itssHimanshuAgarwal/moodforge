import { useState } from "react";
import { Send } from "lucide-react";

interface TextFeedbackProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
}

const TextFeedback = ({ onSubmit, disabled }: TextFeedbackProps) => {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-[220px]">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          placeholder="Tell me what to change..."
          className="w-full h-7 px-3 pr-8 text-[11px] bg-muted/40 border border-border rounded-full text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors duration-150 disabled:opacity-40"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary transition-colors duration-150 disabled:opacity-30"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};

export default TextFeedback;
