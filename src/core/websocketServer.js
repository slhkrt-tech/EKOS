const crypto = require('crypto');

class WebSocketHub {
    constructor() {
        this.clients = new Set();
    }

    attach(server) {
        server.on('upgrade', (req, socket, head) => {
            if (req.url !== '/ws') {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            const key = req.headers['sec-websocket-key'];
            if (!key) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            const acceptKey = this.generateAcceptValue(key);
            const responseHeaders = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${acceptKey}`
            ];

            socket.write(responseHeaders.concat('\r\n').join('\r\n'));
            this.registerClient(socket);
        });
    }

    generateAcceptValue(secWebSocketKey) {
        const magicString = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        return crypto
            .createHash('sha1')
            .update(secWebSocketKey + magicString, 'binary')
            .digest('base64');
    }

    registerClient(socket) {
        this.clients.add(socket);

        socket.on('data', (buffer) => {
            const message = this.decodeFrame(buffer);
            if (message && message.opcode === 0x8) {
                socket.end();
            }
        });

        socket.on('close', () => this.clients.delete(socket));
        socket.on('error', () => this.clients.delete(socket));

        this.sendText(socket, JSON.stringify({ event: 'connected', message: 'WebSocket bağlantısı kuruldu.' }));
    }

    decodeFrame(buffer) {
        if (!buffer || buffer.length < 2) return null;
        const secondByte = buffer[1];
        const isMasked = Boolean(secondByte & 0x80);
        let payloadLength = secondByte & 0x7f;
        let offset = 2;

        if (payloadLength === 126) {
            payloadLength = buffer.readUInt16BE(offset);
            offset += 2;
        } else if (payloadLength === 127) {
            payloadLength = Number(buffer.readBigUInt64BE(offset));
            offset += 8;
        }

        let maskingKey;
        if (isMasked) {
            maskingKey = buffer.slice(offset, offset + 4);
            offset += 4;
        }

        const data = buffer.slice(offset, offset + payloadLength);
        const unmasked = Buffer.alloc(payloadLength);

        if (isMasked) {
            for (let i = 0; i < payloadLength; i++) {
                unmasked[i] = data[i] ^ maskingKey[i % 4];
            }
        } else {
            unmasked.set(data);
        }

        return {
            opcode: buffer[0] & 0x0f,
            data: unmasked.toString('utf8')
        };
    }

    buildFrame(data) {
        const payload = Buffer.from(data);
        let header;

        if (payload.length < 126) {
            header = Buffer.alloc(2);
            header[0] = 0x81;
            header[1] = payload.length;
        } else if (payload.length < 65536) {
            header = Buffer.alloc(4);
            header[0] = 0x81;
            header[1] = 126;
            header.writeUInt16BE(payload.length, 2);
        } else {
            header = Buffer.alloc(10);
            header[0] = 0x81;
            header[1] = 127;
            header.writeBigUInt64BE(BigInt(payload.length), 2);
        }

        return Buffer.concat([header, payload]);
    }

    sendText(socket, data) {
        if (socket.destroyed) return;
        try {
            socket.write(this.buildFrame(data));
        } catch (error) {
            this.clients.delete(socket);
        }
    }

    broadcast(data) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        for (const socket of this.clients) {
            this.sendText(socket, payload);
        }
    }
}

module.exports = new WebSocketHub();
