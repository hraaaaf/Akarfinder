"use client";

import { useId, useState } from "react";

const COLLAPSIBLE_DESCRIPTION_LENGTH = 320;

export function ExpandablePropertyDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const collapsible = description.trim().length > COLLAPSIBLE_DESCRIPTION_LENGTH;

  return (
    <div>
      <p
        id={contentId}
        data-property-description
        className="whitespace-pre-line text-[14.5px] leading-7 text-slate-600"
        style={
          collapsible && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {description}
      </p>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex min-h-11 items-center text-[13px] font-extrabold text-[#0B63CE] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2"
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      ) : null}
    </div>
  );
}
