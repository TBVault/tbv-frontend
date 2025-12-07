This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Types & Code Generation

This project uses [Orval](https://orval.dev/) to generate TypeScript types and API client functions from the backend's OpenAPI specification.

### Generated Files Location

- **Types/Schemas**: `src/api/generated/schemas/`
- **API Client Functions**: `src/api/generated/endpoints/`
- **Custom Fetch Wrapper**: `src/api/customFetch.ts`

### Updating API Types

When the backend API changes, follow these steps:

1. **Download the OpenAPI spec** from the backend's Swagger UI (`/docs` or `/openapi.json`)
2. **Replace** the `openapi.json` file at the root of this repo
3. **Regenerate** the API types and client:
   ```bash
   npm run generate:api
   ```
4. **Type-check** to ensure frontend compatibility:
   ```bash
   npm run typecheck
   ```

If `typecheck` fails, it means the frontend code needs to be updated to match the new API contract.

### Using Generated Types

Import types from the generated schemas:

```typescript
import type { HelloDto } from "@/api/generated/schemas";

// Use in your component
const data: HelloDto = { message: "Hello World" };
```

### Using Generated API Client

Import and use the generated client functions:

```typescript
import { publicHelloWorldPydanticPublicHelloWorldPydanticGet } from "@/api/generated/endpoints/default/default";

// Call the API
const response = await publicHelloWorldPydanticPublicHelloWorldPydanticGet({ message: "test" });
```
