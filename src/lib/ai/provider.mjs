import {ContractError,parseModelJson} from "./schema.mjs";

const BASE_URL = "https://aihubmix.com/v1";
const MODEL = "deepseek-v4-flash";
const MAX_WAIT_MS = 30000;

// Fail closed until the owner explicitly enables and verifies production AI.
// This prevents a public unauthenticated endpoint spending the hackathon's $12 credit.
export function isLiveEnabled() {
  return process.env.AI_LIVE_ENABLED === "true";
}
export function selectedModel() {
  return process.env.AIHUBMIX_MODEL?.trim() || MODEL;
}
export async function completeJson(messages, validator, maxTokens = 4000) {
  if (!isLiveEnabled()) {
    throw new ContractError("AI_DISABLED", "Live AI is disabled until the owner enables it", 503);
  }
  const apiKey = process.env.AIHUBMIX_API_KEY;
  if (!apiKey) {
    throw new ContractError("AI_NOT_CONFIGURED", "AI service is not configured", 503);
  }
  const base = (process.env.AIHUBMIX_BASE_URL || BASE_URL).replace(/\/+$/,"");
  if (!/^https:\/\/([a-z0-9-]+\.)?aihubmix\.com\/v1$/i.test(base)) {
    throw new ContractError("AI_CONFIG_ERROR", "Invalid AIHubMix base URL", 503);
  }
  let response;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(),MAX_WAIT_MS);
  try {
    response = await fetch(base + "/chat/completions",{
      method:"POST",
      signal:abortController.signal,
      headers:{"Content-Type":"application/json",Authorization:"Bearer " + apiKey},
      body:JSON.stringify({
        model:selectedModel(),
        messages,
        response_format:{type:"json_object"},
        temperature:0.45,
        max_tokens:maxTokens,
        stream:false
      }),
      cache:"no-store"
    });
  } catch(e) {
    throw new ContractError(e?.name === "AbortError" ? "AI_TIMEOUT" : "AI_NETWORK_ERROR",
      "AI service did not respond",e?.name === "AbortError" ? 504 : 502);
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    if(response.status===429)throw new ContractError("AI_RATE_LIMIT","AI service is busy. Retry later.",429);
    if(response.status===401||response.status===403)throw new ContractError("AI_AUTH_ERROR","AI service authorization failed",502);
    throw new ContractError("AI_UPSTREAM_ERROR","AI service request failed",502);
  }
  let payload;
  try { payload = await response.json(); }
  catch {throw new ContractError("INVALID_AI_RESPONSE","AI provider returned invalid JSON",502);}
  const content = payload?.choices?.[0]?.message?.content;
  // No automatic JSON repair or retry per product decisions Q28/Q44.
  const result = parseModelJson(content);
  try {return validator(result);}
  catch (error) {
    if (error instanceof ContractError)
      throw new ContractError("INVALID_AI_RESPONSE",error.message,502);
    throw error;
  }
}
