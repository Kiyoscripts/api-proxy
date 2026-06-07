import { UsersTable } from "@/components/users/users-table";
import { requireAdmin } from "@/lib/auth";

export default async function UsersPage() {
  await requireAdmin();
  return (
    <section>
      <div className="section-title">
        <h1>用户管理</h1>
        <p>管理控制台用户与角色，角色包括超级管理员、管理员和用户。</p>
      </div>
      <UsersTable />
    </section>
  );
}
