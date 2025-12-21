import { revalidateChatSessions } from '@/utils/revalidate';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Wait a bit to ensure the database write is complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await revalidateChatSessions();
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch {
    return NextResponse.json(
      { message: 'Error revalidating chat sessions' },
      { status: 500 }
    );
  }
}

