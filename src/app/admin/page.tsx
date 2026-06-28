import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminPanel } from "@/components/admin/AdminPanel";

// Sin sesión válida no mostramos el panel: redirigimos al formulario de acceso.
// (La protección por middleware no aplica con `app` dentro de `src/`, así que
// el guardado se hace aquí, en el propio servidor.)
export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login?next=/admin");
  }
  return <AdminPanel />;
}
