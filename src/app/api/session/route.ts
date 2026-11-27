import { getSession } from "@/lib/session";
import { readForSignIn } from "@/lib/sign-in-availability";

export async function GET() {
  const session = await readForSignIn(() => getSession({ touch: false }));
  return new Response(null, {
    status: session ? 204 : 401,
    headers: { "Cache-Control": "private, no-store" },
  });
}
