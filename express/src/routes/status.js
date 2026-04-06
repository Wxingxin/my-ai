const express = require("express");

function statusRouter(name) {
  const router = express.Router();

  router.all("/", (_req, res) => {
    res.status(501).json({
      ok: false,
      message: `${name} 接口在 Next 项目中尚未实现，Express 版本保留为未实现状态`,
    });
  });

  return router;
}

module.exports = {
  statusRouter,
};
