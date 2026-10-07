// One way to ask Claude for something: a forced tool call, so the answer is
// always JSON in the shape we asked for. Every call's tokens and cost go into
// seed.usage, which is what the monthly cap reads.

import { type Config, recordUsage, type Sql } from './db.ts';

export type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'url'; url: string } };
export type Tool = { name: string; description: string; input_schema: Record<string, unknown> };

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export class ClaudeError extends Error {}

export async function askTool<T>(
  sql: Sql,
  cfg: Config,
  apiKey: string,
  opts: {
    purpose: string;
    model: string;
    system: SystemBlock[];
    content: ContentBlock[];
    tool: Tool;
    maxTokens: number;
    timeoutMs?: number;
  },
): Promise<T> {
  const body = JSON.stringify({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: 'user', content: opts.content }],
    tools: [opts.tool],
    tool_choice: { type: 'tool', name: opts.tool.name },
  });

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 6000));
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 100_000),
    }).catch((e: unknown) => {
      lastError = String(e);
      return undefined;
    });
    if (!res) continue;
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new ClaudeError(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);

    await recordUsage(sql, { purpose: opts.purpose, model: opts.model, ...costOf(cfg, opts.model, json.usage as Usage) });
    const call = (json.content as { type: string; name?: string; input?: unknown }[]).find(
      (b) => b.type === 'tool_use' && b.name === opts.tool.name,
    );
    if (!call) throw new ClaudeError(`no ${opts.tool.name} call (stop_reason ${json.stop_reason})`);
    if (json.stop_reason === 'max_tokens') throw new ClaudeError('answer was cut off at max_tokens');
    return call.input as T;
  }
  throw new ClaudeError(`gave up after retries: ${lastError}`);
}

function costOf(cfg: Config, model: string, u: Usage) {
  const price = cfg.prices[model] ?? { in: 3, out: 15 };
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  // Anthropic's published multipliers: cache writes 1.25×, cache reads 0.1× the input price.
  const usd = (u.input_tokens * price.in + cacheWrite * price.in * 1.25 + cacheRead * price.in * 0.1 + u.output_tokens * price.out) / 1e6;
  return {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    usd,
  };
}
