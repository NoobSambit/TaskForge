import TaskList from "@/components/tasks/TaskList";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">Manage your tasks below.</p>
      </div>
      <TaskList />
    </section>
  );
}
