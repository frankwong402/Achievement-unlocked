import {isLiveEnabled,selectedModel} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export async function GET() {
  return Response.json({
    ai:{enabled:isLiveEnabled(),model:selectedModel(),configured:!!process.env.AIHUBMIX_API_KEY}
  },{headers:{"Cache-Control":"no-store"}});
}
