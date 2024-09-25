import alfy from "alfy";

(async () => {
  if (
    !process.env.TASK_DATABASE_ID ||
    !process.env.RELATION_DATABASE_ID ||
    !process.env.NOTION_API_TOKEN
  ) {
    alfy.error("Please set environment variables.");
    return;
  }

  const [title, date] = alfy.input.split(" ");

  alfy.output([
    {
      title: ["t", "today"].includes(date)
        ? `「${title}」 today`
        : `「${title}」`,
      subtitle: `${
        !["t", "today"].includes(date)
          ? 'add "today" or "t" to add today\'s date. '
          : ""
      }⌘ + Enter to add Project.`,
      arg: `${title} ${date ? date : "NoDate"} `,
    },
  ]);
})();
