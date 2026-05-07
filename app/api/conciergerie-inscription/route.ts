import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { nom, email, telephone, villes, commission, biens_geres, services, assurance, experience, message } = body;

    if (!nom || !email) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const webhookUrl = process.env.CONCIERGERIE_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom,
            email,
            telephone,
            villes,
            commission,
            biens_geres,
            services,
            assurance,
            experience,
            message,
            source: 'rentavision-conciergerie',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookErr) {
        // Échec silencieux — ne bloque jamais l'utilisateur
        console.error('[conciergerie-inscription] Webhook error:', webhookErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
