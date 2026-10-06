"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badgeText?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  action,
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-surface-2 border border-white/[0.07]">
            <Icon className="w-4 h-4 text-[#A8A5A0]" />
          </div>
        )}
        <h2
          className="font-display text-2xl sm:text-3xl font-black text-warm-white tracking-tight"
          style={{ fontFamily: "Outfit, Inter, sans-serif" }}
        >
          {title}
        </h2>
        {badgeText && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-2 text-[#5C5A58] border border-white/[0.06]">
            {badgeText}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-[#5C5A58] mt-1.5 font-normal max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
    {(action || children) && (
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        {action || children}
      </div>
    )}
  </div>
);
