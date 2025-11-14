import { AchievementsGrid } from "@/components/gamification/AchievementsGrid";
import { ToastProvider } from "@/components/providers";

export const metadata = {
  title: "Achievements | Gamification Dashboard",
  description: "View and track your achievements",
};

export default function AchievementsPage() {
  return (
    <ToastProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Your Achievements
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your progress and unlock new achievements as you complete tasks
            and reach milestones.
          </p>
        </div>
        <AchievementsGrid />
      </div>
    </ToastProvider>
  );
}
