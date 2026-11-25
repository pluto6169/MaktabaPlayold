const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
        },
    },
}));
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(express.static(path.join(__dirname, '')));

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 requests per 15 minutes for login
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
});

const scoreLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many score updates, please try again later.',
});

app.use(generalLimiter);

// Database Setup
const db = new sqlite3.Database('./maktaba.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create users table with improved schema
        db.run(`CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            joinedAt TEXT NOT NULL,
            totalScore INTEGER DEFAULT 0,
            gamesPlayed INTEGER DEFAULT 0,
            badges TEXT DEFAULT '[]',
            gameScores TEXT DEFAULT '{"hangman":0,"ladder":0,"detective":0,"sorter":0,"quiz":0,"match":0,"memory":0,"race":0}',
            lastLogin TEXT,
            isAdmin INTEGER DEFAULT 0
        )`);

        // Create audit log table
        db.run(`CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            action TEXT,
            ipAddress TEXT,
            timestamp TEXT,
            details TEXT
        )`);

        // Migration for existing databases
        const addColumnSafe = (table, column, def) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    // Ignore duplicate column errors during migration
                }
            });
        };
        addColumnSafe('users', 'lastLogin', 'TEXT');
        addColumnSafe('users', 'isAdmin', 'INTEGER DEFAULT 0');
    }
});

// Validation functions
function validateEmail(email) {
    return validator.isEmail(email);
}

function validateUsername(username) {
    // Allow only alphanumeric and underscore, 3-20 characters
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Hash password with bcrypt
async function hashPassword(password) {
    try {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        throw new Error('Error hashing password');
    }
}

// Compare password with hash
async function comparePassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        throw new Error('Error comparing password');
    }
}

// Generate JWT token
function generateToken(username) {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = decoded.username;
    next();
}

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }

    // Check if user is admin
    db.get('SELECT isAdmin FROM users WHERE username = ?', [decoded.username], (err, row) => {
        if (err || !row || !row.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        req.user = decoded.username;
        next();
    });
}

// API Routes

// Register
app.post('/api/register', authLimiter, async (req, res) => {
    const { username, email, password, passwordConfirm } = req.body;

    // Input validation
    if (!username || !email || !password || !passwordConfirm) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!validateUsername(username)) {
        return res.status(400).json({
            success: false,
            message: 'Username must be 3-20 characters (alphanumeric and underscore only)'
        });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        });
    }

    if (password !== passwordConfirm) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    try {
        const hashedPassword = await hashPassword(password);
        const joinedAt = new Date().toISOString();

        db.get('SELECT username FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (row) {
                const field = row.username === username ? 'username' : 'email';
                return res.status(409).json({ success: false, message: `This ${field} is already registered` });
            }

            db.run(`INSERT INTO users (username, email, password, joinedAt) VALUES (?, ?, ?, ?)`,
                [username, email, hashedPassword, joinedAt],
                function (err) {
                    if (err) {
                        console.error('Registration error:', err);
                        return res.status(500).json({ success: false, message: 'Error registering user' });
                    }
                    res.status(201).json({ success: true, message: 'تم التسجيل بنجاح' });
                });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login
app.post('/api/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    try {
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const passwordMatch = await comparePassword(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Update last login
            db.run('UPDATE users SET lastLogin = ? WHERE username = ?',
                [new Date().toISOString(), username]);

            // Generate JWT token
            const token = generateToken(username);

            // Parse JSON fields safely
            let badges = [];
            let gameScores = {};

            try {
                badges = JSON.parse(user.badges);
                gameScores = JSON.parse(user.gameScores);
            } catch (e) {
                console.error('JSON parse error:', e);
            }

            res.json({
                success: true,
                message: 'تم تسجيل الدخول',
                token,
                user: {
                    username: user.username,
                    stats: {
                        totalScore: user.totalScore,
                        gamesPlayed: user.gamesPlayed,
                        badges: badges
                    },
                    gameScores: gameScores
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get User Profile (public)
app.get('/api/user/:username', (req, res) => {
    // Validate username parameter
    if (!validateUsername(req.params.username)) {
        return res.status(400).json({ success: false, message: 'Invalid username format' });
    }

    db.get('SELECT username, joinedAt, totalScore, gamesPlayed, badges, gameScores FROM users WHERE username = ?',
        [req.params.username], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false });
            }

            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            try {
                const badges = JSON.parse(user.badges);
                const gameScores = JSON.parse(user.gameScores);

                res.json({
                    success: true,
                    user: {
                        username: user.username,
                        joinedAt: user.joinedAt,
                        stats: {
                            totalScore: user.totalScore,
                            gamesPlayed: user.gamesPlayed,
                            badges: badges
                        },
                        gameScores: gameScores
                    }
                });
            } catch (e) {
                console.error('JSON parse error:', e);
                res.status(500).json({ success: false });
            }
        });
});

// Update Score (protected)
app.post('/api/score', authenticateToken, scoreLimiter, (req, res) => {
    const { username, gameId, score } = req.body;

    // Validate that user can only update their own score
    if (req.user !== username) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Validate gameId
    const validGames = ['hangman', 'ladder', 'detective', 'sorter', 'quiz', 'match', 'memory', 'race'];
    if (!validGames.includes(gameId)) {
        return res.status(400).json({ success: false, message: 'Invalid game ID' });
    }

    // Validate score
    if (!Number.isInteger(score) || score < 0 || score > 10000) {
        return res.status(400).json({ success: false, message: 'Invalid score' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        try {
            let gameScores = JSON.parse(user.gameScores);
            let badges = JSON.parse(user.badges);
            let totalScore = user.totalScore;
            let gamesPlayed = user.gamesPlayed;

            // Only update if new score is higher
            if (score > (gameScores[gameId] || 0)) {
                gameScores[gameId] = score;
            }

            gamesPlayed++;
            totalScore += score;

            // Check badges
            const addBadge = (badgeName) => {
                if (!badges.includes(badgeName)) badges.push(badgeName);
            };

            if (gamesPlayed >= 1) addBadge('🌟 المبتدئ');

            const gamesPlayedUnique = Object.values(gameScores).filter(s => s > 0).length;
            if (gamesPlayedUnique >= 8) addBadge('📚 المكتبي');

            if (gameScores['race'] >= 500) addBadge('🏆 المصنّف');
            if (gameScores['memory'] >= 1000) addBadge('🧠 الحافظ');

            db.run(`UPDATE users SET totalScore = ?, gamesPlayed = ?, badges = ?, gameScores = ? WHERE username = ?`,
                [totalScore, gamesPlayed, JSON.stringify(badges), JSON.stringify(gameScores), username],
                (err) => {
                    if (err) {
                        console.error('Score update error:', err);
                        return res.status(500).json({ success: false });
                    }
                    res.json({ success: true, totalScore, badges });
                }
            );
        } catch (e) {
            console.error('JSON parse error:', e);
            res.status(500).json({ success: false });
        }
    });
});

// Get Leaderboard (public)
app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT username, totalScore as score FROM users ORDER BY totalScore DESC LIMIT 50', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true, leaderboard: rows });
    });
});

