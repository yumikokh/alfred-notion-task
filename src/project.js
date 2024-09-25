import alfy from "alfy";

const projectType = (type) => {
  switch (type) {
    case "Project":
      return "🔵";
    case "ClientWork":
      return "🟣";
    case "Routine":
      return "🟠";
    default:
      return "-";
  }
};

(async () => {
  const data = await alfy.fetch(
    `https://api.notion.com/v1/databases/${process.env.RELATION_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        sorts: [
          {
            property: "Status",
            direction: "ascending",
          },
          {
            property: "Type",
            direction: "ascending",
          },
          {
            property: "Date",
            direction: "ascending",
          },
        ],
      }),
      maxAge: 60 * 10 * 1000,
      transform: (response) => {
        const { results } = response;
        return results.map((element) => ({
          title: element.properties["Project Name"].title[0].text.content,
          id: element.id,
          url: element.url,
          properties: {
            Type: element.properties["Type"].select.name,
            Status: element.properties["Status"].status.name,
          },
        }));
      },
    }
  );

  const query = alfy.input.split(" ")[2];
  let items = [];
  if (query) {
    items = alfy.matches(query, data, "title").map((element) => ({
      title: `${projectType(element.properties.Type)} ${element.title}`,
      subtitle: `Status: ${element.properties.Status} / id: ${element.id}`,
      arg: element.id,
    }));
  } else {
    items = data.map((element) => ({
      title: `${projectType(element.properties.Type)} ${element.title}`,
      subtitle: `Status: ${element.properties.Status} / id: ${element.id}`,
      arg: element.id,
    }));
  }
  alfy.output(items);
})();
