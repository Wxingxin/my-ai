const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env.local"),
});

const { createApp } = require("./src/app");

const port = Number.parseInt(process.env.PORT || "3001", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`Express API listening on http://localhost:${port}`);
});
