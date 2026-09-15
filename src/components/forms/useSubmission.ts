"use client";

import { useCallback, useState } from "react";
import type { SubmissionApiResponse } from "@/lib/api/submission-handler";

type Status = "idle" | "submitting" | "success" | "error";

export type SubmissionState = {
  status: Status;
  /** Field-level messages keyed by input name, mirrored from the server. */
  fieldErrors: Record<string, string>;
  formError: string | null;
  /** Whether the submitted postcode is inside the current launch area. */
  inLaunchArea: boolean;
};

const initialState: SubmissionState = {
  status: "idle",
  fieldErrors: {},
  formError: null,
  inLaunchArea: false,
};

/**
 * Shared submit logic for every form on the site.
 *
 * The server is the authority on validity: we send the payload, then render
 * whatever field errors come back. The client does not duplicate the rules.
 */
export function useSubmission(endpoint: string) {
  const [state, setState] = useState<SubmissionState>(initialState);

  const submit = useCallback(
    async (body: FormData | Record<string, unknown>) => {
      setState({ ...initialState, status: "submitting" });

      try {
        const isFormData = body instanceof FormData;
        const response = await fetch(endpoint, {
          method: "POST",
          body: isFormData ? body : JSON.stringify(body),
          headers: isFormData ? undefined : { "Content-Type": "application/json" },
        });

        const result = (await response.json()) as SubmissionApiResponse;

        if (!response.ok || !result.ok) {
          const error = result.ok ? null : result;
          setState({
            status: "error",
            fieldErrors: error?.fieldErrors ?? {},
            formError: error?.error ?? "Something went wrong. Please try again.",
            inLaunchArea: false,
          });
          return false;
        }

        setState({
          status: "success",
          fieldErrors: {},
          formError: null,
          inLaunchArea: result.inLaunchArea,
        });
        return true;
      } catch {
        setState({
          status: "error",
          fieldErrors: {},
          formError: "We couldn't reach the server. Check your connection and try again.",
          inLaunchArea: false,
        });
        return false;
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, submit, reset };
}
