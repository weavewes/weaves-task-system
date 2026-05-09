with open('task-api/app/routes/tasks.py', 'r') as f:
    content = f.read()

old = """        # ── DEPENDENCY UNBLOCK ──
        # Find all tasks that depend on this one and check if they should unblock
        if new_status == "COMPLETADA":
            dependent_rows = await conn.fetch(
                """
                SELECT td.task_id, td.depends_on_task_id, td.is_required
                FROM task_dependencies td
                JOIN tasks t ON t.id = td.task_id
                WHERE td.depends_on_task_id = $1 AND td.is_required = TRUE
                  AND t.status = 'BLOQUEADA'
                """,
                task_id
            )
            for drow in dependent_rows:
                dep_task_id = drow["task_id"]
                # Verify ALL required dependencies of this dependent task are COMPLETADA
                required_deps = await conn.fetch(
                    """
                    SELECT COUNT(*) as total,
                           COUNT(CASE WHEN dep.status = 'COMPLETADA' THEN 1 END) as completed
                    FROM task_dependencies td
                    JOIN tasks dep ON dep.id = td.depends_on_task_id
                    WHERE td.task_id = $1 AND td.is_required = TRUE
                    """,
                    dep_task_id
                )
                r = required_deps[0]
                if r["total"] == r["completed"]:
                    # All deps done → unblock
                    await conn.execute(
                        "UPDATE tasks SET status = 'PENDIENTE', blocked_reason = NULL, "
                        "updated_at = NOW() WHERE id = $1",
                        dep_task_id
                    )
                    await register_event(
                        conn, dep_task_id, "TASK_UNBLOCKED", "BLOQUEADA", "PENDIENTE",
                        f"Task unblocked — all required dependencies completed (task {task_id} done)",
                        member_id
                    )"""

new = """        # ── DEPENDENCY UNBLOCK ──
        # Find all tasks that depend on this one and check if they should unblock
        if new_status == "COMPLETADA":
            print(f"[UNBLOCK] Starting unblock for task_id={task_id}, new_status={new_status}")
            dependent_rows = await conn.fetch(
                """
                SELECT td.task_id, td.depends_on_task_id, td.is_required
                FROM task_dependencies td
                JOIN tasks t ON t.id = td.task_id
                WHERE td.depends_on_task_id = $1 AND td.is_required = TRUE
                  AND t.status = 'BLOQUEADA'
                """,
                task_id
            )
            print(f"[UNBLOCK] Found {len(dependent_rows)} dependent tasks: {[dict(r) for r in dependent_rows]}")
            for drow in dependent_rows:
                dep_task_id = drow["task_id"]
                # Verify ALL required dependencies of this dependent task are COMPLETADA
                required_deps = await conn.fetch(
                    """
                    SELECT COUNT(*) as total,
                           COUNT(CASE WHEN dep.status = 'COMPLETADA' THEN 1 END) as completed
                    FROM task_dependencies td
                    JOIN tasks dep ON dep.id = td.depends_on_task_id
                    WHERE td.task_id = $1 AND td.is_required = TRUE
                    """,
                    dep_task_id
                )
                r = required_deps[0]
                print(f"[UNBLOCK] Task {dep_task_id}: total={r['total']}, completed={r['completed']}")
                if r["total"] == r["completed"]:
                    print(f"[UNBLOCK] Unblocking task {dep_task_id}")
                    # All deps done → unblock
                    await conn.execute(
                        "UPDATE tasks SET status = 'PENDIENTE', blocked_reason = NULL, "
                        "updated_at = NOW() WHERE id = $1",
                        dep_task_id
                    )
                    await register_event(
                        conn, dep_task_id, "TASK_UNBLOCKED", "BLOQUEADA", "PENDIENTE",
                        f"Task unblocked — all required dependencies completed (task {task_id} done)",
                        member_id
                    )
                else:
                    print(f"[UNBLOCK] NOT unblocking task {dep_task_id} (deps not complete)")"""

if old in content:
    content = content.replace(old, new)
    with open('task-api/app/routes/tasks.py', 'w') as f:
        f.write(content)
    print("Debug prints added successfully")
else:
    print("Pattern not found")
    if "DEPENDENCY UNBLOCK" in content:
        print("DEPENDENCY UNBLOCK found")
    else:
        print("DEPENDENCY UNBLOCK NOT found")
