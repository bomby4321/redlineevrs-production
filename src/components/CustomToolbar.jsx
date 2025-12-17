import React from "react";

export default function CustomToolbar({ label, onNavigate }) {
  return (
    <div className="flex flex-col items-center mb-4 px-2 py-2 bg-gray-800 rounded-xl shadow-sm border border-gray-700">
      
      {/* Top row: prev, today, next */}
      <div className="flex items-center justify-center gap-4 w-full">
        <button
          onClick={() => onNavigate("PREV")}
          className="p-2 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-bold transition"
        >
          ←
        </button>

        <button
          onClick={() => onNavigate("TODAY")}
          className="px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition"
        >
          Today
        </button>

        <button
          onClick={() => onNavigate("NEXT")}
          className="p-2 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-bold transition"
        >
          →
        </button>
      </div>

      {/* Bottom row: Date label */}
      <div className="mt-2 text-lg font-bold text-gray-300 text-center">
        {label}
      </div>
    </div>
  );
}
