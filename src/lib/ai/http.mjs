import {ContractError} from "./schema.mjs";
const WINDOW_MS=60_000;
const MAX_REQUESTS=8;
// Best-effort per-instance guard, NOT a durable distributed rate limiter.
// Public launch also requires Vercel WAF/Firewall rate limiting.
const requests=new Map();
function checkRateLimit(request) {
  const ip=(request.headers.get("x-forwarded-for")||"anonymous").split(",")[0].trim().slice(0,80);
  const now=Date.now();
  const record=requests.get(ip);
  const updated=record&&now-record.start<WINDOW_MS?record:{start:now,count:0};
  updated.count++;
  requests.set(ip,updated);
  if(requests.size>500){for (const [key,entry] of requests) {if(now-entry.start>=WINDOW_MS)requests.delete(key);}}
  if(updated.count>MAX_REQUESTS)throw new ContractError("LOCAL_RATE_LIMIT","Too many requests. Retry soon.",429);
}
export async function bodyFrom(request) {
  checkRateLimit(request);
  const contentType=request.headers.get("content-type")||"";
  if(!contentType.includes("application/json"))
    throw new ContractError("INVALID_INPUT","Content-Type must be application/json",415);
  const length=Number(request.headers.get("content-length"));
  if(Number.isFinite(length)&&length>18000)throw new ContractError("PAYLOAD_TOO_LARGE","Request too large",413);
  let raw;
  try {raw=await request.text();} catch {throw new ContractError("INVALID_INPUT","Unable to read request",400);}
  if(raw.length>18000)throw new ContractError("PAYLOAD_TOO_LARGE","Request too large",413);
  try {return JSON.parse(raw);}
  catch {throw new ContractError("INVALID_INPUT","Malformed JSON",400);}
}
export function toError(error) {
  const known=error instanceof ContractError;
  return Response.json({error:{code:known?error.code:"INTERNAL_ERROR",message:known?error.message:"Internal error"}},
    {status:known?error.status:500,headers:{"Cache-Control":"no-store"}});
}
export function ok(data) {
  return Response.json({data},{status:200,headers:{"Cache-Control":"no-store"}});
}
