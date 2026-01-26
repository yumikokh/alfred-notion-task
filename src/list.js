import alfy from "alfy";

const STATUS = {
  Todo: { name: "Ready", icon: "📋" },
  InProgress: { name: "In Progress", icon: "⏳" },
  Done: { name: "Done", icon: "🎉" },
};

export const getJapanTime = () => {
  const now = new Date();
  const japanTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const year = japanTime.getFullYear();
  const month = String(japanTime.getMonth() + 1).padStart(2, "0");
  const day = String(japanTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStatusIcon = (statusName) => {
  const status = Object.values(STATUS).find((s) => s.name === statusName);
  return status?.icon || "-";
};

const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDate = (startStr, endStr) => {
  if (!startStr) return "-";
  const start = new Date(startStr);
  const today = new Date();
  const isToday =
    start.getFullYear() === today.getFullYear() &&
    start.getMonth() === today.getMonth() &&
    start.getDate() === today.getDate();

  const datePrefix = isToday
    ? ""
    : `${start.getMonth() + 1}/${start.getDate()} `;

  if (endStr) {
    return `${datePrefix}${formatTime(start)}-${formatTime(new Date(endStr))}`;
  }
  return `${datePrefix}${formatTime(start)}`;
};

const formatHours = (hours) => (hours ? `${hours}h` : "-");

const buildStatusDateFilter = (statusValue, today) => ({
  and: [
    { property: "Status", status: { equals: statusValue } },
    { property: "Date", date: { on_or_before: today } },
  ],
});

const buildTaskFilter = (today) => ({
  or: [
    buildStatusDateFilter(STATUS.Todo.name, today),
    buildStatusDateFilter(STATUS.InProgress.name, today),
    {
      and: [
        { property: "Date", date: { on_or_after: `${today}T00:00:00+09:00` } },
        { property: "Date", date: { before: `${today}T23:59:59+09:00` } },
      ],
    },
  ],
});

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

  if (!!alfy.input) {
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
    return;
  }

  const headers = {
    Authorization: `Bearer ${process.env.NOTION_API_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
  const today = getJapanTime();

  const [taskResults, projects] = await Promise.all([
    alfy.fetch(`https://api.notion.com/v1/databases/${process.env.TASK_DATABASE_ID}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: buildTaskFilter(today),
        sorts: [{ property: "Status", direction: "ascending" }],
      }),
      maxAge: 60 * 1000, // タスクは1分キャッシュ
      transform: (response) =>
        response.results.map((element) => ({
          title: element.properties["Task"].title[0].text.content,
          id: element.id,
          url: element.url,
          dateStart: element.properties["Date"].date?.start || null,
          dateEnd: element.properties["Date"].date?.end || null,
          status: element.properties["Status"].status.name,
          estimate: element.properties["Estimate Hours"].number || 0,
          actual: element.properties["Actual Hours"].number || 0,
          projectId: element.properties["Project"]?.relation?.[0]?.id || null,
        })),
    }),
    alfy.fetch(
      `https://api.notion.com/v1/databases/${process.env.RELATION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
        maxAge: 60 * 1000 * 10, // プロジェクトは10分キャッシュ
        transform: (response) =>
          Object.fromEntries(
            response.results.map((p) => [
              p.id,
              p.properties["Project Name"]?.title?.[0]?.text?.content || "",
            ])
          ),
      }
    ),
  ]);

  const tasks = [
    ...taskResults.map((task) => {
      const projectName = task.projectId ? projects[task.projectId] : null;
      const taskData = JSON.stringify({
        title: task.title,
        projectName: projectName || "",
        url: task.url,
      });
      const projectLabel = projectName ? `[${projectName}] ` : "";
      return {
        title: `${getStatusIcon(task.status)} ${task.title}`,
        subtitle: `${projectLabel}${formatDate(task.dateStart, task.dateEnd)} / Estimate: ${formatHours(task.estimate)} / Actual: ${formatHours(task.actual)}`,
        arg: taskData,
        mods: {
          cmd: {
            arg: task.url,
            subtitle: "Open in Notion",
          },
        },
      };
    }),
    {
      title: `🕒️ Total estimate: ${taskResults.reduce(
        (acc, task) => acc + task.estimate,
        0
      )} hours`,
    },
  ];

  alfy.output([
    ...tasks,
    {
      title: "📝 Add new task",
      subtitle: "Type a task name.",
    },
  ]);
})();
