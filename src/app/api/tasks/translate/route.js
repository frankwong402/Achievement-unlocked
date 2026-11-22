import {bodyFrom,ok,toError} from '../../../../lib/ai/http.mjs';
import {translatedTask,validateTranslationInput} from '../../../../lib/ai/schema.mjs';
import {translationMessages} from '../../../../lib/ai/prompts.mjs';
import {completeJson} from '../../../../lib/ai/provider.mjs';

export const runtime='nodejs';
export const maxDuration=90;

export async function POST(request) {
  try {
    const task=validateTranslationInput(await bodyFrom(request));
    return ok(await completeJson(translationMessages(task), value=>translatedTask(value,task),1600,request));
  } catch(error) { return toError(error); }
}
