import { notFound } from "next/navigation";
import { EmployeePage } from "../../../components/portal";
import type { OperationsModule } from "@cruisin/operations-ui";
export interface PageProps {
  params: Promise<{ module: string }>;
}
export default async function Page({ params }: PageProps) {
  const { module } = await params;
  if (
    ![
      "tasks",
      "orders",
      "inventory",
      "units",
      "exceptions",
      "scanner",
      "sops",
      "approvals",
      "activity",
      "profile",
      "media",
    ].includes(module)
  )
    notFound();
  return <EmployeePage module={module as OperationsModule} />;
}
