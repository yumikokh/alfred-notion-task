import { execSync } from "child_process";

const TOGGL_API_BASE = "https://api.track.toggl.com/api/v9";

const getAuthHeader = () => {
  const token = process.env.TOGGL_API_TOKEN;
  return "Basic " + Buffer.from(`${token}:api_token`).toString("base64");
};

const fetchTogglProjects = async (workspaceId) => {
  const url = `${TOGGL_API_BASE}/workspaces/${workspaceId}/projects`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Toggl projects: ${response.status}`);
  }
  return response.json();
};

const startTimeEntry = async (workspaceId, description, projectId) => {
  const url = `${TOGGL_API_BASE}/workspaces/${workspaceId}/time_entries`;
  const now = new Date();
  const body = {
    created_with: "alfred-notion-task",
    description,
    project_id: projectId || null,
    start: now.toISOString(),
    duration: -1,
    workspace_id: parseInt(workspaceId),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start time entry: ${response.status} - ${errorText}`);
  }
  return response.json();
};

(async () => {
  try {
    if (!process.env.TOGGL_API_TOKEN || !process.env.TOGGL_WORKSPACE_ID) {
      throw new Error("Please set TOGGL_API_TOKEN and TOGGL_WORKSPACE_ID environment variables.");
    }

    const input = process.argv[2] || "";

    // JSONでない入力はそのまま出力（新規タスク作成用）
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch {
      // JSON形式でない場合は入力をそのまま出力して終了
      process.stdout.write(input);
      process.exit(0);
    }

    const { title, projectName } = parsed;
    const workspaceId = process.env.TOGGL_WORKSPACE_ID;

    let projectId = null;
    if (projectName) {
      const projects = await fetchTogglProjects(workspaceId);
      const matchedProject = projects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
      );
      if (matchedProject) {
        projectId = matchedProject.id;
      }
    }

    await startTimeEntry(workspaceId, title, projectId);

    // Togglアプリをリロード（起動していれば）
    try {
      execSync(`osascript -e '
        tell application "System Events"
          if exists (process "Toggl Track") then
            tell application "Toggl Track" to activate
            delay 0.3
            tell process "Toggl Track"
              keystroke "n" using command down
            end tell
          end if
        end tell
      '`);
    } catch {
      // Togglアプリが起動していない場合は無視
    }

    // 通知用にタイトルを直接出力（改行を除去）
    process.stdout.write(title.trim());
  } catch (error) {
    // エラー時は空文字を出力（通知しない）
    console.error(error.message);
    process.exit(1);
  }
})();
