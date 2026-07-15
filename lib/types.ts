export type PRD = {
  problemStatement: string;
  targetUser: string;
  coreFeatures: string[];
  niceToHave: string[];
  constraints: string;
  successCriteria: string;
};

export type TaskEpic = {
  epic: string;
  items: string[];
};

export type GenerateResult = {
  prd: PRD;
  tasks: TaskEpic[];
  megaPrompt: string;
};

export type QAPair = {
  question: string;
  answer: string;
};

export type Stage = "dump" | "questions" | "loading" | "result";
