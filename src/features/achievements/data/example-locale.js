import {currentLocale} from '../lib/locale.js';

// Only the built-in IELTS example has a bilingual edition. Display copies keep
// record IDs, user edits, difficulty and progress in their original save.
const english = new Map([
  ['从英语零基础到 IELTS 9','English from scratch to IELTS Band 9'],
  ['我要从零基础学英语，最终达到雅思9分','Start learning English from scratch and work toward IELTS Band 9.'],
  ['字母与发音','Letters and sounds'], ['认识基础字母、发音和最早的词汇。','Learn the alphabet, its sounds and your first words.'],
  ['基础语法','Grammar basics'], ['构建可理解的英语句子。','Build clear English sentences.'],
  ['日常表达','Everyday conversation'], ['让英语真正进入日常交流。','Use English in everyday conversations.'],
  ['学术英语','Academic English'], ['进入复杂阅读与写作阶段。','Tackle more complex reading and writing.'],
  ['IELTS 冲刺','IELTS preparation'], ['听说读写，挑战更高的目标。','Practise all four IELTS skills.'],
  ['你在不经意间迈出了重要的一步。','You took an important step without noticing.'],
  ['有些努力，只有系统偷偷记得。','Some efforts are quietly remembered.'],
  ['认识并写出26个英文字母','Identify and write all 26 letters'], ['完成一遍字母识别与书写。','Identify each letter and write the alphabet once.'],
  ['掌握最常见的字母发音','Learn common letter sounds'], ['完成一份个人发音清单。','Make your own pronunciation checklist.'],
  ['记住30个高频单词','Learn 30 common words'], ['可以主动回忆这些词的含义。','Recall the meaning of each word from memory.'],
  ['进行一分钟英语自我介绍','Introduce yourself in one minute'], ['能独立说完自己的名字与基本信息。','Say your name and a few facts about yourself without notes.'],
  ['辨认10组常见元音发音','Distinguish ten sets of vowel sounds'], ['用示例词区分不同发音。','Use example words to tell the sounds apart.'],
  ['用英语介绍自己的一天','Describe your day in English'], ['写出至少5句完整表达。','Write at least five complete sentences.'],
  ['理解主语、动词、宾语','Identify subjects, verbs and objects'], ['写出8个结构正确的简单句。','Write eight well-formed simple sentences.'],
  ['掌握一般现在时','Use the simple present'], ['使用10个例句描述日常习惯。','Describe everyday habits in ten sentences.'],
  ['练习疑问句和否定句','Practise questions and negatives'], ['将5个陈述句分别改写。','Rewrite five statements in both forms.'],
  ['掌握基本介词','Learn basic prepositions'], ['用位置介词描述房间内的物品。','Use prepositions to locate objects in a room.'],
  ['掌握过去时基础','Use the simple past'], ['叙述昨天发生的3件事。','Describe three things that happened yesterday.'],
  ['完成一次点餐对话','Order a meal in English'], ['模拟从询问菜单到结账的完整过程。','Act out a conversation from ordering to paying the bill.'],
  ['表达方向与交通方式','Give directions and describe transport'], ['能独立描述从家到学校的路线。','Explain the route from home to school.'],
  ['进行三分钟英语交流','Have a three-minute conversation'], ['保持对话并适时提出问题。','Keep the conversation going with follow-up questions.'],
  ['听懂一段简短日常播客','Follow a short everyday podcast'], ['记录要点并复述。','Note the main points and retell them.'],
  ['用英语做简短演讲','Give a short talk in English'], ['有开头、主体和结尾。','Include an opening, a main point and a conclusion.'],
  ['阅读一篇短学术文章','Read a short academic article'], ['标注观点、论据和生词。','Mark the claims, evidence and unfamiliar words.'],
  ['完成200词的观点文章','Write a 200-word opinion piece'], ['呈现清楚的论点与例子。','Support a clear argument with examples.'],
  ['总结一段学术讲座','Summarise an academic lecture'], ['用要点还原讲座结构。','Outline the lecture using its key points.'],
  ['区分正式与非正式表达','Distinguish formal and informal language'], ['改写一组常见句子。','Rewrite everyday sentences in a different register.'],
  ['完成一次雅思听力模拟','Take an IELTS listening practice test'], ['记录错题类型与原因。','Record which questions you missed and why.'],
  ['完成一次雅思阅读模拟','Take an IELTS reading practice test'], ['复盘阅读策略与定位问题。','Review your reading strategy and where it failed.'],
  ['完成一篇Task 2作文','Write an IELTS Task 2 essay'], ['按评分维度检查论证与语言。','Review your argument and language against the marking criteria.'],
  ['完成一次口语模拟','Take a mock speaking test'], ['练习三个 Part 的完整答题。','Answer questions from all three parts.'],
  ['分析四项能力薄弱点','Identify gaps across all four skills'], ['制定下一周的针对性提升计划。','Plan focused practice for the coming week.'],
  ['延伸挑战：通过自己的方式完成任务。','Choose your own approach to this extension task.']
]);

export function exampleText(goal, value) {
  if (currentLocale() !== 'en' || goal?.metadata?.source !== 'example') return value;
  return english.get(value) ?? value;
}

export function exampleView(goal) {
  if (!goal || goal.metadata?.source !== 'example' || currentLocale() !== 'en') return goal;
  const translate = record => ({...record, title:exampleText(goal,record.title), description:exampleText(goal,record.description)});
  return {...translate(goal), hidden:goal.hidden.map(translate), chapters:goal.chapters.map(chapter => ({
    ...translate(chapter), tasks:chapter.tasks.map(translate), hidden:chapter.hidden.map(translate)
  }))};
}
