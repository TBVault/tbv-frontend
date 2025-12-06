import { auth } from "@/auth";
import AuthButton from "@/components/AuthButton";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://tbv-backend-120229979618.us-west1.run.app";

async function getProtectedData(token: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/protected/helloworld`, {
      headers: {
        Authorization: `${token.trim()}`,
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    
    return await res.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch data from backend" };
  }
}

async function getPublicData() {
  try {
    const res = await fetch(`${BACKEND_URL}/public/helloworld`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    
    return await res.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch data from backend" };
  }
}

async function getPrivateData(token?: string) {
  try {
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `${token.trim()}`;
    }
    
    const res = await fetch(`${BACKEND_URL}/private/helloworld`, {
      headers,
      cache: "no-store",
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    
    return await res.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch data from backend" };
  }
}

export default async function Home() {
  const session = await auth();
  let protectedData = null;
  let publicData = null;
  let privateData = null;

  // Public endpoint - no authentication required
  publicData = await getPublicData();

  // Protected endpoint - requires authentication
  if (session?.idToken) {
    protectedData = await getProtectedData(session.idToken);
  }

  // Private endpoint - optional authentication
  privateData = await getPrivateData(session?.idToken);

  return (
    <main>
      <h1>The Bhakti Vault Frontend</h1>
      <AuthButton />
      <div>
        <h2>Public Endpoint (/public/helloworld)</h2>
        <div>
          {publicData?.error ? (
            <div>
              <p><strong>Error:</strong> {publicData.error}</p>
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
            {protectedData?.error ? (
              <div>
                <p><strong>Error:</strong> {protectedData.error}</p>
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
      <div>
        <h2>Private Endpoint (/private/helloworld)</h2>
        <div>
          {privateData?.error ? (
            <div>
              <p><strong>Error:</strong> {privateData.error}</p>
            </div>
          ) : (
            <div>
              <p><strong>Success!</strong> {session ? "(Authenticated)" : "(Not Authenticated)"}</p>
              <pre>{JSON.stringify(privateData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
