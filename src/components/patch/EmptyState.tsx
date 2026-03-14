import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { Crosshair, Music, Mic, Loader2, ArrowRight } from "lucide-react";
import GenerateModal from "./GenerateModal";

/* ── Radar background ── */
const SPOKE_COUNT = 9;
const DOT_COLORS = [
  "#fbbf24", "#8b5cf6", "#ec4899", "#f59e0b", "#22d3ee",
  "#84cc16", "#ef4444", "#f97316", "#6366f1",
];

interface RadarDot {
  angle: number;
  minR: number;
  maxR: number;
  color: string;
  dur: number;
}

const RadarBackground = () => {
  const dots = useMemo<RadarDot[]>(() => {
    return Array.from({ length: SPOKE_COUNT }, (_, i) => {
      const angle = (i * 360) / SPOKE_COUNT - 90;
      const minR = 0.4 + Math.random() * 0.1;
      const maxR = 0.65 + Math.random() * 0.15;
      const dur = 8 + Math.random() * 7;
      return { angle, minR, maxR, color: DOT_COLORS[i], dur };
    });
  }, []);

  const R = 210;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.2 }}>
      {/* Radial glow */}
      <div
        className="absolute"
        style={{
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle 280px, rgba(120,80,255,0.05), transparent)",
        }}
      />
      <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} className="absolute">
        {/* Concentric circles */}
        {[0.33, 0.66, 1].map((pct) => (
          <circle
            key={pct}
            cx={R}
            cy={R}
            r={R * pct}
            fill="none"
            stroke="rgba(120,80,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {/* Spokes */}
        {dots.map((d, i) => {
          const rad = (d.angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={R}
              y1={R}
              x2={R + Math.cos(rad) * R}
              y2={R + Math.sin(rad) * R}
              stroke="rgba(120,80,255,0.07)"
              strokeWidth={1}
            />
          );
        })}
        {/* Animated dots */}
        {dots.map((d, i) => {
          const rad = (d.angle * Math.PI) / 180;
          const cx1 = R + Math.cos(rad) * R * d.minR;
          const cy1 = R + Math.sin(rad) * R * d.minR;
          const cx2 = R + Math.cos(rad) * R * d.maxR;
          const cy2 = R + Math.sin(rad) * R * d.maxR;
          return (
            <circle key={`dot-${i}`} r={2.5} fill={d.color}>
              <animate
                attributeName="cx"
                values={`${cx1};${cx2};${cx1}`}
                dur={`${d.dur}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
              />
              <animate
                attributeName="cy"
                values={`${cy1};${cy2};${cy1}`}
                dur={`${d.dur}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
              />
            </circle>
          );
        })}
      </svg>
    </div>
  );
};

/* ── Step indicator ── */
const Step = ({
  icon,
  label,
  text,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut", delay }}
    className="flex flex-col items-center gap-1.5 w-[200px]"
  >
    {icon}
    <span style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.35)" }} className="uppercase font-medium">
      {label}
    </span>
    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{text}</span>
  </motion.div>
);

/* ── Main component ── */
const EmptyState = () => {
  const { loadDemo, isLoading } = useAudioEngine();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const baseDelay = 0;
  const line2Delay = baseDelay + 0.15;
  const subtitleDelay = line2Delay + 0.3;
  const stepsDelay = subtitleDelay + 0.3;

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <RadarBackground />

        {/* Hero text */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: baseDelay }}
            className="font-display"
            style={{ fontSize: 52, fontWeight: 600, color: "#fff", lineHeight: 1.1 }}
          >
            You know the sound.
          </motion.h1>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: line2Delay }}
            className="font-display mt-1"
            style={{
              fontSize: 52,
              fontWeight: 600,
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            You just can't say it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: subtitleDelay }}
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: 0.5,
              fontWeight: 400,
              marginTop: 16,
            }}
          >
            Navigate by emotion. Generate with AI. Edit by voice.
          </motion.p>

          {/* Steps */}
          <div className="flex items-center gap-0 mt-9">
            <Step
              icon={<Crosshair size={20} style={{ color: "#22d3ee" }} />}
              label="Discover"
              text="9 emotional dimensions"
              delay={stepsDelay}
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stepsDelay + 0.1 }}
              style={{ color: "rgba(255,255,255,0.12)", fontSize: 14 }}
            >
              <ArrowRight size={14} />
            </motion.span>
            <Step
              icon={<Music size={20} style={{ color: "#a78bfa" }} />}
              label="Generate"
              text="AI creates your track"
              delay={stepsDelay + 0.2}
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stepsDelay + 0.3 }}
              style={{ color: "rgba(255,255,255,0.12)", fontSize: 14 }}
            >
              <ArrowRight size={14} />
            </motion.span>
            <Step
              icon={<Mic size={20} style={{ color: "#f472b6" }} />}
              label="Edit"
              text="Speak what to change"
              delay={stepsDelay + 0.4}
            />
          </div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: stepsDelay + 0.5 }}
            className="flex items-center gap-3 mt-7"
          >
            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading}
              className="relative overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                color: "#fff",
                padding: "13px 32px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                boxShadow: "0 4px 20px rgba(120,80,255,0.2)",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.filter = "brightness(1.1)";
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "";
                e.currentTarget.style.transform = "";
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Track"
              )}
            </button>

            <button
              onClick={() => navigate("/discover")}
              disabled={isLoading}
              className="transition-all duration-200 disabled:opacity-50"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.65)",
                padding: "13px 32px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = "rgba(120,80,255,0.4)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              }}
            >
              Discover Vibes
            </button>
          </motion.div>

          {/* Drag/drop + Load Demo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: stepsDelay + 0.6 }}
            className="flex flex-col items-center gap-1.5 mt-5"
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              or drag and drop an audio file
            </span>
            <button
              onClick={loadDemo}
              disabled={isLoading}
              className="transition-colors duration-200 disabled:opacity-30"
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                background: "none",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.35)";
              }}
            >
              Load Demo
            </button>
          </motion.div>
        </div>

        {/* Credibility bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: stepsDelay + 0.7 }}
          className="absolute bottom-10 left-0 right-0 text-center"
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,0.18)",
            textTransform: "uppercase" as const,
          }}
        >
          9 GEMS Dimensions{" "}
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>{" "}
          60+ Neuroscience Metrics{" "}
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>{" "}
          8,000 Analyzed Tracks{" "}
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>{" "}
          4 Research Papers
        </motion.div>
      </div>

      <GenerateModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export default EmptyState;
