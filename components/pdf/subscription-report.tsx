import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import {
  formatCurrency,
  formatDate,
  PDFFooter,
  PDFHeader,
  PDFTableHeader,
  PDFTableRow,
  styles,
} from "./styles";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  user: { name: string; email: string };
}

interface SubscriptionReportProps {
  subscriptions: SubscriptionData[];
  title?: string;
  subtitle?: string;
}

const columns = [
  { key: "user", label: "User", width: 80 },
  { key: "plan", label: "Plan", width: 60 },
  { key: "status", label: "Status", width: 60 },
  { key: "amount", label: "Amount", width: 60 },
  { key: "startDate", label: "Start Date", width: 70 },
  { key: "endDate", label: "End Date", width: 70 },
];

export const SubscriptionReport: React.FC<SubscriptionReportProps> = ({
  subscriptions,
  title = "Subscription Report",
  subtitle = "Active and historical subscriptions",
}) => {
  const totalRevenue = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader title={title} subtitle={subtitle} />
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Subscriptions</Text>
              <Text style={styles.statValue}>{subscriptions.length}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={styles.statValue}>
                {subscriptions.filter((s) => s.status === "ACTIVE").length}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>
                {formatCurrency(totalRevenue)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Canceled</Text>
              <Text style={styles.statValue}>
                {subscriptions.filter((s) => s.status === "CANCELED").length}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.table}>
          <PDFTableHeader columns={columns} />
          {subscriptions.map((sub, index) => (
            <PDFTableRow
              key={sub.id}
              index={index}
              columns={columns}
              data={{
                user: sub.user?.name || "Unknown",
                plan: sub.plan || "FREE",
                status: sub.status || "PENDING",
                amount: sub.amount ? formatCurrency(sub.amount) : "Free",
                startDate: sub.startDate ? formatDate(sub.startDate) : "-",
                endDate: sub.endDate ? formatDate(sub.endDate) : "Ongoing",
              }}
            />
          ))}
        </View>
        <PDFFooter total={subscriptions.length} />
      </Page>
    </Document>
  );
};
