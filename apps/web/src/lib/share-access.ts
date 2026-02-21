export interface ShareValidation {
  valid: boolean;
  boardId: string | null;
  accessLevel: "view" | "edit" | null;
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

interface ValidateResponseBody {
  valid?: boolean;
  board_id?: string;
  access_level?: "view" | "edit";
}

const INVALID_RESULT: ShareValidation = {
  valid: false,
  boardId: null,
  accessLevel: null,
};

/**
 * Validates a share token by calling the validate API endpoint.
 * Returns share validation result with board ID and access level.
 */
export async function validateShareToken(
  token: string,
  fetchFn: FetchFn
): Promise<ShareValidation> {
  if (!token) {
    return { ...INVALID_RESULT };
  }

  try {
    const response = await fetchFn("/api/share/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return { ...INVALID_RESULT };
    }

    const body = (await response.json()) as ValidateResponseBody;

    if (!body.valid || !body.board_id || !body.access_level) {
      return { ...INVALID_RESULT };
    }

    return {
      valid: true,
      boardId: body.board_id,
      accessLevel: body.access_level,
    };
  } catch {
    return { ...INVALID_RESULT };
  }
}

/**
 * Returns true if the access level indicates read-only (view) access.
 */
export function isReadOnlyAccess(accessLevel: "view" | "edit" | null): boolean {
  return accessLevel === "view";
}
