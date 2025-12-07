/**
 * API module - re-exports generated types and client functions.
 * 
 * Example usage:
 * 
 * ```typescript
 * import { HelloDto, publicHelloWorldPydanticPublicHelloWorldPydanticGet } from "@/api";
 * 
 * const response = await publicHelloWorldPydanticPublicHelloWorldPydanticGet({ message: "test" });
 * ```
 */

// Re-export all generated schemas/types
export * from "./generated/schemas";

// Re-export all generated endpoint functions
export * from "./generated/endpoints/default/default";
