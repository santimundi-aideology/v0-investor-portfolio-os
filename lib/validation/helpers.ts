import { NextResponse } from "next/server"
import { ZodError, ZodSchema } from "zod"

/**
 * Helper function to validate request body with Zod schema
 */
export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await req.json()
    const validated = schema.parse(body)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      ),
    }
  }
}
