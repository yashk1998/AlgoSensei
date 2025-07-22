/**
 * @dev Landing page section showcasing the key features and stages of problem-solving
 * Features: animated cards, scroll-based animations, responsive grid layout
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Terminal, Code2, TestTube, Lightbulb, FileCode, Bug } from "lucide-react";
import { ChatPreview } from "./ChatPreview";

/**
 * @dev Configuration for problem-solving stages
 * Each stage includes an icon, title, and description of the process
 */
const stages = [
  {
    icon: Terminal,
    title: "Problem Understanding",
    description: "Break down the problem, analyze requirements, and identify constraints.",
  },
  {
    icon: TestTube,
    title: "Test Case Analysis",
    description: "Review sample cases, identify edge cases, and validate inputs.",
  },
  {
    icon: Lightbulb,
    title: "Logic Building",
    description: "Brainstorm approaches, recognize patterns, and develop solution strategy.",
  },
  {
    icon: Code2,
    title: "Algorithm & Pseudo Code",
    description: "Develop step-by-step algorithm and analyze complexity.",
  },
  {
    icon: FileCode,
    title: "Implementation",
    description: "Write code with guidance, following best practices.",
  },
  {
    icon: Bug,
    title: "Dry Run & Debug",
    description: "Test, identify bugs, and optimize performance.",
  },
];

/**
 * @dev Card component for displaying individual problem-solving stages
 * @param stage - Stage object containing icon, title, and description
 * @param index - Position of the stage in the sequence
 */
function StageCard({ stage, index }: { stage: typeof stages[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "center center"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const Icon = stage.icon;

  return (
    <motion.div
      ref={cardRef}
      style={{ y, opacity }}
      className="relative flex items-start gap-3 md:gap-4 bg-card p-4 md:p-6 rounded-lg shadow-lg"
    >
      <div className="absolute -left-2 md:-left-3 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs md:text-sm">
        {index + 1}
      </div>
      <div className="flex-shrink-0 p-2 md:p-3 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
      </div>
      <div className="space-y-1 md:space-y-2">
        <h3 className="text-base md:text-lg font-semibold">{stage.title}</h3>
        <p className="text-xs md:text-sm text-muted-foreground">{stage.description}</p>
      </div>
    </motion.div>
  );
}

/**
 * @dev Main features section component that displays problem-solving stages
 * Uses scroll-based animations and responsive grid layout
 */
export function FeaturesSection() {
  return (
    <section id="features" className="container mt-8 md:mt-10 px-4">
      <div className="text-center space-y-2 mb-8 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Experience AI-Guided Learning
        </h2>
        <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Our intelligent system breaks down complex problems into manageable steps,
          making DSA approachable for everyone.
        </p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Journey Line */}
        <div className="absolute left-[22px] md:left-[47px] top-8 bottom-8 w-0.5 bg-primary/30" />

        {/* Stage Cards */}
        <div className="space-y-6 md:space-y-8">
          {stages.map((stage, index) => (
            <StageCard key={stage.title} stage={stage} index={index} />
          ))}
        </div>
      </div>

      {/* Chat Preview Section */}
      <div className="mb-1 mt-8 md:mt-12">
        <ChatPreview />
      </div>
    </section>
  );
}