// Admin Route: Get All Users (protected)
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    db.all('SELECT username, email, joinedAt, totalScore, gamesPlayed, lastLogin FROM users ORDER BY joinedAt DESC',
        [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false });
            }
            res.json({ success: true, users: rows });
        });
});

// Admin Route: Delete User (protected)
app.delete('/api/admin/users/:username', authenticateAdmin, (req, res) => {
    const usernameToDelete = req.params.username;

    // Prevent self-deletion
    if (req.user === usernameToDelete) {
        return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    db.run('DELETE FROM users WHERE username = ?', [usernameToDelete], function (err) {
        if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ success: false });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Log the action
        logAudit(req.user, 'USER_DELETED', req.ip, `Deleted user: ${usernameToDelete}`);

        res.json({ success: true, message: 'User deleted successfully' });
    });
});

// Admin Route: Update User Info (protected)
app.put('/api/admin/users/:username', authenticateAdmin, (req, res) => {
    const { username } = req.params;
    const { totalScore, gamesPlayed, badges, isAdmin } = req.body;

    // Validate input
    if (username && !validateUsername(username)) {
        return res.status(400).json({ success: false, message: 'Invalid username format' });
    }

    let updates = {};
    if (totalScore !== undefined && Number.isInteger(totalScore) && totalScore >= 0) {
        updates.totalScore = totalScore;
    }
    if (gamesPlayed !== undefined && Number.isInteger(gamesPlayed) && gamesPlayed >= 0) {
        updates.gamesPlayed = gamesPlayed;
    }
    if (badges !== undefined && Array.isArray(badges)) {
        updates.badges = JSON.stringify(badges);
    }
    if (isAdmin !== undefined && [0, 1].includes(isAdmin)) {
        updates.isAdmin = isAdmin;
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const sets = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(username);

    db.run(`UPDATE users SET ${sets} WHERE username = ?`, values, function (err) {
        if (err) {
            console.error('Update error:', err);
            return res.status(500).json({ success: false });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        logAudit(req.user, 'USER_UPDATED', req.ip, `Updated user: ${username}`);
        res.json({ success: true, message: 'User updated successfully' });
    });
});

// Admin Route: Reset User Scores (protected)
app.post('/api/admin/users/:username/reset-scores', authenticateAdmin, (req, res) => {
    const { username } = req.params;

    if (!validateUsername(username)) {
        return res.status(400).json({ success: false, message: 'Invalid username format' });
    }

    const defaultScores = '{"hangman":0,"ladder":0,"detective":0,"sorter":0,"quiz":0,"match":0,"memory":0,"race":0}';

    db.run(`UPDATE users SET totalScore = 0, gamesPlayed = 0, gameScores = ?, badges = '[]' WHERE username = ?`,
        [defaultScores, username],
        function (err) {
            if (err) {
                console.error('Reset error:', err);
                return res.status(500).json({ success: false });
            }

            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            logAudit(req.user, 'SCORES_RESET', req.ip, `Reset scores for: ${username}`);
            res.json({ success: true, message: 'User scores reset successfully' });
        });
});

// Admin Route: Database Statistics (protected)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    db.all('SELECT COUNT(*) as totalUsers, SUM(totalScore) as totalScores, AVG(gamesPlayed) as avgGamesPlayed FROM users', [], (err, stats) => {
        if (err) {
            console.error('Stats error:', err);
            return res.status(500).json({ success: false });
        }

        db.all('SELECT gameId, COUNT(*) as timesPlayed, AVG(score) as avgScore FROM (SELECT \'hangman\' as gameId, ? as score FROM users UNION SELECT \'ladder\', ? UNION SELECT \'detective\', ? UNION SELECT \'sorter\', ? UNION SELECT \'quiz\', ? UNION SELECT \'match\', ? UNION SELECT \'memory\', ? UNION SELECT \'race\', ?)', [], (err2, gameStats) => {
            const topPlayers = [];
            db.all('SELECT username, totalScore, gamesPlayed FROM users ORDER BY totalScore DESC LIMIT 10', [], (err3, rows) => {
                if (err3) {
                    console.error('Top players error:', err3);
                    return res.status(500).json({ success: false });
                }

                res.json({
                    success: true,
                    stats: {
                        totalUsers: stats[0]?.totalUsers || 0,
                        totalScores: stats[0]?.totalScores || 0,
                        avgGamesPlayed: (stats[0]?.avgGamesPlayed || 0).toFixed(2),
                        topPlayers: rows
                    }
                });
            });
        });
    });
});

