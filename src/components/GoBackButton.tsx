import Link from "next/link";

export interface GoBackButtonProps {
  route: string;
}

export function GoBackButton({ route }: GoBackButtonProps) {
  return (
    <Link
      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      href={route}
    >
      Regresar
    </Link>
  );
}
