import {bodyFrom,toError,ok} from "../../../../lib/ai/http.mjs";
import {validateChapterInput,validateChapterOutput} from "../../../../lib/ai/schema.mjs";
import {chapterMessages} from "../../../../lib/ai/prompts.mjs";
import {completeJson} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export const maxDuration=90;
export async function POST(request) {
  try {
    const input=validateChapterInput(await bodyFrom(request));
    const data=await completeJson(chapterMessages(input),validateChapterOutput,5000,request);
    const existing=new Set(input.existingTasks.map(t=>t.title.toLowerCase()));
    if (data.tasks.some(t=>existing.has(t.title.toLowerCase()))) {
      return Response.json({error:{code:"INVALID_AI_RESPONSE",message:"AI repeated an existing task"}},
        {status:502,headers:{"Cache-Control":"no-store"}});
    }
    return ok(data);
  } catch(error) { return toError(error); }
}
