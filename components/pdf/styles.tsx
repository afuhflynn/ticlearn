import React from "react";
import { View, Text, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Plus Jakarta Sans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU79TR_V.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU79TR_V.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU79TR_V.woff2",
      fontWeight: 700,
    },
  ],
});

export const BRAND_COLORS = {
  primary: "#7c3aed",
  primaryLight: "#8b5cf6",
  primaryDark: "#6d28d9",
  gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Plus Jakarta Sans",
    fontSize: 10,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottom: `3px solid ${BRAND_COLORS.primary}`,
    paddingBottom: 20,
    backgroundColor: "#f9fafb",
    padding: 20,
    borderRadius: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoEmoji: { fontSize: 28 },
  logoText: { fontSize: 24, fontWeight: 700, color: BRAND_COLORS.primary },
  title: { fontSize: 20, fontWeight: 700, color: "#1f2937", marginTop: 10 },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  meta: { fontSize: 9, color: "#6b7280", textAlign: "right" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: `2px solid ${BRAND_COLORS.primary}`,
    paddingLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    border: `1px solid ${BRAND_COLORS.primaryLight}40`,
  },
  statLabel: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 700, color: BRAND_COLORS.primary },
  table: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${BRAND_COLORS.primaryLight}40`,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 600,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1px solid #e5e7eb`,
  },
  tableRowEven: { backgroundColor: "#f9fafb" },
  tableCell: { fontSize: 9, color: "#374151" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `2px solid ${BRAND_COLORS.primaryLight}`,
    paddingTop: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  footerText: { fontSize: 8, color: "#6b7280" },
  footerBrand: { fontSize: 8, color: BRAND_COLORS.primary, fontWeight: 600 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  badgeActive: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeInactive: { backgroundColor: "#fee2e2", color: "#991b1b" },
  badgePending: { backgroundColor: "#fef3c7", color: "#92400e" },
  badgeInfo: { backgroundColor: "#dbeafe", color: "#1e40af" },
});

interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  showDate?: boolean;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({
  title,
  subtitle,
  showDate = true,
}) => (
  <View style={styles.header}>
    <View style={styles.headerContent}>
      <View style={styles.logoRow}>
        <Text style={styles.logoEmoji}>🎓</Text>
        <Text style={styles.logoText}>TiCLearn</Text>
      </View>
      {showDate && (
        <View style={styles.meta}>
          <Text>Generated: {new Date().toLocaleDateString()}</Text>
          <Text>Time: {new Date().toLocaleTimeString()}</Text>
        </View>
      )}
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

interface PDFTableHeaderProps {
  columns: { key: string; label: string; width: number }[];
}

export const PDFTableHeader: React.FC<PDFTableHeaderProps> = ({ columns }) => (
  <View style={styles.tableHeader}>
    {columns.map((col) => (
      <Text
        key={col.key}
        style={[styles.tableHeaderCell, { width: col.width }]}
      >
        {col.label}
      </Text>
    ))}
  </View>
);

interface PDFTableRowProps {
  columns: { key: string; label: string; width: number }[];
  data: Record<string, React.ReactNode>;
  index: number;
}

export const PDFTableRow: React.FC<PDFTableRowProps> = ({
  columns,
  data,
  index,
}) => (
  <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : {}]}>
    {columns.map((col) => (
      <Text key={col.key} style={[styles.tableCell, { width: col.width }]}>
        {String(data[col.key] || "-")}
      </Text>
    ))}
  </View>
);

interface PDFFooterProps {
  total: number;
}

export const PDFFooter: React.FC<PDFFooterProps> = ({ total }) => (
  <View style={styles.footer} fixed>
    <View>
      <Text style={styles.footerText}>
        © {new Date().getFullYear()} TiCLearn. All rights reserved.
      </Text>
      <Text style={styles.footerText}>
        Made with ❤️ for Cameroonian students
      </Text>
    </View>
    <View>
      <Text style={styles.footerBrand}>TiCLearn Admin</Text>
      <Text style={styles.footerText}>Page of </Text>
      <Text style={styles.footerText}>Total: {total} records</Text>
    </View>
  </View>
);

export const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "XAF" }).format(
    amount,
  );
export const formatStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (s === "active" || s === "resolved") return styles.badgeActive;
  if (s === "inactive" || s === "closed" || s === "canceled")
    return styles.badgeInactive;
  if (s === "pending" || s === "open") return styles.badgePending;
  return styles.badgeInfo;
};
