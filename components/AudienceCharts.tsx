import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import type { AudienceMapPoint, SegmentCampaignFit, SegmentEngagementTrendPoint, SegmentTrendPoint } from "@/lib/audienceTypes";
import { formatCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/formatters";

interface AudienceMapChartProps {
  points: AudienceMapPoint[];
  selectedSegmentId: string;
  currency: string;
  onSelectSegment: (segmentId: string) => void;
}

interface SegmentTrendChartProps {
  revenueTrend: SegmentTrendPoint[];
  engagementTrend: SegmentEngagementTrendPoint[];
  currency: string;
}

interface CampaignFitChartProps {
  data: SegmentCampaignFit[];
}

export function AudienceMapChart({ points, selectedSegmentId, currency, onSelectSegment }: AudienceMapChartProps) {
  return (
    <div className="h-[350px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 34, right: 96, bottom: 18, left: 8 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="value"
            name="RPR"
            tickFormatter={(value: number) => formatCurrencyPrecise(value, currency)}
            stroke="#667069"
            tick={{ fontSize: 11 }}
          />
          <YAxis type="number" dataKey="pressure" name="Pressure" domain={[0, 100]} stroke="#667069" tick={{ fontSize: 11 }} />
          <ZAxis type="number" dataKey="memberCount" range={[110, 520]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<AudienceMapTooltip currency={currency} />}
          />
          <Scatter
            data={points}
            name="Audience segments"
            onClick={(point: unknown) => {
              const payload = point as Partial<AudienceMapPoint> & { payload?: Partial<AudienceMapPoint> };
              const segmentId = payload.segmentId ?? payload.payload?.segmentId;
              if (segmentId) onSelectSegment(segmentId);
            }}
            isAnimationActive={false}
          >
            {points.map((point) => (
              <Cell key={point.segmentId} fill={point.segmentId === selectedSegmentId ? "#171817" : getDecisionColor(point.decisionLabel)} stroke="#171817" strokeWidth={point.segmentId === selectedSegmentId ? 2 : 0.5} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function AudienceMapTooltip({
  active,
  payload,
  currency
}: {
  active?: boolean;
  payload?: Array<{ payload?: AudienceMapPoint }>;
  currency: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-[220px] rounded-md border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <p className="font-semibold text-ink">{point.name}</p>
      <div className="mt-2 space-y-1 text-muted">
        <p>Decision: <span className="font-medium text-ink">{getDecisionDisplayLabel(point.decisionLabel)}</span></p>
        <p>Pressure: <span className="font-medium text-ink">{point.pressure.toFixed(0)}/100</span></p>
        <p>Revenue per recipient: <span className="font-medium text-ink">{formatCurrencyPrecise(point.value, currency)}</span></p>
      </div>
    </div>
  );
}

export function SegmentTrendChart({ revenueTrend, engagementTrend, currency }: SegmentTrendChartProps) {
  const data = revenueTrend.map((point) => {
    const engagementPoint = engagementTrend.find((candidate) => candidate.newsletterId === point.newsletterId);
    return {
      ...point,
      openRate: engagementPoint?.openRate ?? 0,
      clickToOpenRate: engagementPoint?.clickToOpenRate ?? 0
    };
  });

  return (
    <div className="h-[280px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#667069" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="revenue" stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCurrency(value, currency)} />
          <YAxis yAxisId="rate" orientation="right" stroke="#667069" tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatPercent(value)} />
          <Tooltip
            formatter={(value, name) => {
              const numericValue = Number(value ?? 0);
              const label = String(name);
              if (label === "Revenue") return [formatCurrency(numericValue, currency), name];
              if (label === "Open rate" || label === "CTOR") return [formatPercent(numericValue), name];
              return [value, name];
            }}
            labelFormatter={(label) => `Send on ${label}`}
          />
          <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#171817" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line yAxisId="rate" type="monotone" dataKey="openRate" name="Open rate" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
          <Line yAxisId="rate" type="monotone" dataKey="clickToOpenRate" name="CTOR" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CampaignFitChart({ data }: CampaignFitChartProps) {
  return (
    <div className="h-[260px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 12 }}>
          <CartesianGrid stroke="#e4e8e1" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke="#667069" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="campaignName" width={118} stroke="#667069" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, name) => (String(name) === "Fit score" ? [`${Number(value ?? 0).toFixed(0)}`, name] : [value, name])} />
          <Bar dataKey="fitScore" name="Fit score" radius={[0, 6, 6, 0]}>
            {data.map((item) => (
              <Cell key={item.campaignId} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function getDecisionColor(label: AudienceMapPoint["decisionLabel"]): string {
  if (label === "Protect") return "#059669";
  if (label === "Scale carefully") return "#4f46e5";
  if (label === "Cool down") return "#e11d48";
  if (label === "Rebuild") return "#d97706";
  return "#0891b2";
}

function getDecisionDisplayLabel(label: AudienceMapPoint["decisionLabel"]): string {
  if (label === "Scale carefully") return "Scale";
  if (label === "Rebuild" || label === "Test editorial") return "Repair";
  return label;
}
