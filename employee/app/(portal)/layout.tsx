import type { ReactNode } from "react";
import { Portal } from "../../components/portal";
export interface PortalLayoutProps {
  children: ReactNode;
}
export default function PortalLayout({
  children,
}: PortalLayoutProps): ReactNode {
  return <Portal>{children}</Portal>;
}
