/**
 * @dev Hero section component for the landing page
 * Features: animated text reveals, responsive layout, typing animation, language orbit
 */

import { RainbowButton } from "@/components/ui/rainbow-button";
import { BoxReveal } from "@/components/ui/box-reveal";
import { motion } from "framer-motion";
import Link from "next/link";
import { LanguagesOrbit } from "./LanguagesOrbit";
import { TypingTopics } from "@/components/ui/typing-topics";

/**
 * @dev Main hero section that introduces the platform
 * Includes animated headings, description, CTA button, and visual elements
 */
export function HeroSection() {
  return (
    <section id="hero" className="container flex flex-col-reverse lg:flex-row items-center justify-between py-10 md:py-20 gap-8 px-4">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 w-full lg:w-auto"
      >
        <div className="space-y-4 md:space-y-6">
          <BoxReveal boxColor="#000" duration={0.5}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
              Your AI-Powered DSA Journey Starts Here
            </h1>
          </BoxReveal>

          <BoxReveal boxColor="#000" duration={0.5}>
            <p className="text-base md:text-lg text-muted-foreground">
              Enhance your problem-solving skills with personalized AI assistance.
            </p>
          </BoxReveal>

          <BoxReveal boxColor="#000" duration={0.5}>
            <p className="text-sm md:text-lg text-muted-foreground space-y-1">
              → Understand problems deeply<br />
              → Get guided solution steps<br />
              → Learn optimal approaches
            </p>
          </BoxReveal>

          <BoxReveal boxColor="#000" duration={0.5}>
            <div className="hidden sm:block">
              <TypingTopics />
            </div>
          </BoxReveal>

          <BoxReveal boxColor="#000" duration={0.5}>
            <div className="pt-2 md:pt-4">
              <Link href="/auth/register">
                <RainbowButton>Get Started</RainbowButton>
              </Link>
            </div>
          </BoxReveal>
        </div>
      </motion.div>

      <div className="flex-1 w-full lg:w-auto">
        <div className="hidden lg:block">
          <LanguagesOrbit />
        </div>
        <div className="lg:hidden flex justify-center">
          <div className="text-center">
            <div className="text-4xl md:text-6xl font-bold text-primary mb-4">
              DSA
            </div>
            <div className="text-sm md:text-base text-muted-foreground">
              Master Data Structures & Algorithms
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
