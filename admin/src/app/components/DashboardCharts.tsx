"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#2F6FE4", "#0B0B0D"];

export interface DashboardData {
  totalRevenueToday: number;
  digitalRevenue: number;
  cashRevenue: number;
  revenueByFareBand: Array<{
    id: string;
    label: string;
    distanceLabel: string;
    revenue: number;
  }>;
}

export function DashboardCharts({
  type,
  data,
}: {
  type: "revenue" | "split";
  data: DashboardData;
}) {

  if (type === "revenue") {
    const chartData = data.revenueByFareBand;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#DDDEE2" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B6B72" }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B6B72" }} />
          <Tooltip
            cursor={{ fill: "#EFEFF1" }}
            contentStyle={{ borderRadius: "10px", border: "1px solid #DDDEE2", boxShadow: "none" }}
          />
          <Bar dataKey="revenue" fill="#0B0B0D" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const pieData = [
    { name: "Digital (NFC)", value: data.digitalRevenue },
    { name: "Cash", value: data.cashRevenue },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
          {pieData.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #DDDEE2", boxShadow: "none" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
