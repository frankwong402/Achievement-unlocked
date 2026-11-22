import {bodyFrom,toError,ok} from "../../../../lib/ai/http.mjs";
import {validateEvaluationInput,validateEvaluationOutput} from "../../../../lib/ai/schema.mjs";
import {evaluationMessages} from "../../../../lib/ai/prompts.mjs";
import {completeJson} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export const maxDuration=90;
export async function POST(request) {
  try {
    const input=validateEvaluationInput(await bodyFrom(request));
    const data=await completeJson(evaluationMessages(input),
      output=>validateEvaluationOutput(output,input.achievements),2000,request);
    return ok(data);
  } catch(error) { return toError(error); }
}
