# 🔐 Frontend Migration Guide - JWT Authentication

## Overview
The server now uses JWT (JSON Web Tokens) instead of sending user credentials with every request. This is more secure and scalable.

## Key Changes

### 1. Login Response
**Before:**
```javascript
const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
const data = await response.json();
// data.user.email was exposed
```

**After:**
```javascript
const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});
const data = await response.json();
// Store token locally
localStorage.setItem('authToken', data.token);
// data.user.email is NOT returned
```

### 2. Storing the Token
```javascript
// After successful login
localStorage.setItem('authToken', data.token);

// Before making protected requests
const token = localStorage.getItem('authToken');
```

### 3. Making Protected Requests
**Before:**
```javascript
// Score updates - worked for anyone
const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'anyuser', gameId: 'race', score: 100 })
});
```

**After:**
```javascript
// Score updates - require authentication
const token = localStorage.getItem('authToken');
const response = await fetch('/api/score', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
        username: currentUser,  // Must be current logged-in user
        gameId: 'race',
        score: 100 
    })
});

if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    }
}
```

### 4. Token Management
```javascript
// Utility function to get headers with auth
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Use it everywhere
fetch('/api/score', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, gameId, score })
});
```

### 5. Logout
```javascript
function logout() {
    localStorage.removeItem('authToken');
    // Clear any cached user data
    sessionStorage.clear();
    // Redirect to login
    window.location.href = '/login';
}
```

### 6. Auto-Login Check
```javascript
function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    return !!token;
}

// On page load
window.addEventListener('load', () => {
    if (!isLoggedIn() && window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
});
```

## Updated API Endpoints

### ✅ Public Endpoints (No token needed)
```javascript
// Get leaderboard
GET /api/leaderboard

// Get user profile (public)
GET /api/user/:username

// Register
POST /api/register
{
    "username": "user123",
    "email": "user@example.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!"
}

// Login
POST /api/login
{
    "username": "user123",
    "password": "SecurePass123!"
}
// Returns: { token, user, success, message }
```

### 🔐 Protected Endpoints (Token required)
```javascript
// Update score (must be your own user)
POST /api/score
Headers: Authorization: Bearer <token>
{
    "username": "currentUser",
    "gameId": "race",
    "score": 500
}

// Get admin data (admin only)
GET /api/admin/users
Headers: Authorization: Bearer <token>

// Delete user (admin only)
DELETE /api/admin/users/:username
Headers: Authorization: Bearer <token>
```

## Error Handling

```javascript
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Unauthorized - clear token and redirect
                localStorage.removeItem('authToken');
                window.location.href = '/login';
                return null;
            }
            
            if (response.status === 429) {
                // Rate limited
                alert('Too many requests. Please try again later.');
                return null;
            }

            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('Request error:', error);
        throw error;
    }
}
```

## Complete Example

```javascript
// Login
async function login(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    
    if (!data.success) {
        alert(data.message);
        return false;
    }

    // Store token
    localStorage.setItem('authToken', data.token);
    
    // Store minimal user data
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    
    return true;
}

// Update game score
async function updateScore(gameId, score) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('authToken');

    const response = await fetch('/api/score', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: user.username,
            gameId: gameId,
            score: score
        })
    });

    const data = await response.json();
    
    if (!data.success) {
        if (response.status === 401 || response.status === 403) {
            logout(); // Token expired
        }
        return false;
    }

    // Update local user data
    user.stats.totalScore = data.totalScore;
    user.stats.badges = data.badges;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    return true;
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
}
```

## Password Requirements
New passwords must include:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (@$!%*?&)

Example: `SecurePass123!` ✅

## Troubleshooting

### "Access token required" error
- Check that you're including the `Authorization: Bearer <token>` header
- Verify the token is stored in localStorage

### "Invalid or expired token" error
- Token expires after 24 hours
- User needs to log in again
- Clear localStorage and redirect to login page

### "Too many requests" error
- Rate limiting is active
- Wait 15 minutes for login attempts
- Wait 1 minute for score updates

### CORS errors
- Make sure your frontend is on an allowed origin
- Server is configured with: `ALLOWED_ORIGINS` in .env
