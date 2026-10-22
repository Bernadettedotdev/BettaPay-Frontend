"use client";

import { useState } from "react";
import { SDKS, SDK_TYPE_LABELS } from "@/lib/sdks";
import SDKCard from "./SDKCard";
import { SDK_ICONS } from "./icons";

const languages = Array.from(new Set(SDKS.map((sdk) => sdk.language)));

export function SDKCatalog() {
  const [language, setLanguage] = useState("all");
  const [type, setType] = useState("all");
  const filtered = SDKS.filter(
    (sdk) => (language === "all" || sdk.language === language)
      && (type === "all" || sdk.types.some((value) => value === type)),
  );

  return (
    <section aria-label="SDK catalog" className="mb-16 space-y-6">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-lg border bg-background p-2"
          >
            <option value="all">All languages</option>
            {languages.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          SDK type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-lg border bg-background p-2"
          >
            <option value="all">All types</option>
            {Object.entries(SDK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {filtered.length} SDK{filtered.length === 1 ? "" : "s"} found
      </p>
      {filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sdk) => (
            <SDKCard key={sdk.id} {...sdk} icon={SDK_ICONS[sdk.id]} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border p-6 text-center">
          <p>No SDKs match these filters.</p>
          <button
            type="button"
            onClick={() => { setLanguage("all"); setType("all"); }}
            className="mt-3 text-primary underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
