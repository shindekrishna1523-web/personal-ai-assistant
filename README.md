# Personal AI Assistant

A full-stack AI-powered personal assistant built with Next.js, ASP.NET Core Web API, PostgreSQL, and Google Gemini AI.

## 🚀 Live Demo

https://personal-ai-assistant-chi-six.vercel.app/login

## 📂 GitHub

https://github.com/shindekrishna1523-web/personal-ai-assistant

---

## 📌 Overview

Personal AI Assistant is a full-stack web application that allows users to interact with AI through a responsive chat interface.

The application supports conversational AI, conversation history, memory management, file and image uploads, authentication, and AI-generated responses.

The project follows a separated frontend and backend architecture.

---

## ✨ Features

- AI-powered conversational chat
- Conversation history
- AI memory management
- JWT authentication
- Real-time AI response streaming
- File and image uploads
- Responsive web interface
- RESTful backend APIs
- PostgreSQL data persistence
- Cloud deployment

---

## 🏗️ Architecture

```text
┌───────────────────────────────┐
│        Next.js Frontend       │
│   React + TypeScript + UI     │
└───────────────┬───────────────┘
                │
                │ REST API
                ▼
┌───────────────────────────────┐
│     ASP.NET Core Web API      │
│        C# / .NET 8            │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌───────────────┐
│  PostgreSQL   │  │  Gemini AI    │
│   Database    │  │  Integration  │
└───────────────┘  └───────────────┘