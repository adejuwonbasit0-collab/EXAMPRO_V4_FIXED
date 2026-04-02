const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authMiddleware } = require("../middleware/auth");
const { validate, chatMessageRules } = require("../middleware/validation");

router.use(authMiddleware);

// Get or create a chat room
router.post("/room", async (req, res) => {
  try {
    const { other_user_id } = req.body;
    const userId = req.user.id;
    const roleId = req.user.role_id;

    // Determine student/admin or student/instructor
    let studentId, adminId, instructorId, roomType;
    if (roleId === 1) {
      // student initiating
      const [other] = await db.query("SELECT id,role_id FROM users WHERE id=?", [other_user_id]);
      if (!other[0]) return res.status(404).json({ message: "User not found" });
      studentId = userId;
      if (other[0].role_id === 2) { adminId = other_user_id; roomType = "student_admin"; }
      else if (other[0].role_id === 3) { instructorId = other_user_id; adminId = other_user_id; roomType = "student_instructor"; }
      else return res.status(400).json({ message: "Can only chat with admin or instructor" });
    } else {
      // admin/instructor responding
      const [student] = await db.query("SELECT id,role_id FROM users WHERE id=? AND role_id=1", [other_user_id]);
      if (!student[0]) return res.status(404).json({ message: "Student not found" });
      studentId = other_user_id;
      adminId = roleId === 2 ? userId : userId;
      instructorId = roleId === 3 ? userId : null;
      roomType = roleId === 2 ? "student_admin" : "student_instructor";
    }

    // Upsert room
    const [existing] = await db.query(
      "SELECT * FROM chat_rooms WHERE student_id=? AND admin_id=? AND room_type=? LIMIT 1",
      [studentId, adminId, roomType]
    );
    if (existing[0]) return res.json(existing[0]);

    const [result] = await db.query(
      "INSERT INTO chat_rooms (admin_id, student_id, instructor_id, room_type) VALUES (?,?,?,?)",
      [adminId, studentId, instructorId || null, roomType]
    );
    const [room] = await db.query("SELECT * FROM chat_rooms WHERE id=?", [result.insertId]);
    res.json(room[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get my rooms
router.get("/rooms", async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    let q;
    if (roleId === 1) {
      q = `SELECT r.*, 
        CASE WHEN r.room_type='student_admin' THEN ua.name ELSE ui.name END as other_name,
        CASE WHEN r.room_type='student_admin' THEN ua.email ELSE ui.email END as other_email
        FROM chat_rooms r
        LEFT JOIN users ua ON ua.id = r.admin_id
        LEFT JOIN users ui ON ui.id = r.instructor_id
        WHERE r.student_id = ? ORDER BY r.last_message_at DESC`;
    } else {
      q = `SELECT r.*, us.name as other_name, us.email as other_email
        FROM chat_rooms r
        JOIN users us ON us.id = r.student_id
        WHERE r.admin_id = ? OR r.instructor_id = ? ORDER BY r.last_message_at DESC`;
    }
    const [rows] = roleId === 1
      ? await db.query(q, [userId])
      : await db.query(q, [userId, userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get messages in a room
router.get("/rooms/:roomId/messages", async (req, res) => {
  try {
    const [room] = await db.query("SELECT * FROM chat_rooms WHERE id=?", [req.params.roomId]);
    if (!room[0]) return res.status(404).json({ message: "Room not found" });
    const r = room[0];
    const uid = req.user.id;
    if (r.student_id !== uid && r.admin_id !== uid && r.instructor_id !== uid)
      return res.status(403).json({ message: "Access denied" });

    const [msgs] = await db.query(
      `SELECT m.*, u.name as sender_name FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = ? ORDER BY m.created_at ASC LIMIT 200`,
      [req.params.roomId]
    );
    // Mark as read
    await db.query("UPDATE chat_messages SET is_read=1 WHERE room_id=? AND sender_id!=?", [req.params.roomId, uid]);
    res.json(msgs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Send message
router.post("/rooms/:roomId/messages", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message required" });
    const [room] = await db.query("SELECT * FROM chat_rooms WHERE id=?", [req.params.roomId]);
    if (!room[0]) return res.status(404).json({ message: "Room not found" });
    const r = room[0];
    const uid = req.user.id;
    if (r.student_id !== uid && r.admin_id !== uid && r.instructor_id !== uid)
      return res.status(403).json({ message: "Access denied" });

    const [result] = await db.query(
      "INSERT INTO chat_messages (room_id, sender_id, message) VALUES (?,?,?)",
      [req.params.roomId, uid, message.trim()]
    );
    await db.query("UPDATE chat_rooms SET last_message=?, last_message_at=NOW() WHERE id=?",
      [message.trim().substring(0, 100), req.params.roomId]);

    const [msg] = await db.query(
      "SELECT m.*, u.name as sender_name FROM chat_messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?",
      [result.insertId]
    );
    res.json(msg[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


// ══════════════════════════════════════════════════════════════════
// COURSE-SPECIFIC STUDENT ↔ INSTRUCTOR PRIVATE CHAT
// These routes use chat_conversations + chat_messages tables (separate
// from the existing chat_rooms / chat_messages general chat above).
// Frontend calls:
//   POST   /api/chat/start               { course_id }  → start/get conversation
//   GET    /api/chat/my-conversations                   → student: list all convs
//   GET    /api/chat/instructor/conversations            → instructor: list all convs
//   GET    /api/chat/conversation/:id/messages          → get messages
//   POST   /api/chat/conversation/:id/messages          → send message
//   POST   /api/chat/conversation/:id/read              → mark as read
// ══════════════════════════════════════════════════════════════════

const sc = require("../controllers/studentController");
const { instructorMiddleware } = require("../middleware/auth");

// Student: start or get a private conversation with a course's instructor
router.post("/start", sc.startConversation);

// Student: list all my instructor conversations
router.get("/my-conversations", sc.getMyConversations);

// Instructor: list all student conversations
router.get("/instructor/conversations", instructorMiddleware, sc.getInstructorConversations);

// Both: get messages in a conversation
router.get("/conversation/:id/messages", sc.getConversationMessages);

// Both: send a message
router.post("/conversation/:id/messages", sc.sendChatMessage);

// Both: mark conversation as read
router.post("/conversation/:id/read", sc.markConversationRead);

// ── CONTACTS: list people the current user can start a chat with ──
// Students see their admin + instructors of courses they enrolled in
// Admins/Instructors see their students
router.get("/contacts", async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    let rows = [];

    if (roleId === 1) {
      // Student — find admin of their school + instructors of their enrolled courses
      const [admins] = await db.query(
        `SELECT u.id, u.name, u.email, u.avatar, u.role_id
         FROM users u
         INNER JOIN admin_sites s ON s.user_id = u.id
         WHERE u.site_id IS NULL AND s.id = (SELECT site_id FROM users WHERE id=? LIMIT 1)
         LIMIT 5`,
        [userId]
      );
      const [instructors] = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.avatar, u.role_id
         FROM users u
         INNER JOIN courses c ON c.instructor_id = u.id
         INNER JOIN user_purchases up ON up.item_id = c.id AND up.item_type='course'
         WHERE up.user_id = ?
         LIMIT 20`,
        [userId]
      );
      rows = [...admins, ...instructors];
    } else {
      // Admin or Instructor — show students on their site
      const siteIdResult = await db.query(
        "SELECT id FROM admin_sites WHERE user_id=? LIMIT 1",
        [roleId === 2 ? userId : req.user.site_id || userId]
      );
      const siteId = siteIdResult[0]?.[0]?.id || null;
      if (siteId) {
        [rows] = await db.query(
          "SELECT id, name, email, avatar, role_id FROM users WHERE site_id=? AND role_id=1 ORDER BY name ASC LIMIT 50",
          [siteId]
        );
      }
    }
    res.json({ contacts: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;