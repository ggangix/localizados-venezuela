"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="text-center text-slate-600">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}