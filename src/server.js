const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const readline = require('readline');
const app = express();
const port = process.env.PORT || 3000;
const helmet = require('helmet');
const cors = require('cors');

// Server configuration - Set to false for HTTP, true for HTTPS
// Can be controlled via environment variable: USE_HTTPS=true
// For development: USE_HTTPS=false (default)
// For production: USE_HTTPS=true (requires SSL certificates)
const USE_HTTPS = process.env.USE_HTTPS === 'true' || false;

console.log('=== Server Configuration ===');
console.log(`USE_HTTPS environment variable: ${process.env.USE_HTTPS}`);
console.log(`USE_HTTPS resolved value: ${USE_HTTPS}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log('=============================');

// Rate limiting map
const rateLimitMap = new Map();
const MESSAGE_RATE_LIMIT = 1000; // 1 message per second
const MAX_MESSAGE_LENGTH = 500;

// IP ban list
const bannedIPs = new Map(); // Changed to Map to store IP -> reason
const banFilePath = path.join(__dirname, '..', 'data', 'banned-ips.json');

const logFilePath = path.join(__dirname, '..', 'data', 'chat.log');

// Load banned IPs from file
function loadBannedIPs() {
    try {
        if (fs.existsSync(banFilePath)) {
            const data = fs.readFileSync(banFilePath, 'utf8');
            const bannedData = JSON.parse(data);
            
            // Handle both old format (array) and new format (object)
            if (Array.isArray(bannedData)) {
                bannedData.forEach(ip => bannedIPs.set(ip, 'No reason provided'));
            } else {
                Object.entries(bannedData).forEach(([ip, reason]) => bannedIPs.set(ip, reason));
            }
            
            console.log(`Loaded ${bannedIPs.size} banned IPs`);
        }
    } catch (error) {
        console.error('Error loading banned IPs:', error);
    }
}

// Save banned IPs to file
function saveBannedIPs() {
    try {
        const bannedData = {};
        bannedIPs.forEach((reason, ip) => {
            bannedData[ip] = reason;
        });
        fs.writeFileSync(banFilePath, JSON.stringify(bannedData, null, 2));
    } catch (error) {
        console.error('Error saving banned IPs:', error);
    }
}

// Load banned IPs on startup
loadBannedIPs();

// Utility functions
function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    fs.appendFile(logFilePath, logEntry + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

function sanitizeMessage(message) {
    return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
}

function isRateLimited(clientId) {
    const now = Date.now();
    const lastMessage = rateLimitMap.get(clientId);
    
    if (!lastMessage || (now - lastMessage) >= MESSAGE_RATE_LIMIT) {
        rateLimitMap.set(clientId, now);
        return false;
    }
    // Log rate limit violation
    logMessage(`Rate limit violation by client ${clientId}`);
    return true;
}

function generateUniqueUsername() {
    const adjectives = [
        'Swift', 'Bright', 'Silent', 'Noble', 'Mystic', 'Cosmic', 'Shadow', 'Golden',
        'Mighty', 'Bold', 'Fierce', 'Strong', 'Brave', 'Wild', 'Steel', 'Iron',
        'Crystal', 'Storm', 'Thunder', 'Frost', 'Flame', 'Ocean', 'Wind', 'Earth',
        'Ancient', 'Lunar', 'Solar', 'Astral', 'Ethereal', 'Divine', 'Sacred', 'Arcane',
        'Crimson', 'Azure', 'Violet', 'Emerald', 'Silver', 'Obsidian', 'Jade', 'Ruby',
        'Clever', 'Wise', 'Cunning', 'Loyal', 'Free', 'Pure', 'Dark', 'Light'
    ];
    
    const nouns = [
        'Fox', 'Eagle', 'Wolf', 'Phoenix', 'Dragon', 'Tiger', 'Raven', 'Lion',
        'Griffin', 'Sphinx', 'Pegasus', 'Unicorn', 'Kraken', 'Hydra', 'Chimera', 'Basilisk',
        'Hawk', 'Panther', 'Cobra', 'Shark', 'Falcon', 'Viper', 'Lynx', 'Jaguar',
        'Star', 'Moon', 'Sun', 'Comet', 'Nova', 'Galaxy', 'Nebula', 'Void',
        'Knight', 'Warrior', 'Guardian', 'Hunter', 'Blade', 'Arrow', 'Shield', 'Crown',
        'Flame', 'Storm', 'Thunder', 'Lightning', 'Glacier', 'Volcano', 'Tornado', 'Tsunami'
    ];

    const adjective = adjectives[crypto.randomInt(0, adjectives.length)];
    const noun = nouns[crypto.randomInt(0, nouns.length)];
    const number = crypto.randomInt(0, 1000);
    return `${adjective}${noun}${number}`;
}

// Security middleware
let helmetConfig;

if (USE_HTTPS) {
    // HTTPS mode - Full CSP security
    const cspDirectives = {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "wss:", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'"],
        upgradeInsecureRequests: []
    };
    
    helmetConfig = {
        contentSecurityPolicy: {
            directives: cspDirectives
        }
    };
    console.log('Using HTTPS CSP configuration');
} else {
    // HTTP mode - Minimal CSP to avoid conflicts
    helmetConfig = {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"]
            }
        },
        hsts: false
    };
    console.log('Using HTTP configuration (CSP disabled)');
}

app.use(helmet(helmetConfig));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'room21-secret-key-change-in-production',
    name: USE_HTTPS ? 'connect.sid.secure' : 'connect.sid.http',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: USE_HTTPS, // Dynamic based on server type
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - Protocol: ${req.protocol} - Secure: ${req.secure}`);
    next();
});

