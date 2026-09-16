import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  ClearCompletedTasksResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  DeleteTaskResponse,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toApiTask = (task: typeof tasksTable.$inferSelect) => ({
  id: task.id,
  text: task.text,
  completed: task.completed,
  priority: task.priority,
  dueDate: task.dueDate ?? "",
  createdAt: task.createdAt,
});

router.get("/tasks", async (req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .orderBy(desc(tasksTable.createdAt));

  res.json(ListTasksResponse.parse(tasks.map(toApiTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid task payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      text: parsed.data.text.trim(),
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate || null,
    })
    .returning();

  res.status(201).json(CreateTaskResponse.parse(toApiTask(task)));
});

router.delete("/tasks/completed", async (req, res): Promise<void> => {
  await db.delete(tasksTable).where(eq(tasksTable.completed, true));
  res.status(204).send();
  ClearCompletedTasksResponse.parse(undefined);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    req.log.warn({ errors: params.error.message }, "Invalid task id");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid task update");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({
      ...(parsed.data.text !== undefined ? { text: parsed.data.text.trim() } : {}),
      ...(parsed.data.completed !== undefined ? { completed: parsed.data.completed } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate || null } : {}),
    })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(UpdateTaskResponse.parse(toApiTask(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    req.log.warn({ errors: params.error.message }, "Invalid task id");
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning({ id: tasksTable.id });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  DeleteTaskResponse.parse(undefined);
  res.status(204).send();
});

export default router;