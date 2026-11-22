import {exampleTaskCopies} from '../data/example-locale.js';

export function originalText(task) {
  return {title:task.title,description:task.description,completionCriteria:task.completionCriteria || '',achievementTitle:task.achievement.title};
}

export function taskCopies(goal,task) {
  return task.locales?.zh && task.locales?.en ? task.locales : exampleTaskCopies(goal,task);
}
