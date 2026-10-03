import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalAdmin } from "./portal";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <PortalAdmin>{children}</PortalAdmin>;
}
