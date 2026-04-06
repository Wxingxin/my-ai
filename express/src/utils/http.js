function parseCookies(req) {
  const source = req.headers.cookie;
  if (!source) {
    return {};
  }

  return source.split(";").reduce((acc, part) => {
    const [name, ...rest] = part.trim().split("=");

    if (!name) {
      return acc;
    }

    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  return parts.join("; ");
}

function notFoundHandler(_req, res) {
  res.status(404).json({ ok: false, message: "接口不存在" });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);
  res.status(500).json({
    ok: false,
    message: error instanceof Error ? error.message : "服务器异常",
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  parseCookies,
  serializeCookie,
};
