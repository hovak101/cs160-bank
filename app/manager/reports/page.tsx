"use client";

import { ReportContent } from "@/components/reports/report-content";

export default function ManagerReportsPage() {
  return (
    <ReportContent
      backHref="/manager/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
