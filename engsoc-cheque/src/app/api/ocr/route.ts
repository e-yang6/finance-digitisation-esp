import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { processReceipt } from '@/lib/textract';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageBase64 } = body as { imageBase64: string };

    if (!imageBase64) {
      return Response.json({ error: 'Image data is required.' }, { status: 400 });
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const result = await processReceipt(imageBuffer);

    return Response.json(result);
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json(
      { error: 'Failed to process receipt. Please try again.' },
      { status: 500 }
    );
  }
}
