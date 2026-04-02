/**
 * chatSocket.js
 * Real-time chat using Socket.io
 * Handles instructor ↔ student messaging and admin ↔ student messaging
 */

const db = require('../config/database');
const jwt = require('jsonwebtoken');

module.exports = function initChatSocket(server) {
  let io;
  try {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
  } catch (e) {
    console.warn('[chatSocket] socket.io not installed — real-time chat disabled. Run: npm install socket.io');
    return;
  }

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (_) {
      next(new Error('Invalid token'));
    }
  });

  // Track online users: userId → socketId
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (!userId) return socket.disconnect();

    onlineUsers.set(userId, socket.id);
    socket.join('user_' + userId);
    console.log(`[chat] User ${userId} connected`);

    // ── Join a conversation room ───────────────────────────────────────────────
    socket.on('join_conversation', async ({ conversation_id }) => {
      if (!conversation_id) return;
      // Verify user is part of this conversation
      try {
        const [rows] = await db.query(
          'SELECT id FROM chat_conversations WHERE id=? AND (student_id=? OR instructor_id=?)',
          [conversation_id, userId, userId]
        );
        if (rows.length) {
          socket.join('conv_' + conversation_id);
        }
      } catch (e) {
        console.error('[chat] join_conversation error:', e.message);
      }
    });

    // ── Send a message ─────────────────────────────────────────────────────────
    socket.on('send_message', async ({ conversation_id, message }) => {
      if (!conversation_id || !message?.trim()) return;
      try {
        // Verify sender is part of this conversation
        const [conv] = await db.query(
          'SELECT * FROM chat_conversations WHERE id=? AND (student_id=? OR instructor_id=?)',
          [conversation_id, userId, userId]
        );
        if (!conv.length) return;

        // Save to DB
        const [result] = await db.query(
          'INSERT INTO chat_messages (conversation_id, sender_id, message, created_at) VALUES (?,?,?,NOW())',
          [conversation_id, userId, message.trim()]
        );

        // Update conversation's last_message_at
        await db.query(
          'UPDATE chat_conversations SET last_message_at=NOW(), last_message=? WHERE id=?',
          [message.trim().substring(0, 200), conversation_id]
        );

        const newMsg = {
          id: result.insertId,
          conversation_id,
          sender_id: userId,
          message: message.trim(),
          created_at: new Date().toISOString(),
        };

        // Broadcast to all room members
        io.to('conv_' + conversation_id).emit('new_message', newMsg);

        // Also emit to the other user directly (even if not in room)
        const otherId = conv[0].student_id === userId
          ? conv[0].instructor_id
          : conv[0].student_id;
        if (otherId) {
          io.to('user_' + otherId).emit('message_notification', {
            conversation_id,
            from: userId,
            preview: message.trim().substring(0, 80),
          });
        }
      } catch (e) {
        console.error('[chat] send_message error:', e.message);
        socket.emit('chat_error', { message: 'Failed to send message' });
      }
    });

    // ── Mark messages as read ─────────────────────────────────────────────────
    socket.on('mark_read', async ({ conversation_id }) => {
      if (!conversation_id) return;
      try {
        await db.query(
          'UPDATE chat_messages SET is_read=1 WHERE conversation_id=? AND sender_id != ?',
          [conversation_id, userId]
        );
        socket.to('conv_' + conversation_id).emit('messages_read', { conversation_id, read_by: userId });
      } catch (e) {
        console.error('[chat] mark_read error:', e.message);
      }
    });

    // ── Typing indicator ──────────────────────────────────────────────────────
    socket.on('typing', ({ conversation_id, isTyping }) => {
      socket.to('conv_' + conversation_id).emit('user_typing', { userId, isTyping });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      console.log(`[chat] User ${userId} disconnected`);
    });
  });

  console.log('🔌 [chatSocket] Socket.io chat initialised');
  return io;
};
