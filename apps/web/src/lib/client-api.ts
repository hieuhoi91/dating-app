export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly diagnosticCode?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const result = await response.json().catch(() => null) as { error?: string; diagnosticCode?: string } | null;
  if (!response.ok) {
    throw new ApiRequestError(
      result?.error ?? `Yêu cầu thất bại (${response.status}).`,
      response.status,
      result?.diagnosticCode,
    );
  }
  return result as T;
}

export function apiUpload<T>(
  path: string,
  body: FormData,
  onProgress: (progress: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", path);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    });
    request.addEventListener("load", () => {
      let result: {
        error?: string;
        message?: string | string[];
      } | null = null;
      try {
        const parsed: unknown = JSON.parse(request.responseText);
        if (typeof parsed === "object" && parsed !== null) {
          const record = parsed as Record<string, unknown>;
          const message = record.message;
          result = {
            error: typeof record.error === "string" ? record.error : undefined,
            message:
              typeof message === "string"
                ? message
                : Array.isArray(message) &&
                    message.every((item) => typeof item === "string")
                  ? message.map(String)
                  : undefined,
          };
        }
      } catch {
        result = null;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(
          new ApiRequestError(
            result?.error ??
              (Array.isArray(result?.message)
                ? result.message.join(" ")
                : result?.message) ??
              `Yêu cầu thất bại (${request.status}).`,
            request.status,
          ),
        );
        return;
      }
      onProgress(100);
      resolve(result as T);
    });
    request.addEventListener("error", () => {
      reject(new ApiRequestError("Không thể kết nối máy chủ. Vui lòng thử lại.", 0));
    });
    request.addEventListener("abort", () => {
      reject(new ApiRequestError("Đã hủy tải ảnh lên.", 0));
    });
    request.send(body);
  });
}

export function reportApiError(error: unknown, notify: (message: string) => void) {
  notify(error instanceof Error ? error.message : "Không thể kết nối máy chủ. Vui lòng thử lại.");
}
