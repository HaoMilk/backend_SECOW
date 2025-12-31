import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index - Đảm bảo mỗi cặp user chỉ có 1 conversation
conversationSchema.index({ participants: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;

