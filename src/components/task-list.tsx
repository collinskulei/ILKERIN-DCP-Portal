"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTask, setTaskStatus } from "@/app/actions/tasks";

export type TaskItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

export function TaskList({
  applicationId,
  tasks,
  locked,
}: {
  applicationId: string;
  tasks: TaskItem[];
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await addTask(applicationId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function toggle(taskId: string, currentStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskStatus(taskId, applicationId, currentStatus === "done" ? "open" : "done");
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      {tasks.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-2 text-zinc-700">
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  disabled={locked || pending}
                  onChange={() => toggle(task.id, task.status)}
                />
                <span className={task.status === "done" ? "text-zinc-400 line-through" : ""}>
                  {task.title}
                </span>
              </label>
              <span className="text-xs text-zinc-500">{task.due_date ?? "no due date"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No tasks yet.</p>
      )}

      {!locked && (
        <form ref={formRef} onSubmit={handleAdd} className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
          <input
            name="title"
            placeholder="New task"
            required
            className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
          />
          <input
            name="dueDate"
            type="date"
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
