import React, { useState } from "react";
import { US_STATES } from "../utils/constants"; // adjust path if needed
import FloatingInput from "./FloatingInput"; // make sure this path is correct

const StateAutocomplete = ({ value, onChange }) => {
    const [query, setQuery] = useState(value || "");
    const [open, setOpen] = useState(false);

    const filtered = US_STATES.filter(
      s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.abbr.toLowerCase().includes(query.toLowerCase())
    );

    return (
      <div className="relative">
        <FloatingInput
          type="text"
          label="State"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />

        {open && query.length > 0 && (
          <ul className="absolute left-0 right-0 bg-[var(--card-bg)] border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto z-20">
            {filtered.map((s) => (
              <li
                key={s.abbr}
                className="p-2 hover:bg-[var(--accent-color)] hover:text-white cursor-pointer"
                onClick={() => {
                  setQuery(s.abbr);   // show abbreviation in the field
                  onChange(s.abbr);  // save abbreviation internally
                  setOpen(false);
                }}
              >
                {s.name} ({s.abbr})
              </li>
            ))}

            {filtered.length === 0 && (
              <li className="p-2 text-gray-400">No matches</li>
            )}
          </ul>
        )}
      </div>
    );
  };

  export default StateAutocomplete;