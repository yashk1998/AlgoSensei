/**
 * @dev Footer component for the application
 * Features: responsive layout, clean design
 */

"use client";
import React from 'react';

/**
 * @dev Main footer component that displays site information
 */
const Footer = () => {
  return (
    <footer className="mt-188px w-full border-t">
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
          {/* Left side */}
          <div className="w-full md:w-auto">
            <div className="text-gray-500 text-xs mb-4 pt-1 pb-1 pl-3 pr-3 bg-slate-100 max-w-[200px] text-center">
              Free Open source AI template
            </div>
            <div className="text-black mb-4 text-xl md:text-2xl font-bold font-sans">
              Build your own AI DSA Tutor
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/yashk1998/dsa-gpt/fork"
                className="bg-black text-white px-3 py-2 md:px-4 md:py-2 rounded-md hover:bg-gray-800 transition-colors text-xs"
              >
                Fork and Build Your Own
              </a>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
            {/* Made with love section */}
            <div className="flex items-center gap-2 pt-4 md:pt-8">
              <span className="text-gray-600 font-sans text-sm md:text-base">MADE WITH</span>
              <span className="text-black text-lg md:text-xl font-sans">♥</span>
              <span className="text-gray-600 font-sans text-sm md:text-base">FOR</span>
              <span className="text-lg md:text-xl font-semibold ml-2 leading-none font-sans">
                Developers
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;