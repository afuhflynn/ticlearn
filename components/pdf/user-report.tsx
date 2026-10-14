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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  notesCount: number;
  quizzesCount: number;
  attemptsCount: number;
}

interface UserReportProps {
  users: UserData[];
  title?: string;
  subtitle?: string;
}

const columns = [
  { key: "name", label: "Name", width: 80 },
  { key: "email", label: "Email", width: 100 },
  { key: "role", label: "Role", width: 50 },
  { key: "notes", label: "Notes", width: 40 },
  { key: "quizzes", label: "Quizzes", width: 50 },
  { key: "attempts", label: "Attempts", width: 50 },
  { key: "joined", label: "Joined", width: 60 },
];

export const UserReport: React.FC<UserReportProps> = ({
  users,
  title = "User Report",
  subtitle = "List of all registered users",
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PDFHeader title={title} subtitle={subtitle} />

      <View style={styles.section}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{users.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Notes</Text>
            <Text style={styles.statValue}>
              {users.reduce((sum, u) => sum + u.notesCount, 0)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Quizzes</Text>
            <Text style={styles.statValue}>
              {users.reduce((sum, u) => sum + u.quizzesCount, 0)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Attempts</Text>
            <Text style={styles.statValue}>
              {users.reduce((sum, u) => sum + u.attemptsCount, 0)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <PDFTableHeader columns={columns} />
        {users.map((user, index) => (
          <PDFTableRow
            key={user.id}
            index={index}
            columns={columns}
            data={{
              name: user.name || "N/A",
              email: user.email,
              role: user.role,
              notes: user.notesCount.toString(),
              quizzes: user.quizzesCount.toString(),
              attempts: user.attemptsCount.toString(),
              joined: formatDate(user.createdAt),
            }}
          />
        ))}
      </View>

      <PDFFooter total={users.length} />
    </Page>
  </Document>
);
