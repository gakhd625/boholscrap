import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/id-image?path=<storage-path>
 *
 * Securely serve private ID document images.
 * Requires authentication. Uses server-side admin client to fetch from private storage.
 * Never exposes service role key or public URLs to the browser.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get storage path from query params
    const storagePath = request.nextUrl.searchParams.get('path');

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Use admin client to download from private storage
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from('id-documents')
      .download(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Determine content type from path
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };

    const contentType = contentTypes[ext || 'jpg'] || 'image/jpeg';

    // Stream the image back with proper headers
    const arrayBuffer = await data.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[IdImage] Error serving image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
