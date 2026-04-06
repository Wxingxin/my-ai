const express = require("express");

const { authRouter } = require("./routes/auth");
const { todosRouter } = require("./routes/todos");
const { newsRouter } = require("./routes/news");
const { chatRouter } = require("./routes/chat");
const { statusRouter } = require("./routes/status");
const { errorHandler, notFoundHandler } = require("./utils/http");

function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/todos", todosRouter);
  app.use("/api/news", newsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/profile", statusRouter("profile"));
  app.use("/api/setting", statusRouter("setting"));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
