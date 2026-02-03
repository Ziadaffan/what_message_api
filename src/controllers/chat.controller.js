const prisma = require('../lib/db');

exports.getChats = async (req, res) => {
    try {
        // Get chats where the user is a participant
        const chatUsers = await prisma.chatUser.findMany({
            where: { userId: req.user.id },
            include: {
                chat: {
                    include: {
                        users: {      // ChatUser[]
                            include: {
                                user: {    // User object
                                    select: {
                                        id: true,
                                        username: true,
                                        avatar: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Transform so frontend gets the "friend" (other user)
        const chats = chatUsers.map(cu => {
            const friend = cu.chat.users.find(u => u.user.id !== req.user.id);

            return {
                id: cu.chat.id,
                type: cu.chat.type,
                avatar: friend.user.avatar,
                username: friend.user.username,
                friend,
            };
        });

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