app.use(express.static(path.join(__dirname, 'public'), { 
    maxAge: process.env.NODE_ENV === 'production' ? 86400000 : 0, // 1 day in production, 0 in dev
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        }
        
        // Debug: log static file requests
        console.log(`Serving static file: ${path}`);
    }
}));

const rootLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.get('/', rootLimiter, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/stats', (req, res) => {
    res.json({
        activeUsers: wss.clients.size,
        timestamp: new Date().toISOString()
    });
});

// Server setup - HTTP or HTTPS based on configuration
let server;

if (USE_HTTPS) {
    console.log('Starting HTTPS server...');
    try {
        const certOptions = {
            cert: fs.readFileSync(path.join(__dirname, 'public', 'assets', 'cert', 'cert.pem')),
            key: fs.readFileSync(path.join(__dirname, 'public', 'assets', 'cert', 'key.pem'))
        };
        server = https.createServer(certOptions, app);
        console.log('HTTPS certificates loaded successfully');
    } catch (error) {
        console.error('Error loading HTTPS certificates:', error.message);
        console.log('Falling back to HTTP server...');
        server = http.createServer(app);
    }
} else {
    console.log('Starting HTTP server...');
    server = http.createServer(app);
}

const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        // Check if IP is banned
        const clientIP = info.req.headers['x-forwarded-for'] || info.req.connection.remoteAddress;
        if (bannedIPs.has(clientIP)) {
            console.log(`Blocked connection from banned IP: ${clientIP} (${bannedIPs.get(clientIP)})`);
            return false;
        }
        return true;
    }
});

// Store connected clients with metadata
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7);
    const username = generateUniqueUsername();
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Store client metadata
    const clientData = {
        id: clientId,
        username: username,
        ip: clientIP,
        connectedAt: new Date(),
        lastActivity: new Date()
    };
    
    ws.clientData = clientData;
    connectedClients.set(clientId, clientData);

    console.log(`Client ${username} (${clientId}) connected from ${clientIP}`);
    logMessage(`Client ${username} (${clientId}) connected from ${clientIP}`);
    
    // Send welcome message to the new client
    ws.send(JSON.stringify({
        type: 'system',
        message: `Welcome to Room21! You are ${username}`,
        timestamp: new Date().toISOString()
    }));
    
    // Notify others about new user
    broadcastToOthers(ws, {
        type: 'user_joined',
        username: 'System',
        message: `${username} joined the chat`,
        timestamp: new Date().toISOString()
    });
    
    // Send updated user count
    broadcastUserCount();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const clientData = ws.clientData;
            
            // Update last activity
            clientData.lastActivity = new Date();
            
            // Rate limiting check
            if (isRateLimited(clientData.id)) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'You are sending messages too quickly. Please slow down.',
                    timestamp: new Date().toISOString()
                }));
                return;
            }
            
            // Handle different message types
            if (data.command === '/clear') {
                handleClearCommand(ws);
            } else if (data.command === '/users') {
                handleUsersCommand(ws);
            } else if (data.command && data.command.startsWith('/nick ')) {
                handleNickCommand(ws, data.command);
            } else if (data.message) {
                handleChatMessage(ws, data);
            }
            
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
                timestamp: new Date().toISOString()
            }));
        }
    });

    ws.on('close', () => {
        const clientData = ws.clientData;
        if (clientData) {
            console.log(`Client ${clientData.username} (${clientData.id}) disconnected`);
            logMessage(`Client ${clientData.username} (${clientData.id}) disconnected`);
            
            // Remove from connected clients
            connectedClients.delete(clientData.id);
            
            // Notify others about user leaving
            broadcastToOthers(ws, {
                type: 'user_left',
                username: 'System',
                message: `${clientData.username} left the chat`,
                timestamp: new Date().toISOString()
            });
            
            // Send updated user count
            broadcastUserCount();
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        logMessage(`WebSocket error: ${error.message}`);
    });
});

