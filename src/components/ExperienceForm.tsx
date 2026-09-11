"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RoleDraft {
  title: string;
  organization: string;
  period: string;
  description: string;
}

const emptyRole: RoleDraft = { title: "", organization: "", period: "", description: "" };

export function ExperienceForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [narrative, setNarrative] = useState("");
  const [roles, setRoles] = useState<RoleDraft[]>([{ ...emptyRole }]);
  const [achievements, setAchievements] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRole(idx: number, field: keyof RoleDraft, value: string) {
    setRoles((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanRoles = roles
        .filter((r) => r.title.trim() && r.organization.trim())
        .map((r) => ({
          title: r.title.trim(),
          organization: r.organization.trim(),
          period: r.period.trim() || undefined,
          description: r.description.trim() || undefined,
        }));
      const cleanAchievements = achievements.map((a) => a.trim()).filter(Boolean);

      const res = await fetch(`/api/session/${sessionId}/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNarrative: narrative,
          roles: cleanRoles,
          achievements: cleanAchievements,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?._errors?.[0] ?? data.error ?? "Failed to save.");
      router.push(`/pipeline/${sessionId}/profile`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="narrative" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tell it in your own words
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          What have you actually built, run, fixed, or shipped? Paste a resume, a bio, or just write
          freely. The more concrete detail, the better the analysis downstream.
        </p>
        <textarea
          id="narrative"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm leading-6 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="e.g. I ran operations for a cross-border payments company for six years. Built the settlement reconciliation process from scratch after we kept losing money to timing mismatches..."
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Roles (optional, but sharpens the Autopsy stage)
          </label>
          <button
            type="button"
            onClick={() => setRoles((prev) => [...prev, { ...emptyRole }])}
            className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + add role
          </button>
        </div>
        {roles.map((role, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-800"
          >
            <input
              value={role.title}
              onChange={(e) => updateRole(idx, "title", e.target.value)}
              placeholder="Title (e.g. Operations Lead)"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              value={role.organization}
              onChange={(e) => updateRole(idx, "organization", e.target.value)}
              placeholder="Organization"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              value={role.period}
              onChange={(e) => updateRole(idx, "period", e.target.value)}
              placeholder="Period (e.g. 2019-2023)"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <textarea
              value={role.description}
              onChange={(e) => updateRole(idx, "description", e.target.value)}
              placeholder="What did this role actually involve?"
              rows={2}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Specific achievements (optional)
          </label>
          <button
            type="button"
            onClick={() => setAchievements((prev) => [...prev, ""])}
            className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + add line
          </button>
        </div>
        {achievements.map((a, idx) => (
          <input
            key={idx}
            value={a}
            onChange={(e) =>
              setAchievements((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
            }
            placeholder="A specific thing you built, fixed, or delivered"
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Anything else worth knowing (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "Saving…" : "Save and generate Profile →"}
        </button>
      </div>
    </form>
  );
}
