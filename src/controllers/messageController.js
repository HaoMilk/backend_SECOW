import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import asyncHandler from "../middleware/asyncHandler.js";

// @desc    Lấy danh sách cuộc trò chuyện
// @route   GET /api/v1/messages/conversations
// @access  Private
export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "name email avatar")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      conversations: conversations.map((conv) => ({
        id: conv._id,
        participants: conv.participants.filter(
          (p) => p._id.toString() !== req.user._id.toString()
        ),
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount.get(req.user._id.toString()) || 0,
        updatedAt: conv.updatedAt,
      })),
    },
  });
});

// @desc    Lấy tin nhắn trong cuộc trò chuyện
// @route   GET /api/v1/messages/conversations/:conversationId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Kiểm tra quyền truy cập
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy cuộc trò chuyện",
    });
  }

  if (!conversation.participants.includes(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: "Không có quyền truy cập cuộc trò chuyện này",
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "name avatar")
    .populate("receiver", "name avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Đánh dấu đã đọc
  await Message.updateMany(
    {
      conversation: conversationId,
      receiver: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  // Reset unread count
  conversation.unreadCount.set(req.user._id.toString(), 0);
  await conversation.save();

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse(), // Đảo ngược để hiển thị từ cũ đến mới
    },
  });
});

// @desc    Gửi tin nhắn
// @route   POST /api/v1/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, images } = req.body;

  if (!receiverId || !content) {
    return res.status(400).json({
      success: false,
      message: "Người nhận và nội dung là bắt buộc",
    });
  }

  // Tìm hoặc tạo conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, receiverId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, receiverId],
      unreadCount: new Map(),
    });
  }

  // Tạo tin nhắn
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    receiver: receiverId,
    content,
    images: images || [],
  });

  // Cập nhật conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageAt = new Date();

  // Tăng unread count cho receiver
  const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
  conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);

  await conversation.save();

  await message.populate("sender", "name avatar");
  await message.populate("receiver", "name avatar");

  res.status(201).json({
    success: true,
    message: "Đã gửi tin nhắn",
    data: {
      message,
    },
  });
});

// @desc    Đánh dấu đã đọc
// @route   PUT /api/v1/messages/:messageId/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy tin nhắn",
    });
  }

  if (message.receiver.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền đánh dấu tin nhắn này",
    });
  }

  message.isRead = true;
  message.readAt = new Date();
  await message.save();

  // Cập nhật unread count trong conversation
  const conversation = await Conversation.findById(message.conversation);
  if (conversation) {
    conversation.unreadCount.set(req.user._id.toString(), 0);
    await conversation.save();
  }

  res.status(200).json({
    success: true,
    message: "Đã đánh dấu đã đọc",
  });
});

