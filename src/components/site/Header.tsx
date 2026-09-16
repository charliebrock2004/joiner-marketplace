import { currentUser } from "@/lib/auth/guards.ts";
import { HeaderShell } from "./HeaderShell";

/**
 * Server component so the signed-in state is resolved before first paint —
 * a client-side auth check would flash "Sign in" at users who are logged in.
 */
export async function Header() {
  const user = await currentUser();
  return <HeaderShell user={user} />;
}
