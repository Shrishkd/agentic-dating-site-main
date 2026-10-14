"use client";

import React, { useState } from "react";

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, photoUrl, size = "md", className = "" }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-7 h-7 text-[11px]",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl",
  }[size];

  const roundedClasses = size === "xl" ? "rounded-2xl" : size === "lg" ? "rounded-xl" : "rounded-full";

  // Use proxy if URL is external
  const proxiedUrl =
    photoUrl && photoUrl.startsWith("http")
      ? `/api/image-proxy?url=${encodeURIComponent(photoUrl)}`
      : photoUrl;

  return (
    <div
      className={`${sizeClasses} ${roundedClasses} bg-gradient-to-tr from-rose-500 to-pink-500 p-0.5 shadow-md shadow-rose-500/20 flex-shrink-0 relative overflow-hidden ${className}`}
    >
      {proxiedUrl && !imageError ? (
        <img
          src={proxiedUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${roundedClasses}`}
        />
      ) : (
        <div
          className={`w-full h-full bg-[#131722] ${roundedClasses} flex items-center justify-center text-rose-300 font-bold`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
