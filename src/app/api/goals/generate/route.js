import {bodyFrom,toError,ok} from "../../../../lib/ai/http.mjs";
import {validateGoalInput,validateGoalOutput} from "../../../../lib/ai/schema.mjs";
import {goalMessages} from "../../../../lib/ai/prompts.mjs";
import {completeJson} from "../../../../lib/ai/provider.mjs";
export const runtime="nodejs";
export async function POST(request) {
  try {
    const input=validateGoalInput(await bodyFrom(request));
    const data=await completeJson(goalMessages(input),validateGoalOutput,3000);
    return ok(data);
  } catch(error) { return toError(error); }
}