// Helper functions
function broadcastToOthers(sender, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== sender) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastToAll(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastUserCount() {
    const userCount = wss.clients.size;
    broadcastToAll({
        type: 'user_count',
        count: userCount,
        timestamp: new Date().toISOString()
    });
}

function handleClearCommand(ws) {
    ws.send(JSON.stringify({
        type: 'clear_chat',
        timestamp: new Date().toISOString()
    }));
    logMessage('Chat cleared by ' + ws.clientData.username);
}

function handleUsersCommand(ws) {
    const userList = Array.from(connectedClients.values()).map(client => ({
        username: client.username,
        connectedAt: client.connectedAt
    }));
    
    ws.send(JSON.stringify({
        type: 'user_list',
        users: userList,
        timestamp: new Date().toISOString()
    }));
}

function handleNickCommand(ws, command) {
    const newNick = command.substring(6).trim();
    if (newNick && newNick.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(newNick)) {
        const oldUsername = ws.clientData.username;
        ws.clientData.username = newNick;
        connectedClients.set(ws.clientData.id, ws.clientData);
        
        broadcastToAll({
            type: 'nick_change',
            username: 'System',
            message: `${oldUsername} is now known as ${newNick}`,
            timestamp: new Date().toISOString()
        });
        
        logMessage(`${oldUsername} changed nick to ${newNick}`);
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid nickname. Use only letters, numbers, _ and - (max 20 chars)',
            timestamp: new Date().toISOString()
        }));
    }
}

