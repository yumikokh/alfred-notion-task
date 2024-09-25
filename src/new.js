import alfy from "alfy";

const getJapanTime = () => {
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

(async () => {
  const title = process.env.split1; // タイトル取得
  let date = process.env.split2; // 日付取得 (optional)
  const projectId = process.env.projectId; // プロジェクトID取得

  if (date === "today" || date === "t") {
    const today = getJapanTime();
    date = today;
  } else {
    date = undefined;
  }

  const data = {
    parent: { database_id: process.env.TASK_DATABASE_ID },
    properties: {
      Task: {
        type: "title",
        title: [{ type: "text", text: { content: title } }],
      },
    },
  };

  if (date) {
    data.properties = {
      ...data.properties,
      Date: {
        date: { start: date },
      },
      Status: {
        status: { name: "Todo" },
      },
    };
  }

  if (projectId) {
    data.properties = {
      ...data.properties,
      Project: {
        type: "relation",
        relation: [{ id: projectId }],
      },
    };
  }

  const url = `https://api.notion.com/v1/pages`;
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_API_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  await alfy
    .fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })
    .then((res) => {
      if (!res.url) {
        alfy.error("Failed to create a new task.");
        return;
      }
      console.log(
        JSON.stringify({
          alfredworkflow: {
            arg: alfy.input,
            variables: {
              url: res.url,
              title,
              date,
            },
          },
        })
      );
      return res;
    });
})();
