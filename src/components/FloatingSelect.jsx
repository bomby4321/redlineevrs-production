import React, { useId } from "react";

export default function FloatingSelect({ id, label, value, onChange, options = [] }) {

    const generatedId = useId();
    const inputId = id || generatedId;

    const isFilled = value !== null && value !== undefined && value !== "";
    
  return (
    <div className="relative w-full">
      <select
        id={inputId}
        value={value}
        onChange={onChange}
        required
        className={`
            peer w-full p-4 text-lg border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]
            ${isFilled ? "text-white" : "text-gray-400 bg-transparent"}
            focus:bg-[var(--card-bg)] focus:text-white
        `}
      >
        <option value="" disabled hidden>{label}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      {(isFilled || value !== "") && (
        <label
          htmlFor={inputId}
          className={`
            absolute left-4 transition-all duration-200
            ${isFilled ? "top-1 text-xs" : "top-4 text-lg"}
            text-gray-400
            peer-focus:text-[var(--accent-color)]
          `}
        >
          {label}
        </label>
      )}
    </div>
  );
}
