const prisma = require('../lib/db');

exports.getChats = async (req, res) => {
    try {
        const chatUsers = await prisma.chatUser.findMany({
            where: { userId: req.user.id },
            include: {
                chat: {
                    include: {
                        users: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        email: true,
                                        avatar: true,
                                        isOnline: true
                                    }
                                }
                            }
                        },
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Transform to match frontend expected structure
        const chats = chatUsers.map((cu) => {
            const friend = cu.chat.users.find(u => u.user.id !== req.user.id);

            // Get last message
            const lastMessageData = cu.chat.messages[0];
            const lastMessage = lastMessageData ? {
                id: lastMessageData.id,
                content: lastMessageData.content,
                senderId: lastMessageData.senderId,
                createdAt: lastMessageData.createdAt,
            } : null;

            return {
                id: cu.chat.id,
                friendId: friend.user.id,  // Direct friend user ID
                friend: {
                    id: friend.user.id,
                    username: friend.user.username,
                    email: friend.user.email,
                    avatar: friend.user.avatar,
                    isOnline: friend.user.isOnline
                },
                lastMessage,
                createdAt: cu.chat.createdAt
            };
        });

        // Sort by last message time (most recent first)
        chats.sort((a, b) => {
            const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
            const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
            return bTime - aTime;
        });

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createOrGetChat = async (req, res) => {
    try {
        const { friendId } = req.body;
        const currentUserId = req.user.id;

        if (!friendId) {
            return res.status(400).json({ message: 'friendId is required' });
        }

        if (friendId === currentUserId) {
            return res.status(400).json({ message: 'Cannot create chat with yourself' });
        }

        // Check if chat already exists
        const existingChatUser = await prisma.chatUser.findFirst({
            where: {
                userId: currentUserId
            },
            include: {
                chat: {
                    include: {
                        users: {
                            where: {
                                userId: friendId
                            }
                        }
                    }
                }
            }
        });

        // If found, check if the friend is actually in this chat
        if (existingChatUser && existingChatUser.chat.users.length > 0) {
            const chatId = existingChatUser.chat.id;

            // Get full chat data
            const chat = await prisma.chat.findUnique({
                where: { id: chatId },
                include: {
                    users: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    avatar: true,
                                    isOnline: true
                                }
                            }
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            const friend = chat.users.find(u => u.user.id === friendId);
            const lastMessageData = chat.messages[0];
            const lastMessage = lastMessageData ? {
                id: lastMessageData.id,
                content: lastMessageData.content,
                senderId: lastMessageData.senderId,
                createdAt: lastMessageData.createdAt,
            } : null;

            return res.json({
                id: chat.id,
                friendId: friend.user.id,
                friend: {
                    id: friend.user.id,
                    username: friend.user.username,
                    email: friend.user.email,
                    avatar: friend.user.avatar,
                    isOnline: friend.user.isOnline
                },
                lastMessage,
                createdAt: chat.createdAt
            });
        }

        // Create new chat
        const newChat = await prisma.chat.create({
            data: {
                type: 'private',
                name: null,
                users: {
                    create: [
                        { user: { connect: { id: currentUserId } } },
                        { user: { connect: { id: friendId } } }
                    ]
                }
            },
            include: {
                users: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                avatar: true,
                                isOnline: true
                            }
                        }
                    }
                }
            }
        });

        const friend = newChat.users.find(u => u.user.id === friendId);

        res.status(201).json({
            id: newChat.id,
            friendId: friend.user.id,
            friend: {
                id: friend.user.id,
                username: friend.user.username,
                email: friend.user.email,
                avatar: friend.user.avatar,
                isOnline: friend.user.isOnline
            },
            lastMessage: null,
            createdAt: newChat.createdAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
