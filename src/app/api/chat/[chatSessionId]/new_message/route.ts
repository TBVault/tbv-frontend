import { NextRequest } from 'next/server';
import { getFullUrl } from '@/api/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatSessionId: string }> }
) {
  try {
    const { chatSessionId } = await params;
    const body = await request.json();
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Construct the backend URL
    const backendUrl = getFullUrl(`/protected/chat_session/${chatSessionId}/new_message`);
    
    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(errorText, {
        status: backendResponse.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Return the streaming response
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        'Content-Type': backendResponse.headers.get('Content-Type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error proxying chat message:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send message' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

