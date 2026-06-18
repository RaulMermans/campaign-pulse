import type { Campaign, Newsletter, SegmentPerformance } from "@/lib/newsletterTypes";
import {
  calculateClickRate,
  calculateClickToOpenRate,
  calculateOpenRate,
  calculateRevenuePerRecipient,
  calculateUnsubscribeRate,
  getSendDay
} from "@/lib/newsletterMetrics";
import { getNewsletterDetailInsight, getNewsletterSpecificInsights } from "@/lib/newsletterInsights";
import { getNewsletterSaturation } from "@/lib/newsletterSaturation";
import { formatCurrency, formatCurrencyPrecise, formatDateTime, formatNumber, formatPercent } from "@/lib/formatters";
import { CampaignColorTag } from "./CampaignColorTag";
import { StatusBadge } from "./StatusBadge";

interface NewsletterDetailDrawerProps {
  newsletter: Newsletter | null;
  newsletters: Newsletter[];
  campaigns: Campaign[];
  onClose: () => void;
}

export function NewsletterDetailDrawer({ newsletter, newsletters, campaigns, onClose }: NewsletterDetailDrawerProps) {
  const isOpen = Boolean(newsletter);
  const campaignColor = newsletter ? campaigns.find((campaign) => campaign.id === newsletter.campaign.id)?.color ?? "#78716c" : "#78716c";
  const saturation = newsletter ? getNewsletterSaturation(newsletter, newsletters) : null;
  const detailInsight = newsletter ? getNewsletterDetailInsight(newsletter, newsletters) : null;
  const newsletterInsights = newsletter ? getNewsletterSpecificInsights(newsletter, newsletters) : [];

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isOpen}>
      <button
        type="button"
        aria-label="Close newsletter detail drawer"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-ink/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[720px] flex-col border-l border-line bg-card shadow-[0_24px_80px_rgba(23,20,17,0.22)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={newsletter ? `${newsletter.name} details` : "Newsletter details"}
      >
        {newsletter ? (
          <>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink/15 bg-white/95 px-5 py-3 shadow-sm backdrop-blur md:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CampaignColorTag color={campaignColor} label={newsletter.campaign.name} type={newsletter.campaign.stage} />
                  <StatusBadge level={saturation?.saturationLevel ?? "healthy"} />
                </div>
                <h2 className="mt-2 truncate text-xl font-semibold tracking-normal text-ink md:text-2xl">{newsletter.name}</h2>
                <p className="mt-1 line-clamp-1 text-sm leading-6 text-muted">{newsletter.title}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 md:px-6">
              {detailInsight ? (
                <section className="overflow-hidden rounded-xl border border-ink/80 bg-white shadow-sm">
                  <div className="bg-ink px-5 py-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">Main read</p>
                    <h3 className="mt-2 text-xl font-semibold leading-7">{detailInsight.summary}</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-6 text-muted">{detailInsight.performanceRead}</p>
                    <div className="mt-4 rounded-lg border border-line bg-[#f7f8f3] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Recommended next move</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-ink">{detailInsight.recommendation}</p>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailBlock label="Sent" value={formatDateTime(newsletter.timing.sentAt)} note={`${newsletter.timing.timezone} / ${getSendDay(newsletter)}`} />
                <DetailBlock label="Sender" value={newsletter.content.senderName} note={newsletter.content.contentType.replaceAll("_", " ")} />
              </section>

              <section className="mt-5 rounded-xl border border-line bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Creative read</p>
                <h3 className="mt-3 text-lg font-semibold leading-6 text-ink">{newsletter.content.subjectLine}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{newsletter.content.previewText}</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <MiniFact label="Angle" value={newsletter.content.creativeAngle} />
                  <MiniFact label="Offer focus" value={newsletter.offer.productFocus} />
                  <MiniFact label="Business goal" value={newsletter.offer.businessGoal} />
                  <MiniFact label="CTA" value={newsletter.content.ctaLabel} />
                </div>
              </section>

              <section className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Evidence strip</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="OR" value={formatPercent(calculateOpenRate(newsletter))} />
                  <Metric label="CTOR" value={formatPercent(calculateClickToOpenRate(newsletter))} />
                  <Metric label="Revenue" value={formatCurrency(newsletter.metrics.revenue, newsletter.metrics.currency)} />
                  <Metric label="RPR" value={formatCurrencyPrecise(calculateRevenuePerRecipient(newsletter), newsletter.metrics.currency)} />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {formatNumber(newsletter.metrics.delivered)} delivered from {formatNumber(newsletter.metrics.sent)} sent; {formatPercent(calculateClickRate(newsletter))} CTR and {formatPercent(calculateUnsubscribeRate(newsletter))} unsubscribe rate.
                </p>
              </section>

              {detailInsight?.segmentNotes.length ? (
                <section className="mt-5 rounded-xl border border-line bg-slate-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Segment read</p>
                  <div className="mt-4 space-y-2">
                    {detailInsight.segmentNotes.map((note) => (
                      <p key={note} className="rounded-lg border border-line bg-card px-3 py-2 text-xs leading-5 text-muted">{note}</p>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-5 overflow-hidden rounded-xl border border-line">
                <div className="border-b border-line bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Segment performance</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs uppercase tracking-[0.14em] text-muted">
                      <tr>
                        <th className="px-4 py-3">Segment</th>
                        <th className="px-4 py-3">OR</th>
                        <th className="px-4 py-3">CTR</th>
                        <th className="px-4 py-3">Revenue</th>
                        <th className="px-4 py-3">Unsubs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-card">
                      {newsletter.segmentPerformance.map((segment) => (
                        <SegmentRow key={segment.segmentId} segment={segment} currency={newsletter.metrics.currency} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-5 rounded-xl border border-ink/30 bg-[#f7f8f3] p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Saturation diagnosis</p>
                  <StatusBadge level={saturation?.saturationLevel ?? "healthy"} />
                </div>
                <h3 className="mt-3 text-lg font-semibold leading-7 text-ink">{detailInsight?.saturationDiagnosis ?? saturation?.diagnosis}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Pressure evidence: {saturation?.sendPressure7d ?? 0} sends in 7 days, {saturation?.sendPressure14d ?? 0} in 14 days, trend {saturation?.performanceTrend ?? "stable"}.
                </p>
                {saturation?.fatigueSignals.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {saturation.fatigueSignals.map((signal) => (
                      <span key={signal} className="rounded-md border border-line bg-card px-2.5 py-1 text-xs font-medium text-muted">
                        {signal.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Action Plan</p>
                {newsletterInsights.filter((insight) => insight.type !== "newsletter_detail").map((insight) => (
                  <article key={`${insight.type}-${insight.title}`} className="rounded-xl border border-line bg-slate-50/80 p-4">
                    <div className="mb-3">
                      <StatusBadge severity={insight.severity} />
                    </div>
                    <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{insight.message}</p>
                    <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">Recommendation: {insight.recommendation}</p>
                  </article>
                ))}
                {newsletterInsights.filter((insight) => insight.type !== "newsletter_detail").length === 0 ? (
                  <p className="rounded-xl border border-line bg-slate-50/80 p-4 text-sm leading-6 text-muted">
                    No extra warning is active. Use the recommended next move above and keep the full metrics as supporting evidence.
                  </p>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function DetailBlock({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{note}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-medium capitalize text-ink">{value.replaceAll("_", " ")}</p>
    </div>
  );
}

function SegmentRow({ segment, currency }: { segment: SegmentPerformance; currency: string }) {
  const openRate = segment.delivered ? segment.uniqueOpens / segment.delivered : 0;
  const clickRate = segment.delivered ? segment.uniqueClicks / segment.delivered : 0;

  return (
    <tr>
      <td className="min-w-[180px] px-4 py-3 font-medium text-ink">{segment.segmentName}</td>
      <td className="px-4 py-3 text-muted">{formatPercent(openRate)}</td>
      <td className="px-4 py-3 text-muted">{formatPercent(clickRate)}</td>
      <td className="px-4 py-3 font-medium text-ink">{formatCurrency(segment.revenue, currency)}</td>
      <td className="px-4 py-3 text-muted">{segment.unsubscribes}</td>
    </tr>
  );
}
