import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import {
  formatDate,
  PDFFooter,
  PDFHeader,
  PDFTableHeader,
  PDFTableRow,
  styles,
} from "./styles";

interface FeedbackData {
  id: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface FeedbackReportProps {
  feedbacks: FeedbackData[];
  title?: string;
  subtitle?: string;
}

const columns = [
  { key: "user", label: "User", width: 80 },
  { key: "type", label: "Type", width: 60 },
  { key: "status", label: "Status", width: 60 },
  { key: "content", label: "Content", width: 180 },
  { key: "date", label: "Date", width: 70 },
];

export const FeedbackReport: React.FC<FeedbackReportProps> = ({
  feedbacks,
  title = "Feedback Report",
  subtitle = "User feedback and ratings",
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFHeader title={title} subtitle={subtitle} />
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Feedback</Text>
            <Text style={styles.statValue}>{feedbacks.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Open</Text>
            <Text style={styles.statValue}>
              {feedbacks.filter((f) => f.status === "OPEN").length}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Resolved</Text>
            <Text style={styles.statValue}>
              {feedbacks.filter((f) => f.status === "RESOLVED").length}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.table}>
        <PDFTableHeader columns={columns} />
        {feedbacks.map((fb, index) => (
          <PDFTableRow
            key={fb.id}
            index={index}
            columns={columns}
            data={{
              user: fb.user?.name || "Unknown",
              type: fb.type || "N/A",
              status: fb.status || "OPEN",
              content:
                (fb.content || "").slice(0, 50) +
                (fb.content?.length > 50 ? "..." : ""),
              date: formatDate(fb.createdAt),
            }}
          />
        ))}
      </View>
      <PDFFooter total={feedbacks.length} />
    </Page>
  </Document>
);
