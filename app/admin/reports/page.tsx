"use client";

import { ReportContent } from "@/components/reports/report-content";

export default function AdminReportsPage() {
  return (
    <ReportContent
      backHref="/admin/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
