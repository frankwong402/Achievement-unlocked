// Shared, dependency-free validation for AI generated achievement content.
// All persisted core fields are normalized; optional extensions live in metadata.
export class ContractError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.name = "ContractError";
    this.code = code;
    this.status = status;
  }
}
export function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function text(value, field, max = 180, min = 1) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new ContractError("INVALID_SCHEMA", field + " must be " + min + "–" + max + " characters");
  }
  return value.trim();
}
function list(value, field, max, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new ContractError("INVALID_SCHEMA", field + " must contain " + min + "–" + max + " items");
  }
  return value;
}
function meta(value) {
  if (!record(value)) return {};
  const json = JSON.stringify(value);
  return json.length < 2048 ? JSON.parse(json) : {};
}
function hiddenAchievement(a) {
  if (!record(a)) throw new ContractError("INVALID_SCHEMA", "Hidden achievement must be an object");
  return {
    title: text(a.title, "hidden.title", 100),
    description: text(a.description, "hidden.description", 400),
    condition: text(a.condition, "hidden.condition", 400),
    kind: a.kind === "deterministic" ? "deterministic" : "semantic",
    metadata: meta(a.metadata)
  };
}
export function validateGoalOutput(value) {
  if (!record(value)) throw new ContractError("INVALID_SCHEMA", "Goal response must be a JSON object");
  const chapters = list(value.chapters, "chapters", 24, 1).map((c) => ({
    title: text(c?.title, "chapter.title", 120),
    description: text(c?.description, "chapter.description", 500),
    metadata: meta(c?.metadata)
  }));
  const hidden = list(value.hiddenAchievements ?? [], "hiddenAchievements", 8).map(hiddenAchievement);
  return {
    title: text(value.title, "title", 120),
    chapters,
    hiddenAchievements: hidden,
    metadata: meta(value.metadata)
  };
}
export function validateChapterOutput(value) {
  if (!record(value)) throw new ContractError("INVALID_SCHEMA", "Chapter response must be a JSON object");
  const tasks = list(value.tasks, "tasks", 25, 1).map((t) => {
    if (!record(t)) throw new ContractError("INVALID_SCHEMA", "Each task must be an object");
    if (!["easy", "medium", "hard"].includes(t.difficulty)) {
      throw new ContractError("INVALID_SCHEMA", "difficulty must be easy, medium or hard");
    }
    return {
      title: text(t.title, "task.title", 130),
      description: text(t.description, "task.description", 500),
      difficulty: t.difficulty,
      achievementTitle: text(t.achievementTitle, "task.achievementTitle", 100),
      completionCriteria: text(t.completionCriteria, "task.completionCriteria", 300),
      metadata: meta(t.metadata)
    };
  });
  const uniqueTitles = new Set(tasks.map(t => t.title.toLowerCase()));
  if (uniqueTitles.size !== tasks.length) throw new ContractError("INVALID_SCHEMA", "Duplicate task titles");
  return {
    tasks,
    hiddenAchievements: list(value.hiddenAchievements ?? [], "hiddenAchievements", 8).map(hiddenAchievement),
    hasMore: value.hasMore === true,
    metadata: meta(value.metadata)
  };
}
export function validateEvaluationOutput(value, candidates) {
  if (!record(value)) throw new ContractError("INVALID_SCHEMA", "Evaluation must be a JSON object");
  const ids = new Set(candidates.map(c => c.id));
  const decisions = list(value.decisions, "decisions", candidates.length).map(d => {
    const id = text(d?.id, "decision.id", 100);
    if (!ids.has(id) || typeof d.unlocked !== "boolean") {
      throw new ContractError("INVALID_SCHEMA", "Unknown ID or invalid unlock decision");
    }
    return {id, unlocked:d.unlocked};
  });
  if (new Set(decisions.map(d => d.id)).size !== decisions.length) {
    throw new ContractError("INVALID_SCHEMA", "Duplicate decision IDs");
  }
  if (decisions.length !== candidates.length) {
    throw new ContractError("INVALID_SCHEMA", "Missing achievement decisions");
  }
  return {decisions};
}
export function validateGoalInput(value) {
  if (!record(value)) throw new ContractError("INVALID_INPUT", "Expected JSON object", 400);
  return {goal:text(value.goal, "goal", 600, 3), language: value.language === "en" ? "en" : "zh"};
}
export function validateChapterInput(value) {
  if (!record(value)) throw new ContractError("INVALID_INPUT", "Expected JSON object", 400);
  return {
    goal:text(value.goal, "goal", 600, 3),
    chapter:text(value.chapter, "chapter", 120),
    chapterDescription:typeof value.chapterDescription === "string" ? value.chapterDescription.slice(0,500) : "",
    existingTasks:list(value.existingTasks ?? [], "existingTasks", 150).map(t => ({
      title:text(t?.title,"existingTask.title",130),
      completed:t.completed === true
    })),
    batch: Number.isInteger(value.batch) && value.batch >= 0 && value.batch <= 100 ? value.batch : 0,
    language: value.language === "en" ? "en" : "zh"
  };
}
export function validateEvaluationInput(value) {
  if (!record(value)) throw new ContractError("INVALID_INPUT", "Expected JSON object", 400);
  return {
    goal:text(value.goal, "goal", 600, 3),
    tasks:list(value.tasks, "tasks", 120).map(t => ({
      chapterId:typeof t?.chapterId==="string"?t.chapterId.slice(0,100):null,
      title:text(t?.title,"task.title",130),
      completed:t.completed === true
    })),
    achievements:list(value.achievements,"achievements",12,1).map(a => ({
      id:text(a?.id, "achievement.id", 100),
      title:text(a?.title, "achievement.title", 100),
      chapterId:typeof a?.chapterId==="string"?a.chapterId.slice(0,100):null,
      condition:text(a?.condition, "achievement.condition", 400)
    })),
    language:value.language === "en" ? "en" : "zh"
  };
}
export function parseModelJson(content) {
  if (typeof content !== "string" || content.length > 100000) {
    throw new ContractError("INVALID_AI_RESPONSE", "Model returned no usable content", 502);
  }
  try {
    return JSON.parse(content.trim());
  } catch {
    throw new ContractError("INVALID_AI_RESPONSE", "AI did not return valid JSON", 502);
  }
}

// Validate the entire response first, then retain only novel tasks in a follow-up batch.
export function validateChapterBatch(value, existingTasks) {
  const batch = validateChapterOutput(value);
  const key = title => title.normalize('NFKC').trim().toLowerCase();
  const existing = new Set(existingTasks.map(task => key(task.title)));
  const tasks = batch.tasks.filter(task => {
    const title = key(task.title);
    if (existing.has(title)) return false;
    existing.add(title);
    return true;
  });
  if (!tasks.length)
    throw new ContractError('INVALID_AI_RESPONSE', '本批任务全部重复，请重试。原有进度已保留。', 502);
  return {...batch, tasks};
}
