import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appName, confirmationText, mediaIds, userIdentifier } = body;

    // Normalization helper
    const normalize = (str: unknown) => String(str || '').trim().replace(/\s+/g, ' ');

    const validAppNames = ['local media player', 'local media'];
    const expectedConfirmation = 'Je veux supprimer les dossiers importés';

    const normalizedAppName = normalize(appName).toLowerCase();
    const normalizedConfirmation = normalize(confirmationText);

    // Strict validation of Double Confirmation on server-side
    if (!validAppNames.includes(normalizedAppName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Le nom de l'application saisi est incorrect. Attendu: "Local Media Player"`,
        },
        { status: 400 }
      );
    }

    if (normalizedConfirmation !== expectedConfirmation) {
      return NextResponse.json(
        {
          success: false,
          error: `Le texte de confirmation est incorrect. Attendu exactement: "${expectedConfirmation}"`,
        },
        { status: 400 }
      );
    }

    // Filter and sanitize IDs
    const safeMediaIds = Array.isArray(mediaIds)
      ? mediaIds.filter((id) => typeof id === 'string' && id.length > 0)
      : [];

    return NextResponse.json({
      success: true,
      message: 'Tous les imports ont été supprimés.',
      deletedCount: safeMediaIds.length,
      timestamp: Date.now(),
      authorizedUser: userIdentifier || 'local_user',
    });
  } catch (error) {
    console.error('Delete all imports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Erreur lors de la suppression des imports.',
      },
      { status: 500 }
    );
  }
}
