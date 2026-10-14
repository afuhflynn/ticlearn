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

interface AffiliateData {
  id: string;
  code: string;
  status: string;
  commissionRate: number;
  createdAt: string;
  user: { name: string; email: string };
  referralsCount?: number;
}

interface AffiliateReportProps {
  affiliates: AffiliateData[];
  title?: string;
  subtitle?: string;
}

const columns = [
  { key: "user", label: "User", width: 80 },
  { key: "code", label: "Code", width: 60 },
  { key: "status", label: "Status", width: 60 },
  { key: "commission", label: "Commission", width: 70 },
  { key: "referrals", label: "Referrals", width: 60 },
  { key: "joined", label: "Joined", width: 70 },
];

export const AffiliateReport: React.FC<AffiliateReportProps> = ({
  affiliates,
  title = "Affiliate Report",
  subtitle = "Affiliate program overview",
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFHeader title={title} subtitle={subtitle} />
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Affiliates</Text>
            <Text style={styles.statValue}>{affiliates.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>
              {affiliates.filter((a) => a.status === "ACTIVE").length}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>
              {affiliates.filter((a) => a.status === "PENDING").length}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg Commission</Text>
            <Text style={styles.statValue}>
              {(
                affiliates.reduce(
                  (sum, a) => sum + (a.commissionRate || 0),
                  0,
                ) / affiliates.length || 0
              ).toFixed(0)}
              %
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.table}>
        <PDFTableHeader columns={columns} />
        {affiliates.map((aff, index) => (
          <PDFTableRow
            key={aff.id}
            index={index}
            columns={columns}
            data={{
              user: aff.user?.name || "Unknown",
              code: aff.code || "-",
              status: aff.status || "PENDING",
              commission: `${aff.commissionRate || 10}%`,
              referrals: (aff.referralsCount || 0).toString(),
              joined: formatDate(aff.createdAt),
            }}
          />
        ))}
      </View>
      <PDFFooter total={affiliates.length} />
    </Page>
  </Document>
);
