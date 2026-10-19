import { AccountMenu } from "@/components/account-menu";
import { AddLineButton } from "@/components/modal";
import { SiteFooter, SiteHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        account={<AccountMenu name={user.name} />}
        extra={<AddLineButton label="Add line" className="nav-text-button" />}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
