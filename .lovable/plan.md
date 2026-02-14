

# Online Communication Tracking System

## Overview
A real-time chat application with dual interfaces: a vibrant, modern chat UI for regular users and a distinct admin dashboard for monitoring all communications.

## Backend (Supabase / Lovable Cloud)
- **Authentication**: Email/password signup & login with role selection (User or Admin)
- **Database tables**: profiles, user_roles, messages, conversations
- **Real-time**: Supabase Realtime subscriptions for instant message delivery
- **Tracking**: Message timestamps for sent time and read time

## Pages & Features

### 1. Auth Pages (Login / Register)
- Modern, colorful login & registration forms
- Role selector: "Register as User" or "Register as Admin" (admin registration with a secret code to prevent abuse)
- Redirect to appropriate dashboard based on role after login

### 2. User Chat Interface (Modern & Colorful)
- **Friends list / sidebar**: Search and add friends by name, see online status
- **Chat window**: Real-time messaging with message bubbles, timestamps, and read receipts
- **Vibrant design**: Gradient backgrounds, colorful message bubbles, smooth animations
- Profile section showing user's name

### 3. Admin Dashboard (Distinct Styling)
- **Different visual style**: Professional dashboard layout with data tables, contrasting with the chat UI (darker tones, structured grid layout)
- **Communication logs table** showing:
  - Who chatted with whom (sender & receiver names)
  - Message content
  - Time sent
  - Time read (or "unread" status)
- **Filters**: Search by user, date range, read/unread status
- **Stats overview**: Total messages, active users, unread message count

### 4. Security
- Role-based access control via Supabase RLS
- Users can only see their own conversations
- Admins can view all communication logs
- Admin registration protected by secret access code

