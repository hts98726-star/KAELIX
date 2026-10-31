import { Dashboard } from "@/components/dashboard/dashboard";
import { mockDashboardData } from "@/lib/dashboard/mock-data";

export default function Home() {
  // Integration point: replace the fixture with your team's dashboard API response.
  return <Dashboard data={mockDashboardData} />;
}
