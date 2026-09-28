import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Allow sufficient time for audio model processing

interface LyricWord {
  word: string;
  start: number;
  end: number;
}

interface LyricSegment {
  start: number;
  end: number;
  text: string;
  words?: LyricWord[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY non configurée sur le serveur.',
          status: 'failed',
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let audioBase64 = '';
    let mimeType = 'audio/mp3';
    let title = '';
    let artist = '';
    let duration = 0;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      title = (formData.get('title') as string) || '';
      artist = (formData.get('artist') as string) || '';
      duration = parseFloat((formData.get('duration') as string) || '0');

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Fichier audio manquant dans la requête.', status: 'failed' },
          { status: 400 }
        );
      }

      mimeType = file.type || 'audio/mp3';
      const arrayBuffer = await file.arrayBuffer();
      audioBase64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const body = await req.json();
      audioBase64 = body.audioBase64 || '';
      mimeType = body.mimeType || 'audio/mp3';
      title = body.title || '';
      artist = body.artist || '';
      duration = body.duration || 0;
    }

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: 'Données audio vides ou introuvables.', status: 'failed' },
        { status: 400 }
      );
    }

    const promptText = `Tu es un transcripteur professionnel spécialisé dans l'analyse musicale et la synchronisation de paroles.
Ta mission est d'écouter attentivement cet enregistrement audio et d'extraire VERBATIM l'intégralité des paroles chantées avec leurs repères temporels (timestamps précis en secondes).
Titre de l'œuvre : "${title || 'Piste audio'}"
Artiste : "${artist || 'Artiste inconnu'}"
${duration > 0 ? `Durée totale approximative : ${duration.toFixed(1)} secondes.` : ''}

RÈGLES STRICTES DE TRANSCRIPTION VERBATIM :
1. VERBATIM ABSOLU : Retranscris exactement ce qui est chanté, mot pour mot.
   - Ne résume JAMAIS la chanson.
   - Ne reformule JAMAIS les paroles.
   - Conserve scrupuleusement les répétitions de phrases et de refrains.
   - Conserve les ad-libs, onomatopées et interjections audibles ("yeah", "oh", "baby", etc.).
   - Conserve l'ordre chronologique exact.
   - N'invente JAMAIS de paroles imaginaires lorsque l'audio est silencieux ou instrumental.
2. TIMESTAMPS ET SEGMENTS :
   - Découpe le flux chanté en phrases ou segments naturels et lisibles pour l'interface utilisateur.
   - Chaque segment DOIT obligatoirement comporter "start" (début en secondes, ex: 12.42) et "end" (fin en secondes, ex: 16.85).
   - Indique également, si possible, le détail mot par mot dans le tableau "words" : [{ word, start, end }].
3. STATUT ET QUALITÉ :
   - Si les voix sont claires, définis "status" à "completed".
   - Si l'audio comporte beaucoup d'écho, de bruit ou des passages difficiles à comprendre, définis "status" à "needs_review".
   - Identifie le code de langue principale (ex: "fr", "en", "es", "wo", etc.).

Réponds EXCLUSIVEMENT sous forme d'un objet JSON strict respectant ce schéma :
{
  "language": "fr",
  "status": "completed",
  "segments": [
    {
      "start": 0.0,
      "end": 4.5,
      "text": "Ligne de parole chantée",
      "words": [
        { "word": "Ligne", "start": 0.0, "end": 1.2 },
        { "word": "de", "start": 1.3, "end": 1.8 },
        { "word": "parole", "start": 1.9, "end": 3.0 },
        { "word": "chantée", "start": 3.1, "end": 4.5 }
      ]
    }
  ]
}`;

    // Prefer gemini-2.5-flash for stable audio transcription and native JSON support
    let responseText = '';
    const modelsToTry = ['gemini-2.5-flash'];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType.startsWith('audio/') ? mimeType : 'audio/mp3',
                    data: audioBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed or unavailable:`, err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Aucune réponse générée par Gemini pour cette piste audio.');
    }

    // Clean JSON response (handling potential markdown ```json blocks)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsedData = JSON.parse(cleanJson);

    // Validate segments
    const rawSegments = Array.isArray(parsedData.segments) ? parsedData.segments : [];
    const validSegments: LyricSegment[] = rawSegments
      .filter((s: unknown) => s && typeof s === 'object' && 'text' in (s as LyricSegment))
      .map((s: { start?: number; end?: number; text?: string; words?: LyricWord[] }): LyricSegment => ({
        start: typeof s.start === 'number' ? Math.max(0, s.start) : 0,
        end: typeof s.end === 'number' ? Math.max(s.start || 0, s.end) : (s.start || 0) + 3,
        text: String(s.text || '').trim(),
        words: Array.isArray(s.words)
          ? s.words.map((w: LyricWord): LyricWord => ({
              word: String(w.word || '').trim(),
              start: typeof w.start === 'number' ? w.start : 0,
              end: typeof w.end === 'number' ? w.end : 0,
            }))
          : undefined,
      }))
      .filter((s: LyricSegment) => s.text.length > 0)
      .sort((a: LyricSegment, b: LyricSegment) => a.start - b.start);

    return NextResponse.json({
      success: true,
      language: parsedData.language || 'fr',
      status: parsedData.status === 'needs_review' ? 'needs_review' : 'completed',
      segments: validSegments,
      generatedAt: Date.now(),
      modelUsed: 'gemini-3.5-transcribe',
    });
  } catch (error) {
    console.error('Gemini Transcription Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Erreur lors de la transcription avec Gemini.',
        status: 'failed',
      },
      { status: 500 }
    );
  }
}
