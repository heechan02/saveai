// Fire-and-forget OTLP span emitter — no extra packages needed
// Sends to Logfire's OTLP/HTTP endpoint directly via fetch

function randomHex(bytes: number): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(bytes)
    crypto.getRandomValues(buf)
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // fallback
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
}

function toOtlpAttribute(key: string, value: string | number) {
  if (typeof value === 'string') return { key, value: { stringValue: value } }
  if (Number.isInteger(value)) return { key, value: { intValue: value } }
  return { key, value: { doubleValue: value } }
}

export function emitSpan(name: string, attributes: Record<string, string | number>): void {
  const token = process.env.LOGFIRE_TOKEN
  if (!token) return

  const nowNs = String(Date.now() * 1_000_000)
  const span = {
    traceId: randomHex(16),
    spanId: randomHex(8),
    name,
    kind: 3, // CLIENT
    startTimeUnixNano: nowNs,
    endTimeUnixNano: nowNs,
    attributes: Object.entries(attributes).map(([k, v]) => toOtlpAttribute(k, v)),
    status: { code: 1 }, // OK
  }

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'saveai' } }],
        },
        scopeSpans: [
          {
            scope: { name: 'saveai.preflight' },
            spans: [span],
          },
        ],
      },
    ],
  }

  fetch('https://logfire-api.pydantic.dev/v1/traces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
