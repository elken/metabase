import fetch from "node-fetch";

import { printInfo } from "./print";

const delay = (duration: number) =>
  new Promise(resolve => setTimeout(resolve, duration));

const HEALTH_CHECK_MAX_ATTEMPTS = 60;
const HEALTH_CHECK_WAIT = 1000;

/**
 * Keep polling the Metabase instance until it is ready.
 *
 * @param baseUrl
 */
export async function pollUntilMetabaseInstanceReady(
  baseUrl: string,
): Promise<boolean> {
  let attempts = 0;

  while (attempts < HEALTH_CHECK_MAX_ATTEMPTS) {
    // The instance is not yet ready. Show a message so users can anticipate the wait.
    if (attempts === 1) {
      printInfo(
        "Waiting for the Metabase instance to be ready. This will take 2 - 5 minutes.",
      );
    }

    // fetch will throw an error if the server is not reachable
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
      });

      // Endpoint returns 503 when Metabase is not ready yet.
      // It returns 200 when Metabase is ready.
      if (res.ok) {
        return true;
      }
    } catch (error) {}

    attempts++;

    await delay(HEALTH_CHECK_WAIT);
  }

  return false;
}
