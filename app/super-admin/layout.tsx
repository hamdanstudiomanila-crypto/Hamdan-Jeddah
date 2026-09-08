import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin Portal | Hamdan Studio",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
