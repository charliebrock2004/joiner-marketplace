import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth.ts";
import { ButtonLink } from "@/components/ui/Button";
import type { SessionUser } from "@/lib/auth/session.ts";

/**
 * Header auth controls. Rendered on the server so the signed-in state is
 * correct on first paint rather than flashing.
 */
export function UserMenu({
  user,
  mobile,
  onNavigate,
}: {
  user: SessionUser | null;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  if (!user) {
    return (
      <div className={mobile ? "grid gap-2" : "flex items-center gap-2"}>
        <ButtonLink href="/login" variant="secondary" size={mobile ? "lg" : "md"} onClick={onNavigate}>
          Sign in
        </ButtonLink>
        <ButtonLink href="/post-a-job" size={mobile ? "lg" : "md"} onClick={onNavigate}>
          Post a job
        </ButtonLink>
      </div>
    );
  }

  const home = user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className={mobile ? "grid gap-2" : "flex items-center gap-2"}>
      <Link
        href={home}
        onClick={onNavigate}
        className={
          mobile
            ? "rounded-xl px-3 py-3 text-base text-ink-soft hover:bg-paper-sunk"
            : "rounded-full px-3.5 py-2 text-[0.9375rem] text-ink-soft transition-colors hover:text-ink"
        }
      >
        {user.role === "admin" ? "Admin" : "Dashboard"}
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className={
            mobile
              ? "w-full rounded-full bg-white px-5 py-3 text-base font-medium text-ink ring-1 ring-line-strong"
              : "h-11 rounded-full bg-white px-5 text-[0.9375rem] font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-paper-sunk"
          }
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
