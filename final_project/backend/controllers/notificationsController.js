const db = require("../config/database");

exports.getMyNotifications = async (req, res) => {
  try {
    const {type,unread_only} = req.query;
    let q = `SELECT n.*,u.name as sender_name FROM notifications n LEFT JOIN users u ON n.sender_id=u.id WHERE n.user_id=?`;
    const p = [req.user.id];
    if (type&&type!=='all') { q+=" AND n.type=?"; p.push(type); }
    if (unread_only==='true') { q+=" AND n.is_read=FALSE"; }
    q += " ORDER BY n.created_at DESC LIMIT 100";
    const [notifications] = await db.query(q,p);
    const [[{unread}]] = await db.query("SELECT COUNT(*) as unread FROM notifications WHERE user_id=? AND is_read=FALSE", [req.user.id]);
    res.json({ notifications, unread });
  } catch (err) { res.status(500).json({ message:"Failed to fetch notifications" }); }
};

exports.markRead = async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ message:"Failed" }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read=TRUE WHERE user_id=?", [req.user.id]);
    res.json({ ok:true, message:"All marked as read" });
  } catch (err) { res.status(500).json({ message:"Failed" }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await db.query("DELETE FROM notifications WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ message:"Failed" }); }
};
