import type { CampaignTemplate } from "@/lib/templates/campaign-templates";

export default function TemplateVisual({
  template,
  compact = false,
}: {
  template: CampaignTemplate;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 font-mono text-xs ${
        compact ? "h-36" : "min-h-[220px]"
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <span className="text-[11px] font-semibold text-cyan-400">
          Trigger: &ldquo;{template.triggerExample}&rdquo;
        </span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
          {template.setupMinutes}m setup
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-lg bg-white/5 p-2 text-zinc-300 border border-white/5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans mb-1">
            Automated Reply
          </p>
          <p className="text-xs text-white/90 line-clamp-3 font-sans">
            {template.privateReplyPreview}
          </p>
        </div>
      </div>
    </div>
  );
}
