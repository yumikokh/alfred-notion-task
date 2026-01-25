import alfy from "alfy";

export const getJapanTime = () => {
  // 現在時刻を取得
  const now = new Date();

  // 日本標準時 (JST) に変換
  const japanTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );

  // 年、月、日を取得
  const year = japanTime.getFullYear();
  const month = ("0" + (japanTime.getMonth() + 1)).slice(-2); // 月は0から始まるので+1
  const day = ("0" + japanTime.getDate()).slice(-2);

  // フォーマット YYYY-MM-DD
  return `${year}-${month}-${day}`;
};

const STATUS = {
  "Todo": "Ready",
  "InProgress": "In Progress",
  Done: "Done",
};

const status = (status) => {
  switch (status) {
    case STATUS.Todo:
      return "🟡";
    case STATUS.InProgress:
      return "🔵";
    case STATUS.Done:
      return "🟢";
    default:
      return "-";
  }
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

  const month = start.getMonth() + 1;
  const day = start.getDate();
  const datePrefix = isToday ? "" : `${month}/${day} `;

  if (endStr) {
    const end = new Date(endStr);
    return `${datePrefix}${formatTime(start)}-${formatTime(end)}`;
  }
  return `${datePrefix}${formatTime(start)}`;
};

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

  const url = `https://api.notion.com/v1/databases/${process.env.TASK_DATABASE_ID}/query`;
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_API_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
  const today = getJapanTime();

  const data = {
    filter: {
      or: [
        {
          and: [
            {
              property: "Status",
              status: {
                equals: STATUS.Todo,
              },
            },
            {
              property: "Date",
              date: {
                on_or_before: today,
              },
            },
          ],
        },
        {
          and: [
            {
              property: "Status",
              status: {
                equals: STATUS.InProgress,
              },
            },
            {
              property: "Date",
              date: {
                on_or_before: today,
              },
            },
          ],
        },
        {
          property: "Date",
          date: {
            equals: today,
          },
        },
      ],
    },
    sorts: [
      {
        property: "Status",
        direction: "descending",
      },
    ],
  };

  const tasks = await alfy
    .fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      maxAge: 60 * 1000 * 1,
      transform: (response) => {
        const { results } = response;
        return results.map((element) => ({
          title: element.properties["Task"].title[0].text.content,
          id: element.id,
          url: element.url,
          dateStart: element.properties["Date"].date?.start || null,
          dateEnd: element.properties["Date"].date?.end || null,
          status: element.properties["Status"].status.name,
          estimate: element.properties["Estimate Hours"].number || 0,
          actual: element.properties["Actual Hours"].number || 0,
        }));
      },
    })
    .then((res) => {
      return [
        ...res.map((task) => {
          return {
            title: `${status(task.status)} ${task.title}`,
            subtitle: `Date: ${formatDate(task.dateStart, task.dateEnd)} / Estimate: ${task.estimate ? task.estimate + "h" : "-"} / Actual: ${task.actual ? task.actual + "h" : "-"}`,
            arg: task.url,
          };
        }),
        {
          title: `🕒️ Total estimate: ${res.reduce(
            (acc, task) => acc + task.estimate,
            0
          )} hours`,
        },
      ];
    });

  alfy.output([
    ...tasks,
    {
      title: "📝 Add new task",
      subtitle: "Type a task name.",
    },
  ]);
})();
