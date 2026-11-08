import { forwardNestRequest } from "@/lib/nest-api";

export async function GET(request: Request) {
  return forwardNestRequest(request, "/auth/verify");
}
