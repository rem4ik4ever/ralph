# User Authentication System

A simple user authentication system for the web app.

## Context

This is a new feature that adds user login/logout functionality.

## Tasks

### auth-1: Create user model
- Define User interface with id, email, passwordHash
- Add validation for email format
- Export from src/models/user.ts

### auth-2: Implement login endpoint
- POST /api/auth/login
- Accept email and password in body
- Return JWT token on success
- Return 401 on invalid credentials

### auth-3: Add logout endpoint
- POST /api/auth/logout
- Invalidate current session
- Return 200 on success

## Non-goals
- OAuth integration
- Password reset flow
