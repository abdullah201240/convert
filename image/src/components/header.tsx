"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";

export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Sync with root class list
    const isDark = document.documentElement.classList.contains("dark") || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const frameId = requestAnimationFrame(() => {
      setTheme(isDark ? "dark" : "light");
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  return (
    <header className="w-full flex items-center justify-between py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-md shadow-brand-primary/10">
          <Sparkles className="w-5 h-5 fill-current" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm md:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
            OpticConvert
          </h1>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            Image Engine
          </span>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-150 dark:hover:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-all duration-200"
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
      </button>
    </header>
  );
}
