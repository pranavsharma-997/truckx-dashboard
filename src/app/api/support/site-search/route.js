export async function GET() {
  return Response.json({
    success: true,
    message: "Browser direct API is being used from page.js",
    logs: [],
  });
}