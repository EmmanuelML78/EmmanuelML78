const fs = require("fs");

const username = "EmmanuelML78";
const token = process.env.GITHUB_TOKEN;

async function github(endpoint) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function getAllRepos() {
  let page = 1;
  let repos = [];

  while (true) {
    const result = await github(
      `/users/${username}/repos?per_page=100&page=${page}&type=owner`
    );

    repos = repos.concat(result);

    if (result.length < 100) break;

    page++;
  }

  return repos;
}

async function main() {
  const user = await github(`/users/${username}`);
  const repos = await getAllRepos();

  const ownRepos = repos.filter((repo) => !repo.fork);

  const stars = ownRepos.reduce(
    (total, repo) => total + repo.stargazers_count,
    0
  );

  const languages = {};

  for (const repo of ownRepos) {
    try {
      const data = await github(`/repos/${username}/${repo.name}/languages`);

      for (const [language, bytes] of Object.entries(data)) {
        languages[language] = (languages[language] || 0) + bytes;
      }
    } catch (error) {
      console.log(`Could not read languages for ${repo.name}`);
    }
  }

  const sortedLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const totalBytes = sortedLanguages.reduce(
    (sum, [, bytes]) => sum + bytes,
    0
  );

  const languageRows = sortedLanguages
    .map(([language, bytes], index) => {
      const percentage =
        totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;

      const y = 205 + index * 31;
      const barWidth = Math.round((percentage / 100) * 300);

      return `
        <text x="55" y="${y}" class="language">${escapeXml(language)}</text>

        <rect
          x="180"
          y="${y - 12}"
          width="300"
          height="8"
          rx="4"
          class="bar-bg"
        />

        <rect
          x="180"
          y="${y - 12}"
          width="${barWidth}"
          height="8"
          rx="4"
          class="bar"
        />

        <text x="500" y="${y}" class="percentage">${percentage}%</text>
      `;
    })
    .join("");

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="850"
  height="370"
  viewBox="0 0 850 370"
>

  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00c6ff"/>
      <stop offset="50%" stop-color="#b44cff"/>
      <stop offset="100%" stop-color="#ff8a00"/>
    </linearGradient>

    <style>
      .background {
        fill: #070d18;
        stroke: #30363d;
        stroke-width: 1;
      }

      .title {
        font-family: monospace;
        font-size: 20px;
        font-weight: bold;
        fill: #58a6ff;
      }

      .label {
        font-family: monospace;
        font-size: 14px;
        fill: #8b949e;
      }

      .value {
        font-family: monospace;
        font-size: 25px;
        font-weight: bold;
        fill: #f0f6fc;
      }

      .language {
        font-family: monospace;
        font-size: 14px;
        fill: #f0f6fc;
      }

      .percentage {
        font-family: monospace;
        font-size: 13px;
        fill: #8b949e;
      }

      .bar-bg {
        fill: #21262d;
      }

      .bar {
        fill: url(#gradient);
      }

      .status {
        font-family: monospace;
        font-size: 14px;
        fill: #3fb950;
      }
    </style>
  </defs>

  <rect
    x="1"
    y="1"
    width="848"
    height="368"
    rx="14"
    class="background"
  />

  <text x="35" y="45" class="title">
    &gt; ${username}@github
  </text>

  <line
    x1="35"
    y1="62"
    x2="815"
    y2="62"
    stroke="#30363d"
  />

  <!-- repositories -->

  <text x="55" y="105" class="value">
    ${ownRepos.length}
  </text>

  <text x="55" y="128" class="label">
    repositories
  </text>

  <!-- followers -->

  <text x="245" y="105" class="value">
    ${user.followers}
  </text>

  <text x="245" y="128" class="label">
    followers
  </text>

  <!-- stars -->

  <text x="435" y="105" class="value">
    ${stars}
  </text>

  <text x="435" y="128" class="label">
    stars
  </text>

  <!-- following -->

  <text x="625" y="105" class="value">
    ${user.following}
  </text>

  <text x="625" y="128" class="label">
    following
  </text>

  <line
    x1="35"
    y1="155"
    x2="815"
    y2="155"
    stroke="#30363d"
  />

  ${languageRows}

  <line
    x1="35"
    y1="325"
    x2="815"
    y2="325"
    stroke="#30363d"
  />

  <circle cx="55" cy="348" r="5" fill="#3fb950"/>

  <text x="70" y="353" class="status">
    Building AI-powered products
  </text>

</svg>
`;

  fs.mkdirSync("assets", { recursive: true });

  fs.writeFileSync(
    "assets/github-stats.svg",
    svg.trim(),
    "utf8"
  );

  console.log("✓ GitHub stats generated");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
