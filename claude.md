\# Claude.md \- Dashboard Project

\#\# Project Overview  
Personal Life/Business Dashboard \- all-in-one app for journaling, finances, goals, and AI insights.

Stack: React \+ Supabase \+ Claude API \+ Plaid  
Timeline: 1 week MVP  
Goal: Functional, not beautiful

\---

\#\# Database Tables (Supabase)

1\. users \- id, email, created\_at  
2\. journal\_entries \- id, user\_id, text, timestamp, rating (0-10), mood\_tags, language  
3\. todos \- id, user\_id, title, completed, due\_date  
4\. goals \- id, user\_id, title, type (daily/weekly/monthly), target, current\_progress  
5\. transactions \- id, user\_id, amount, category, merchant, date, plaid\_id  
6\. insights \- id, user\_id, content, insight\_type, generated\_at  
7\. screen\_time \- id, user\_id, duration\_minutes, app\_name, date  
8\. plaid\_items \- id, user\_id, access\_token, item\_id, institution\_name

\---

\#\# Core Features (MVP)

1\. Dashboard Home \- Daily overview, quick stats  
2\. Voice Journal \- Record voice, auto-transcribed (Web Speech API)  
3\. To-Do List \- Add, check off, completion %  
4\. Goals Tracker \- Daily/weekly/monthly with progress bars  
5\. Finance Dashboard \- Plaid shows Rabobank spending  
6\. Calendar \- Google Calendar events  
7\. Email \- Gmail important emails  
8\. Screen Time \- Track usage  
9\. Claude AI Insights \- Weekly analysis \+ recommendations  
10\. Auth \- Email/password login

\---

\#\# API Endpoints

Journal: POST/GET/DELETE /api/journal  
Todos: POST/GET/PATCH/DELETE /api/todos  
Goals: POST/GET/PATCH/DELETE /api/goals  
Plaid: POST /api/plaid-link, GET /api/plaid/transactions  
Gmail: GET /api/gmail  
Calendar: GET /api/calendar  
Insights: POST /api/insights, GET /api/insights

\---

\#\# Environment Variables

NEXT\_PUBLIC\_SUPABASE\_URL  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY  
SUPABASE\_SERVICE\_ROLE\_KEY  
NEXT\_PUBLIC\_PLAID\_CLIENT\_ID  
PLAID\_SECRET  
ANTHROPIC\_API\_KEY  
GMAIL\_CLIENT\_ID  
GMAIL\_CLIENT\_SECRET  
GOOGLE\_CALENDAR\_API\_KEY

\---

\#\# Components to Build

Dashboard.jsx \- Main hub  
Journal.jsx \- Voice recording  
TodoList.jsx \- To-do CRUD  
GoalsTracker.jsx \- Goal progress  
FinanceDashboard.jsx \- Plaid spending  
CalendarView.jsx \- Google Calendar  
EmailWidget.jsx \- Gmail  
InsightsPanel.jsx \- Claude insights

\---

\#\# Build Timeline (Days 1-7)

Day 1: React setup \+ Supabase \+ auth  
Day 2: Voice journal  
Day 3: To-do list \+ goals  
Day 4: Plaid (Rabobank)  
Day 5: Gmail \+ Google Calendar  
Day 6: Screen time tracking  
Day 7: Claude insights \+ polish

\---

\#\# Claude Integration

Call Claude weekly with:  
\- Journal entries  
\- Spending data  
\- Screen time  
\- Goals completion  
\- Calendar info

Claude returns patterns, insights, recommendations  
Store in Supabase, display on dashboard

\---

\#\# Key Decisions

Web app (not mobile native) \- Faster, responsive  
Supabase (not Firebase) \- Better structured data  
Plaid (not direct API) \- Simpler  
Web Speech API (not Whisper) \- Free  
Claude (not GPT-4) \- Better pattern reasoning  
Vercel (not self-hosted) \- Free tier

\---

\#\# Next Phases

Phase 2: UI polish, desktop screen time, charts, PDF  
Phase 3: Mobile app, dark mode, habit streaks

\---

\#\# Important

\- One user only  
\- Functionality first  
\- Free tier services only  
\- Test on real phone  
\- Use Git  
\- Privacy: user's Supabase only  
