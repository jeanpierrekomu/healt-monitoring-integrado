import type { Metadata } from "next";
import { getUsers } from "@/services/users";
import { AdminView } from "./admin-view";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  return <AdminView initialUsers={await getUsers()} />;
}
