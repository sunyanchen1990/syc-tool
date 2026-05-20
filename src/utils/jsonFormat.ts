export type JsonFormatResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: '内容为空' };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON 解析失败';
    return { ok: false, error: msg };
  }
}

export function formatJson(text: string, indent = 2): JsonFormatResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, output: JSON.stringify(parsed.value, null, indent) };
}

export function minifyJson(text: string): JsonFormatResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, output: JSON.stringify(parsed.value) };
}

export function validateJson(text: string): { valid: boolean; error?: string } {
  const parsed = parseJson(text);
  if (!parsed.ok) return { valid: false, error: parsed.error };
  return { valid: true };
}
