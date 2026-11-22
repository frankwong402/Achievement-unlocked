import {createHash} from "node:crypto";
import {ContractError} from "./schema.mjs";

const ledgerPath = "quota/production-v1.json";
export const CALL_LIMIT = 300;
const windowMs = 60_000;

// Reserve before contacting the provider. A timeout or an invalid reply still costs a slot.
// At 24k input bytes + 5k output tokens and a conservative $1/M each, 300 calls < $9.
export function reserveInLedger(previous, client, now) {
  if (!Number.isInteger(previous.used) || previous.used < 0 || !Array.isArray(previous.recent))
    throw new Error("Invalid reservation ledger");
  if (previous.used >= CALL_LIMIT)
    throw new ContractError("BUDGET_LIMIT", "本场 AI 额度已用完。已有 Quest 仍可使用。", 429);
  const recent = previous.recent.filter(entry => entry.at > now - windowMs);
  if (recent.length >= 30 || recent.filter(entry => entry.client === client).length >= 8)
    throw new ContractError("RATE_LIMIT", "请求较多，请在一分钟后重试。", 429);
  return {used: previous.used + 1, recent: [...recent, {at: now, client}]};
}

export async function reserveCall(request, messages, maxTokens) {
  if (Buffer.byteLength(JSON.stringify(messages)) > 24000 || maxTokens > 5000)
    throw new ContractError("CONTEXT_LIMIT", "本次记录超出单次 AI 预算。", 413);
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new ContractError("BUDGET_OFFLINE", "AI 配额服务未连接。", 503);
  const ip = request?.headers.get("x-vercel-forwarded-for")?.split(",")[0] || "shared";
  const client = createHash("sha256").update(ip.trim()).digest("hex").slice(0,24);
  try {
    const {get, put, BlobPreconditionFailedError} = await import("@vercel/blob");
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await get(ledgerPath, {access:"private", useCache:false});
      const previous = current ? await new Response(current.stream).json() : {used:0, recent:[]};
      if (current && !current.blob?.etag) throw new Error("Missing ETag");
      const next = reserveInLedger(previous, client, Date.now());
      try {
        await put(ledgerPath, JSON.stringify(next), {
          access:"private", addRandomSuffix:false, contentType:"application/json",
          ...(current ? {allowOverwrite:true, ifMatch:current.blob.etag} : {allowOverwrite:false})
        });
        return;
      } catch (error) {
        if (!(error instanceof BlobPreconditionFailedError) && current) throw error;
      }
    }
  } catch (error) {
    if (error instanceof ContractError) throw error;
  }
  throw new ContractError("BUDGET_BUSY", "暂时无法预留 AI 额度，请重试。", 503);
}
