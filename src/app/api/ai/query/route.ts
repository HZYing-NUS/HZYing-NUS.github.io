export async function POST() {
  return Response.json(
    { message: 'FEATURE_NOT_AVAILABLE' },
    { status: 410 }
  );
}
