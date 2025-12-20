import { revalidateChatSessions } from '@/utils/revalidate';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await revalidateChatSessions();
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch {
    return NextResponse.json(
      { message: 'Error revalidating chat sessions' },
      { status: 500 }
    );
  }
}

