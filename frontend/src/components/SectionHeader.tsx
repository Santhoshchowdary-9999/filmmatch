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
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-2 border-b border-white/[0.06]">
      <div>
        <div className="flex items-center space-x-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            {title}
          </h2>
          {badgeText && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1.5 font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {(action || children) && (
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {action || children}
        </div>
      )}
    </div>
  );
};
