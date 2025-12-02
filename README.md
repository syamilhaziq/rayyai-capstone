# RayyAI - AI-Powered Personal Finance Tracker

> **GAMUDA AI Academy Cohort 4 Capstone Project**
> September 1, 2025 - November 25, 2025
> Presented and evaluated by a panel of judges from multiple backgrounds

RayyAI is an intelligent personal finance management platform that leverages AI to help users track expenses, manage budgets, set financial goals, and receive personalized credit card recommendations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Key Features Breakdown](#key-features-breakdown)
- [API Documentation](#api-documentation)
- [Team](#team)
- [Acknowledgments](#acknowledgments)

## Overview

RayyAI combines traditional financial tracking with modern AI capabilities to provide users with:
- Automated transaction categorization
- Intelligent budget recommendations
- Financial goal tracking and predictions
- AI-powered chatbot for financial queries
- Smart credit card recommendations based on spending patterns
- Bank statement scanning and processing

## Features

### Core Functionality
- **User Authentication** - Secure login and registration system
- **Account Management** - Track multiple bank accounts and balances
- **Transaction Tracking** - Record and categorize income and expenses
- **Budget Management** - Set budgets by category with real-time tracking
- **Financial Goals** - Create savings goals with progress monitoring
- **Credit Card Recommendations** - AI-driven card suggestions based on spending habits

### AI-Powered Features
- **RayyAI Chatbot** - Conversational AI assistant for financial queries using Google Gemini
- **Statement Scanner** - OCR-based bank statement processing
- **Smart Insights** - AI-generated financial insights and recommendations
- **Spending Analysis** - Automated categorization and pattern recognition

### Analytics & Visualization
- **Dashboard** - Comprehensive overview of financial health
- **Spending Charts** - Interactive visualizations (donut charts, heatmaps, trends)
- **Budget vs Actual** - Real-time comparison of spending against budgets
- **Financial Health Metrics** - Key indicators and recommendations

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/ML**: Google Generative AI (Gemini), LangDetect
- **OCR**: PyMuPDF for document processing
- **Authentication**: JWT (PyJWT)
- **Cloud**: Google Cloud SQL Connector
- **Additional**: MCP (Model Context Protocol), Alembic for migrations

### Frontend
- **Framework**: React 19 with Vite
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Animations**: Framer Motion, GSAP
- **Routing**: React Router DOM
- **Form Management**: React Hook Form with Zod validation
- **HTTP Client**: Axios

## Project Structure

```
Capstone-Project/
├── rayyai-backend/          # FastAPI backend application
│   ├── routers/             # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── accounts.py      # Account management
│   │   ├── transactions.py  # Transaction operations
│   │   ├── budgets.py       # Budget tracking
│   │   ├── goals.py         # Financial goals
│   │   ├── chat.py          # AI chatbot endpoints
│   │   └── ...
│   ├── services/            # Business logic and AI services
│   │   ├── gemini_service.py      # Google Gemini integration
│   │   ├── rag_service.py         # RAG for chatbot
│   │   ├── action_executor.py     # Action processing
│   │   └── ...
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # Database configuration
│   ├── main.py              # Application entry point
│   └── requirements.txt     # Python dependencies
│
└── rayyai-frontend/         # React frontend application
    └── rayyai/
        ├── src/
        │   ├── components/        # Reusable UI components
        │   │   ├── general/       # Navigation, dialogs
        │   │   ├── ui/            # shadcn/ui components
        │   │   ├── RayyAIchat.jsx # AI chatbot interface
        │   │   └── ...
        │   ├── pages/             # Main application pages
        │   │   ├── Dashboard.jsx
        │   │   ├── BudgetTrackerPage.jsx
        │   │   ├── FinancialGoals.jsx
        │   │   └── ...
        │   ├── services/          # API integration
        │   └── main.jsx           # Application entry point
        └── package.json           # npm dependencies
```

## Getting Started

### Prerequisites

- **Backend**:
  - Python 3.9+
  - PostgreSQL database
  - Google Cloud account (for Gemini API)

- **Frontend**:
  - Node.js 16+
  - npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd rayyai-backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
Create a `.env` file with:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rayyai
GOOGLE_API_KEY=your_gemini_api_key
SECRET_KEY=your_jwt_secret_key
```

5. Run database migrations:
```bash
alembic upgrade head
```

6. Start the development server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd rayyai-frontend/rayyai
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with:
```env
VITE_API_BASE_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Key Features Breakdown

### 1. AI Chatbot (RayyAI)
- Natural language processing using Google Gemini
- Context-aware responses about user's financial data
- Action execution (create budgets, set goals, etc.)
- Conversation history and summarization
- PII masking for privacy

### 2. Statement Scanner
- Upload bank statements (PDF format)
- OCR extraction of transaction data
- Automatic categorization
- Duplicate detection
- Statement caching for efficiency

### 3. Budget Tracker
- Category-based budgets
- Real-time spending alerts
- Visual progress indicators
- Budget exceeded notifications
- Monthly budget cycles

### 4. Financial Goals
- Goal creation with target amounts and dates
- Progress tracking
- Auto-completion for achieved goals
- Visual goal timelines
- Savings recommendations

### 5. Credit Card Recommendations
- Spending pattern analysis
- Personalized card suggestions
- Detailed card comparisons
- Benefits and rewards matching

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

- **Authentication**: `/auth/register`, `/auth/login`
- **Accounts**: `/accounts/`
- **Transactions**: `/transactions/`
- **Budgets**: `/budgets/`
- **Goals**: `/goals/`
- **Chat**: `/chat/sessions`, `/chat/messages`
- **Insights**: `/insights/`
- **Cards**: `/cards/recommendations`

## Team

This project was developed by a team of 6 members as part of the GAMUDA AI Academy Cohort 4:

- **Yeow** - Team Leader (https://github.com/ywy929)
- **Angeline** - Team Member (https://github.com/AngelineKong)
- **Sivan** - Team Member (https://github.com/Sivaneishan)
- **Fatin** - Team Member (*)
- **Faris** - Team Member (https://github.com/farishelmi17)
- **Syamil** - Team Member (Me)

## Acknowledgments

- **GAMUDA AI Academy** for providing the platform and guidance for this capstone project
- **Cohort 4 Instructors and Mentors** for their support throughout the program
- **Panel of Judges** for their valuable feedback during the final presentation
- **Google Gemini AI** for powering our intelligent features
- Open source community for the amazing tools and libraries

---

**Project Duration**: September 1, 2025 - November 25, 2025
**Program**: GAMUDA AI Academy Cohort 4
**Final Presentation**: November 25, 2025

## License

This project is part of an academic capstone and is intended for educational purposes.

---

Built with dedication by Team AI-Vengers (Team 1)
