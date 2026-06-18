// textarea + auto-save
"use client";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { Skeleton } from "./ui/skeleton";
import { Plus } from "lucide-react";

const FocusTasks = ({tasks}: any) => {
  // const [tasks, setTasks] = useState<{ id?: string; text?: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});

  const toggleDone = (id: string, current: boolean) => {
    setDoneOverrides((prev) => ({ ...prev, [id]: !current }));
  };

  if (!tasks) return <Skeleton className="h-[20px] w-[100px] rounded-full" />;

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {tasks && tasks.length > 0 ? (
        tasks.map((task: any, i: number) => {
          const isDone = doneOverrides[task.id] ?? task.done;
          return (
            <div
              key={task?.id ?? i}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggleDone(task.id, isDone)}
                className="size-4 shrink-0 accent-primary"
              />
              <input
                type="text"
                defaultValue={task?.text}
                readOnly
                className={`flex-1 bg-transparent outline-none ${isDone ? "text-muted-foreground line-through" : ""}`}
              />
            </div>
          );
        })
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No tasks yet</div>
      )}
      {tasks && tasks.length < 3 && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <Plus className="size-4" />
          <span>Add a task — max 3</span>
        </div>
      )}
    </div>
  );
};

export default FocusTasks;
