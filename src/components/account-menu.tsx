import { logoutAction } from "@/app/login/actions";

export function AccountMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="max-w-40 truncate text-[13px] font-bold" title={name}>
        {name}
      </span>
      <form action={logoutAction}>
        <button className="text-[14px] font-bold tracking-[0.3px]" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
