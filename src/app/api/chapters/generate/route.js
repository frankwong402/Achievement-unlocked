import {bodyFrom,toError,ok} from "../../../../lib/ai/http.mjs";
import {validateChapterInput,validateChapterBatch} from "../../../../lib/ai/schema.mjs";
import {chapterMessages} from "../../../../lib/ai/prompts.mjs";
import {completeJson} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export const maxDuration=90;
export async function POST(request) {
  try {
    const input=validateChapterInput(await bodyFrom(request));
    const data=await completeJson(chapterMessages(input),
      value=>validateChapterBatch(value,input.existingTasks,input.language),5000,request);
    return ok(data);
  } catch(error) { return toError(error); }
}
