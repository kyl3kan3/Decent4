/** authenticateSession must verify the host application's real session/token. */
export function createHealthAuth(authenticateSession) {
  return async function healthAuth(req, res, next) {
    if (req.path === '/health') return next();
    if (typeof authenticateSession !== 'function') {
      return res.status(503).json({ message: 'Session authentication is not configured', success: false });
    }
    try {
      const user = await authenticateSession(req);
      if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) {
        return res.status(401).json({ message: 'Authentication required', success: false });
      }
      // The trusted session result is the sole source of identity.
      req.userId = user.id;
      return next();
    } catch {
      return res.status(503).json({ message: 'Session authentication unavailable', success: false });
    }
  };
}