// Admin Route: Export Database (protected)
app.get('/api/admin/export', authenticateAdmin, (req, res) => {
    const format = req.query.format || 'json';

    if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({ success: false, message: 'Invalid format' });
    }

    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            console.error('Export error:', err);
            return res.status(500).json({ success: false });
        }

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.json"`);
            res.json({ success: true, data: rows, exportedAt: new Date().toISOString() });
        } else if (format === 'csv') {
            const csv = convertToCSV(rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }

        logAudit(req.user, 'DATA_EXPORTED', req.ip, `Exported ${rows.length} users as ${format}`);
    });
});

// Admin Route: Get Audit Log (protected)
app.get('/api/admin/audit-log', authenticateAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    db.all('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows) => {
            if (err) {
                console.error('Audit log error:', err);
                return res.status(500).json({ success: false });
            }

            res.json({ success: true, logs: rows, limit, offset });
        });
});

// Admin Route: Database Backup (protected)
app.post('/api/admin/backup', authenticateAdmin, (req, res) => {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `backups/maktaba_backup_${timestamp}.db`);

    // Create backups folder if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'backups'))) {
        fs.mkdirSync(path.join(__dirname, 'backups'));
    }

    db.all('SELECT * FROM users', [], (err, users) => {
        if (err) {
            console.error('Backup error:', err);
            return res.status(500).json({ success: false, message: 'Backup failed' });
        }

        // Create a JSON backup
        const backup = {
            timestamp: new Date().toISOString(),
            version: 1,
            data: {
                users: users
            }
        };

        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

        logAudit(req.user, 'BACKUP_CREATED', req.ip, `Created backup with ${users.length} users`);

        res.json({
            success: true,
            message: 'Backup created successfully',
            filename: path.basename(backupPath),
            userCount: users.length
        });
    });
});

// Admin Route: List Backups (protected)
app.get('/api/admin/backups', authenticateAdmin, (req, res) => {
    const backupsDir = path.join(__dirname, 'backups');

    if (!fs.existsSync(backupsDir)) {
        return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(backupsDir)
        .filter(file => file.endsWith('.db'))
        .map(file => ({
            filename: file,
            size: fs.statSync(path.join(backupsDir, file)).size,
            created: fs.statSync(path.join(backupsDir, file)).birthtime
        }))
        .sort((a, b) => b.created - a.created);

    res.json({ success: true, backups: files });
});

// Admin Dashboard Page
app.get('/admin', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Helper functions
function logAudit(username, action, ipAddress, details) {
    db.run(`INSERT INTO audit_log (username, action, ipAddress, timestamp, details) VALUES (?, ?, ?, ?, ?)`,
        [username, action, ipAddress, new Date().toISOString(), details],
        (err) => {
            if (err) console.error('Audit log error:', err);
        });
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv.push(values.join(','));
    }

    return csv.join('\n');
}

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: 'Internal server error'
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('⚠️  Important: Change JWT_SECRET and configure ALLOWED_ORIGINS in production');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        db.close();
        process.exit(0);
    });
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

module.exports = app;