function handleChatMessage(ws, data) {
    const message = sanitizeMessage(data.message);
    const username = ws.clientData.username;
    
    if (!message || message.length === 0) {
        return;
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
        ws.send(JSON.stringify({
            type: 'error',
            message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    const messageData = {
        type: 'chat_message',
        username: username,
        message: message,
        timestamp: new Date().toISOString()
    };
    
    broadcastToAll(messageData);
    logMessage(`${username}: ${message}`);
}

server.listen(port, '0.0.0.0', () => {
    const protocol = USE_HTTPS ? 'https' : 'http';
    console.log(`Room21 server is running on ${protocol}://localhost:${port}`);
    console.log(`Server type: ${USE_HTTPS ? 'HTTPS (Secure)' : 'HTTP (Development)'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=============================');
    console.log('Terminal Commands Available:');
    console.log('  stop                    - Stop the server');
    console.log('  status                  - Show server status');
    console.log('  users                   - List connected users');
    console.log('  msg <message>           - Send system message');
    console.log('  kick <username>         - Kick a user');
    console.log('  ban <ip|username> [reason] - Ban an IP or user with reason');
    console.log('  unban <ip>              - Unban an IP address');
    console.log('  banlist                 - Show banned IPs');
    console.log('  clear                   - Clear all user chats');
    console.log('  save                    - Save current log');
    console.log('  help                    - Show this help');
    console.log('=============================');
    console.log('Type commands below:');
    
    initializeTerminalInterface();
});

// Interactive Terminal Interface
function initializeTerminalInterface() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'Room21> '
    });

    rl.prompt();

    rl.on('line', (input) => {
        const command = input.trim();
        handleTerminalCommand(command);
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\nShutting down server...');
        server.close(() => {
            process.exit(0);
        });
    });
}

function handleTerminalCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
        case 'stop':
        case 'exit':
        case 'quit':
            console.log('Stopping server...');
            broadcastToAll({
                type: 'system',
                username: 'System',
                message: 'Server is shutting down for maintenance. Please reconnect in a few moments.',
                timestamp: new Date().toISOString(),
                style: 'warning'
            });
            setTimeout(() => {
                server.close(() => {
                    process.exit(0);
                });
            }, 2000);
            break;

        case 'status':
            const userCount = wss.clients.size;
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            console.log(`\n=== Server Status ===`);
            console.log(`Connected users: ${userCount}`);
            console.log(`Uptime: ${hours}h ${minutes}m`);
            console.log(`Protocol: ${USE_HTTPS ? 'HTTPS' : 'HTTP'}`);
            console.log(`Port: ${port}`);
            console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
            console.log(`====================\n`);
            break;

        case 'users':
            console.log(`\n=== Connected Users (${connectedClients.size}) ===`);
            connectedClients.forEach((client, id) => {
                const duration = Math.floor((Date.now() - client.connectedAt.getTime()) / 1000 / 60);
                console.log(`${client.username} (${id}) - ${duration}m ago from ${client.ip}`);
            });
            console.log(`=============================\n`);
            break;

        case 'msg':
        case 'message':
            if (!args) {
                console.log('Usage: msg <message>');
                break;
            }
            broadcastToAll({
                type: 'system',
                username: 'Admin',
                message: args,
                timestamp: new Date().toISOString(),
                style: 'info'
            });
            console.log(`System message sent: "${args}"`);
            logMessage(`[ADMIN] System message: ${args}`);
            break;

        case 'announce':
            if (!args) {
                console.log('Usage: announce <message>');
                break;
            }
            broadcastToAll({
                type: 'system',
                username: 'System',
                message: `ANNOUNCEMENT: ${args}`,
                timestamp: new Date().toISOString(),
                style: 'success'
            });
            console.log(`Announcement sent: "${args}"`);
            logMessage(`[ADMIN] Announcement: ${args}`);
            break;

        case 'kick':
            if (!args) {
                console.log('Usage: kick <username>');
                break;
            }
            kickUser(args);
            break;

        case 'ban':
            if (!args) {
                console.log('Usage: ban <ip|username> [reason]');
                console.log('Example: ban SwiftDragon123 Spamming inappropriate content');
                console.log('Example: ban 192.168.1.100 Suspicious activity');
                break;
            }
            const banParts = args.split(' ');
            const banTarget = banParts[0];
            const banReason = banParts.slice(1).join(' ') || 'No reason provided';
            banUser(banTarget, banReason);
            break;

        case 'unban':
            if (!args) {
                console.log('Usage: unban <ip>');
                break;
            }
            unbanIP(args);
            break;

        case 'banlist':
            showBannedIPs();
            break;

        case 'clear':
            broadcastToAll({
                type: 'clear_chat',
                timestamp: new Date().toISOString()
            });
            console.log('Cleared all user chats');
            logMessage('[ADMIN] Chat cleared by administrator');
            break;

        case 'save':
            saveLogToFile();
            break;

        case 'reload':
            console.log('Reloading server configuration...');
            console.log('Configuration reloaded');
            break;

        case 'help':
        case '?':
            console.log(`\n=== Terminal Commands ===`);
            console.log(`stop                    - Stop the server gracefully`);
            console.log(`status                  - Show server status and stats`);
            console.log(`users                   - List all connected users`);
            console.log(`msg <message>           - Send system message to all users`);
            console.log(`announce <message>      - Send announcement with special formatting`);
            console.log(`kick <username>         - Kick a specific user`);
            console.log(`ban <ip|username> [reason] - Ban an IP address or user with optional reason`);
            console.log(`unban <ip>              - Unban an IP address`);
            console.log(`banlist                 - Show all banned IPs`);
            console.log(`clear                   - Clear all user chat histories`);
            console.log(`save                    - Save current log to timestamped file`);
            console.log(`reload                  - Reload server configuration`);
            console.log(`help                    - Show this help message`);
            console.log(`=========================\n`);
            break;

        case '':
            break;

        default:
            console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
            break;
    }
}

function kickUser(username) {
    let userFound = false;
    connectedClients.forEach((client, id) => {
        if (client.username.toLowerCase() === username.toLowerCase()) {
            userFound = true;
            // Find the WebSocket connection for this client
            wss.clients.forEach(ws => {
                if (ws.clientData && ws.clientData.id === id) {
                    ws.send(JSON.stringify({
                        type: 'system',
                        username: 'System',
                        message: 'You have been disconnected by an administrator.',
                        timestamp: new Date().toISOString(),
                        style: 'error'
                    }));
                    setTimeout(() => {
                        ws.close(1000, 'Kicked by administrator');
                    }, 1000);
                    console.log(`Kicked user: ${client.username}`);
                    logMessage(`[ADMIN] Kicked user: ${client.username}`);
                }
            });
        }
    });
    
    if (!userFound) {
        console.log(`User "${username}" not found`);
    }
}

function saveLogToFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chat-log-${timestamp}.txt`;
    const savePath = path.join(__dirname, '..', 'data', filename);
    
    // Read current log and save with timestamp
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.log('Error reading log file:', err.message);
            return;
        }
        
        const header = `=== Room21 Chat Log ===\nSaved: ${new Date().toISOString()}\nServer: ${USE_HTTPS ? 'HTTPS' : 'HTTP'}:${port}\n========================\n\n`;
        
        fs.writeFile(savePath, header + data, (writeErr) => {
            if (writeErr) {
                console.log('Error saving log file:', writeErr.message);
            } else {
                console.log(`Log saved to: ${filename}`);
                logMessage(`[ADMIN] Log saved to: ${filename}`);
            }
        });
    });
}

function banUser(target, reason = 'No reason provided') {
    // Check if target is an IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
        // Direct IP ban
        banIP(target, reason);
        return;
    }
    
    // Find user by username and ban their IP
    let userFound = false;
    connectedClients.forEach((client, id) => {
        if (client.username.toLowerCase() === target.toLowerCase()) {
            userFound = true;
            banIP(client.ip, reason);
            
            // Also kick the user with ban message
            wss.clients.forEach(ws => {
                if (ws.clientData && ws.clientData.id === id) {
                    ws.send(JSON.stringify({
                        type: 'ban_message',
                        username: 'System',
                        message: 'You have been banned from this server',
                        reason: reason,
                        timestamp: new Date().toISOString(),
                        style: 'ban'
                    }));
                    setTimeout(() => {
                        ws.close(1000, 'Banned by administrator');
                    }, 3000); // Give more time to read the ban message
                }
            });
            
            console.log(`\n BANNED USER`);
            console.log(`Username: ${client.username}`);
            console.log(`IP Address: ${client.ip}`);
            console.log(`Reason: ${reason}`);
            console.log(`Time: ${new Date().toISOString()}`);
            console.log(`==================\n`);
            
            logMessage(`[ADMIN] Banned user: ${client.username} (IP: ${client.ip}) - Reason: ${reason}`);
        }
    });
    
    if (!userFound) {
        console.log(`User "${target}" not found. Use 'ban <ip> [reason]' to ban an IP directly.`);
    }
}

function banIP(ip, reason = 'No reason provided') {
    bannedIPs.set(ip, reason);
    saveBannedIPs();
    
    console.log(`\n IP BANNED `);
    console.log(`IP Address: ${ip}`);
    console.log(`Reason: ${reason}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`===============\n`);
    
    logMessage(`[ADMIN] Banned IP: ${ip} - Reason: ${reason}`);
    
    // Kick all users with this IP
    wss.clients.forEach(ws => {
        if (ws.clientData && ws.clientData.ip === ip) {
            ws.send(JSON.stringify({
                type: 'ban_message',
                username: 'System',
                message: 'Your IP address has been banned from this server',
                reason: reason,
                timestamp: new Date().toISOString(),
                style: 'ban'
            }));
            setTimeout(() => {
                ws.close(1000, 'IP banned');
            }, 3000); // Give more time to read the ban message
        }
    });
}

function unbanIP(ip) {
    if (bannedIPs.has(ip)) {
        const reason = bannedIPs.get(ip);
        bannedIPs.delete(ip);
        saveBannedIPs();
        
        console.log(`\n IP UNBANNED `);
        console.log(`IP Address: ${ip}`);
        console.log(`Previous ban reason: ${reason}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`==================\n`);
        
        logMessage(`[ADMIN] Unbanned IP: ${ip} (was banned for: ${reason})`);
    } else {
        console.log(`IP ${ip} is not in the ban list`);
    }
}

function showBannedIPs() {
    if (bannedIPs.size === 0) {
        console.log('\n=== No Banned IPs ===\n');
    } else {
        console.log(`\n=== Banned IPs (${bannedIPs.size}) ===`);
        let index = 1;
        bannedIPs.forEach((reason, ip) => {
            console.log(`${index}. ${ip}`);
            console.log(`   Reason: ${reason}`);
            console.log('');
            index++;
        });
        console.log(`========================\n`);
    }
}
