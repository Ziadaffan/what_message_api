let io;

module.exports = {
    init: (ioInstance) => {
        io = ioInstance;
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
