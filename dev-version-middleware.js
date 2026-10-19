const { execFile } = require('child_process');
const { promisify } = require('util');
const { version } = require('./package.json');

const execFileAsync = promisify(execFile);

// 仅供开发服务使用：读取真实HEAD，不改静态文件，避免版本变化触发整页刷新。
module.exports = function createDevVersionMiddleware(cwd = __dirname) {
  let pending = null;
  let latest = null;
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    try {
      if (!pending) {
        pending = execFileAsync('git', ['rev-parse', '--verify', 'HEAD'], { cwd, timeout: 2000, windowsHide: true })
          .then(({ stdout }) => {
            const now = new Date();
            latest = {
              gitHash: stdout.trim().substring(0, 8),
              buildTime: [now.getFullYear(), now.getMonth() + 1, now.getDate()]
                .map((part, index) => (index ? String(part).padStart(2, '0') : String(part)))
                .join('-'),
              version,
            };
            return latest;
          })
          .finally(() => {
            pending = null;
          });
      }
      const info = await pending;
      res.setHeader('Cache-Control', 'no-store');
      return res.json(info);
    } catch {
      // rebase短暂没有HEAD时保留最近版本；没有Git信息时继续读取原静态文件。
      if (!latest) return next();
      res.setHeader('Cache-Control', 'no-store');
      return res.json(latest);
    }
  };
};
