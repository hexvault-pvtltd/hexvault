import { db } from "@core/lib/db";

export class TaskDependencyError extends Error {
  constructor(public code: "TASK_NOT_FOUND" | "PROJECT_MISMATCH" | "DEPENDENCY_CYCLE" | "DEPENDENCY_EXISTS" | "DEPENDENCY_NOT_FOUND") { super(code); }
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string, actorId: string) {
  if (taskId === dependsOnTaskId) throw new TaskDependencyError("DEPENDENCY_CYCLE");
  return db.$transaction(async tx => {
    const tasks = await tx.task.findMany({ where: { id: { in: [taskId, dependsOnTaskId] } }, select: { id: true, projectId: true } });
    if (tasks.length !== 2) throw new TaskDependencyError("TASK_NOT_FOUND");
    if (tasks[0].projectId !== tasks[1].projectId) throw new TaskDependencyError("PROJECT_MISMATCH");
    await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Task" WHERE "id" IN (${taskId}::uuid, ${dependsOnTaskId}::uuid) ORDER BY "id" FOR UPDATE`;
    const [result] = await tx.$queryRaw<Array<{ cycle: boolean }>>`
      WITH RECURSIVE dependency_path(id) AS (
        SELECT "dependsOnTaskId" FROM "TaskDependency" WHERE "taskId" = ${dependsOnTaskId}::uuid
        UNION
        SELECT dependency."dependsOnTaskId" FROM "TaskDependency" AS dependency
        INNER JOIN dependency_path AS path ON dependency."taskId" = path.id
      )
      SELECT EXISTS(SELECT 1 FROM dependency_path WHERE id = ${taskId}::uuid) AS cycle
    `;
    if (result.cycle) throw new TaskDependencyError("DEPENDENCY_CYCLE");
    const dependency = await tx.taskDependency.create({ data: { taskId, dependsOnTaskId } });
    await tx.auditLog.create({ data: { actorId, action: "task.dependency_added", resourceType: "task", resourceId: taskId, metadata: { dependsOnTaskId } } });
    return dependency;
  });
}

export async function removeTaskDependency(taskId: string, dependsOnTaskId: string, actorId: string) {
  const existing = await db.taskDependency.findUnique({ where: { taskId_dependsOnTaskId: { taskId, dependsOnTaskId } } });
  if (!existing) throw new TaskDependencyError("DEPENDENCY_NOT_FOUND");
  await db.$transaction(async tx => {
    await tx.taskDependency.delete({ where: { id: existing.id } });
    await tx.auditLog.create({ data: { actorId, action: "task.dependency_removed", resourceType: "task", resourceId: taskId, metadata: { dependsOnTaskId } } });
  });
}
