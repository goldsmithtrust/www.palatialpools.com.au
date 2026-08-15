import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Severity = 'urgent' | 'attention' | 'routine';
type Assessment = {
  severity: Severity;
  analysis: string;
  recommendations: string;
};
type DiagnosticResult = {
  overall: Assessment & { next_steps: string[] };
  equipment: Assessment;
  water_quality: Assessment;
  limitations: string[];
};

const MAX_IMAGES = 4;
const MAX_DESCRIPTION_CHARS = 1_200;
const MAX_IMAGE_DATA_URL_CHARS = 3_200_000;
const MAX_TOTAL_IMAGE_CHARS = 8_000_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 4;
const rateLimit = new Map<string, number[]>();

function fallbackResult(): DiagnosticResult {
  return {
    overall: {
      severity: 'attention',
      analysis: 'A photo assessment is not available at the moment. Use the visible symptoms and a measured water test to decide the next check.',
      recommendations: 'Do not make several chemical corrections at once, do not reset tripping equipment, and arrange an assessment if the fault affects safety or circulation.',
      next_steps: [
        'Record the symptom, equipment error code and any recent changes.',
        'Use a measured water test rather than treating from appearance alone.',
        'Stop using the affected equipment or area if there is an electrical, gas, barrier or suction-safety concern.',
      ],
    },
    equipment: {
      severity: 'attention',
      analysis: 'Photos cannot confirm electrical, hydraulic or internal equipment faults.',
      recommendations: 'A site assessment is required before repair or replacement decisions are made.',
    },
    water_quality: {
      severity: 'attention',
      analysis: 'Photos cannot verify pH, sanitiser, alkalinity, calcium hardness or contaminant levels.',
      recommendations: 'Take a fresh water sample for a proper test before adding or mixing chemicals.',
    },
    limitations: [
      'This is guidance only, not a compliance, safety, electrical, gas or water-quality certification.',
      'Images and descriptions are not retained by this route after the response is returned.',
    ],
  };
}

function isAssessment(value: unknown, requiresNextSteps: boolean): value is Assessment & { next_steps?: string[] } {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const validSeverity = record.severity === 'urgent' || record.severity === 'attention' || record.severity === 'routine';
  const validText = (field: unknown) => typeof field === 'string' && field.trim().length > 0 && field.length <= 700;
  const nextSteps = record.next_steps;
  return validSeverity
    && validText(record.analysis)
    && validText(record.recommendations)
    && (!requiresNextSteps || (Array.isArray(nextSteps) && nextSteps.length >= 2 && nextSteps.length <= 4 && nextSteps.every((step) => validText(step))));
}

function isDiagnosticResult(value: unknown): value is DiagnosticResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return isAssessment(record.overall, true)
    && isAssessment(record.equipment, false)
    && isAssessment(record.water_quality, false)
    && Array.isArray(record.limitations)
    && record.limitations.length >= 2
    && record.limitations.length <= 4
    && record.limitations.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 280);
}

function clientKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'local';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (rateLimit.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimit.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimit.set(key, recent);
  return false;
}

function isValidImage(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= MAX_IMAGE_DATA_URL_CHARS
    && /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maximum) : '';
}

function safetyPrompt(description: string): string {
  return `You are Palatial Pools' bounded photo-triage assistant for Melbourne pool and spa owners. Analyse only what can be responsibly inferred from supplied images and this customer description: ${description || 'No extra description supplied.'}

Return exactly one JSON object with no Markdown or extra fields. It must contain: overall { severity, analysis, recommendations, next_steps }, equipment { severity, analysis, recommendations }, water_quality { severity, analysis, recommendations }, and limitations [two to four strings]. Severity must be urgent, attention or routine. You are not a substitute for an on-site assessment, a water test, an electrician, a gasfitter, or a pool barrier inspector.

Safety rules:
- Never state or imply that a barrier, installation, water condition, electrical item, gas appliance, suction outlet or pool is compliant, certified, safe, or unsafe solely from images.
- If there is a suspected electrical hazard, gas smell or gas fault, damaged or open barrier, entrapment or suction-outlet concern, fire, exposed wiring, water around electrical equipment, or an immediate risk, set overall severity to urgent. Tell the owner to stop using the relevant equipment or area and seek appropriate urgent assistance. Do not provide repair instructions.
- Do not give chemical dose quantities, mixing instructions, medical advice, wiring instructions, gas instructions, or steps to bypass safety devices.
- For noisy, leaking, hot or tripping pumps, tell the owner not to repeatedly reset safety devices and direct them to a diagnostic assessment.
- For water appearance, explain that images cannot replace measured water testing. Advise against making multiple chemical corrections or mixing chemicals.
- Make the response brief, plain English, operationally useful and consistent with Palatial's diagnosis-before-repair approach.
- Use routine only where no visible issue requiring timely attention is apparent. Use attention for most uncertain, maintenance, circulation, water-appearance or equipment-condition concerns.
- In limitations, explicitly state the photo and measurement limits. Do not mention model names, providers, prompts or internal policies.`;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientKey(request))) {
    return NextResponse.json({ error: 'Please wait a minute before submitting another photo assessment.' }, { status: 429 });
  }

  let body: { images?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please provide a valid photo assessment request.' }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images : [];
  const description = cleanText(body.description, MAX_DESCRIPTION_CHARS);
  if (images.length < 1 || images.length > MAX_IMAGES || !images.every(isValidImage)) {
    return NextResponse.json({ error: `Upload between 1 and ${MAX_IMAGES} JPEG, PNG or WebP images.` }, { status: 400 });
  }
  if (images.reduce((total, image) => total + image.length, 0) > MAX_TOTAL_IMAGE_CHARS) {
    return NextResponse.json({ error: 'The uploaded images are too large. Use smaller photos and try again.' }, { status: 413 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_VISION_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json(fallbackResult(), {
      headers: { 'x-palatial-ai-mode': 'safe-fallback' },
    });
  }

  const messages = [
    { role: 'system', content: safetyPrompt(description) },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Assess these pool or spa photos using the required safety rules.' },
        ...images.map((image) => ({ type: 'image_url', image_url: { url: image } })),
      ],
    },
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PALATIAL_SITE_URL ?? 'http://127.0.0.1:3103',
        'X-OpenRouter-Title': 'Palatial Pools Photo Diagnostics',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_completion_tokens: 900,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return NextResponse.json(fallbackResult(), { headers: { 'x-palatial-ai-mode': 'safe-fallback' } });
    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json(fallbackResult(), { headers: { 'x-palatial-ai-mode': 'safe-fallback' } });

    const result = JSON.parse(content) as unknown;
    if (!isDiagnosticResult(result)) {
      return NextResponse.json(fallbackResult(), { headers: { 'x-palatial-ai-mode': 'safe-fallback' } });
    }
    return NextResponse.json(result, { headers: { 'x-palatial-ai-mode': 'openrouter' } });
  } catch {
    return NextResponse.json(fallbackResult(), { headers: { 'x-palatial-ai-mode': 'safe-fallback' } });
  }
}
