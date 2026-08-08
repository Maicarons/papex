import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";

/**
 * Server-only locale helpers. Kept separate from `./index` so that client
 * components importing `getDictionary`/`t`/`format` never pull `next/headers`
 * (which is unsupported outside the server runtime) into the client bundle.
 */

/** Read the active locale from the cookie (server components / route handlers). */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}
