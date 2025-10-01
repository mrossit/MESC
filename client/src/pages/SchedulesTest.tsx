import { Layout } from "@/components/layout";
import { getMassTimesForDate } from "@shared/constants";

export default function SchedulesTest() {
  const testDate = new Date('2025-10-01');
  const massTimes = getMassTimesForDate(testDate);

  return (
    <Layout title="Test Schedules">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Schedule Component Test</h1>
        <p className="mt-4">If you see this, the component loads correctly!</p>

        <div className="mt-4">
          <h2 className="font-semibold">Test getMassTimesForDate:</h2>
          <p>Date: {testDate.toDateString()}</p>
          <p>Mass Times: {JSON.stringify(massTimes)}</p>
        </div>
      </div>
    </Layout>
  );
}
