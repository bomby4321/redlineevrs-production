import React, { useId } from "react";

export default function FloatingInput({
  label,
  type,
  value,
  onChange,
  placeholder = "",
  required = false,
  className = "",
  id,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const isFilled = value !== null && value !== undefined && value !== "";


  return (
    <div className="relative w-full">
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`
          peer w-full p-4 text-lg border border-gray-300 rounded-lg 
          bg-transparent text-white focus:outline-none
          focus:ring-2 focus:ring-[var(--accent-color)]
          placeholder-transparent
        `}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className={`
          absolute left-4 text-gray-400 transition-all duration-200
          ${isFilled ? "top-1 text-xs text-[var(--accent-color)]" : "top-4 text-lg"}
          peer-focus:top-1 peer-focus:text-xs peer-focus:text-[var(--accent-color)]
        `}
      >
        {label}
      </label>
    </div>
  );
}

