export function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

export function errorResponse(error: string, status: number) {
  return jsonResponse({ success: false, error }, status);
}
