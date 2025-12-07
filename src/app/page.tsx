import { auth } from "@/auth";
import AuthButton from "@/components/AuthButton";
import {
  publicHelloWorldPydanticPublicHelloWorldPydanticGet,
  protectedHelloWorldProtectedHelloworldGet,
} from "@/api/generated/endpoints/default/default";

export default async function Home() {
  const session = await auth();
  let protectedData = null;
  let publicData = null;
  let publicError: string | null = null;
  let protectedError: string | null = null;

  // Public endpoint using generated client
  try {
    const response = await publicHelloWorldPydanticPublicHelloWorldPydanticGet({
      message: "Hello from frontend!",
    });
    publicData = response;
  } catch (error) {
    publicError = error instanceof Error ? error.message : "Failed to fetch data";
  }

  // Protected endpoint using generated client
  if (session?.idToken) {
    try {
      const response = await protectedHelloWorldProtectedHelloworldGet({
        headers: {
          Authorization: session.idToken.trim(),
        },
      });
      protectedData = response;
    } catch (error) {
      protectedError = error instanceof Error ? error.message : "Failed to fetch data";
    }
  }

  return (
    <main>
      <h1>The Bhakti Vault Frontend</h1>
      <AuthButton />
      <div>
        <h2>Public Endpoint (/public/hello_world_pydantic)</h2>
        <div>
          {publicError ? (
            <div>
              <p><strong>Error:</strong> {publicError}</p>
            </div>
          ) : (
            <div>
              <p><strong>Success!</strong></p>
              <pre>{JSON.stringify(publicData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
      <div>
        <h2>Protected Endpoint (/protected/helloworld)</h2>
        {!session ? (
          <p>Please sign in to access protected data</p>
        ) : (
          <div>
            {protectedError ? (
              <div>
                <p><strong>Error:</strong> {protectedError}</p>
              </div>
            ) : (
              <div>
                <p><strong>Success!</strong></p>
                <pre>{JSON.stringify(protectedData, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
