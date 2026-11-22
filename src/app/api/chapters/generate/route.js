import {bodyFrom,toError,ok} from "../../../../lib/ai/http.mjs";
import {validateChapterInput,validateChapterBatch,translatedTask,validateTranslationInput} from "../../../../lib/ai/schema.mjs";
import {chapterMessages,translationMessages} from "../../../../lib/ai/prompts.mjs";
import {completeJson} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export const maxDuration=90;
export async function POST(request) {
  try {
    const body=await bodyFrom(request);
    // The personal site's proxy exposes this chapter endpoint on both domains.
    if (body?.operation === 'translate-task') {
      const task=validateTranslationInput(body);
      return ok(await completeJson(translationMessages(task), value=>translatedTask(value,task),1600,request));
    }
    const input=validateChapterInput(body);
    const data=await completeJson(chapterMessages(input),
      value=>validateChapterBatch(value,input.existingTasks,input.language),5000,request);
    return ok(data);
  } catch(error) { return toError(error); }
}
