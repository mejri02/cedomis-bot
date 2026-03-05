<!-- referral: https://cedomis.xyz/signup?referralCode=saddemmejri -->

---

# 🤖 cedomis-bot

An automated bot for [Cedomis](https://cedomis.xyz) that handles daily login reward claiming and blog quiz completion across multiple accounts with optional proxy support.

---

## ✨ Features

- 🔑 **Multi-account support** — load unlimited tokens from a file
- 🎁 **Daily login auto-claim** — checks and claims daily rewards automatically
- 📚 **Blog quiz solver** — fetches blog posts, solves quizzes using Groq AI, and submits answers
- 🌐 **Proxy support** — SOCKS5 proxies, rotated across accounts
- ⏰ **Smart scheduling** — sleeps until the earliest next claim time, then restarts
- 🎨 **Colored terminal output** — clear logging with timestamps and status types

---

## 📋 Requirements

- [Node.js](https://nodejs.org/) v16+
- A [Groq](https://console.groq.com/) API key (free)
- Cedomis account tokens

---

## 🚀 Installation

```bash
git clone https://github.com/mejri02/cedomis-bot.git
cd cedomis-bot
npm install
```

---

## ⚙️ Configuration

### 1. Groq API Key

Create a file named `grok.txt` in the project root and paste your Groq API key:

```
gsk_your_groq_api_key_here
```

Get your free key at: [https://console.groq.com](https://console.groq.com)

---

### 2. Account Tokens

Create a file named `tokens.txt` — one token per line:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6...
eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

> Tokens can be raw JWTs or cookie-style `auth-token=...` strings — the bot handles both formats automatically.

---

### 3. Proxies (Optional)

Create a file named `proxy.txt` — one proxy per line:

```
socks5://user:pass@host:port
192.168.1.1:1080
```

- Supports `socks5://` and `socks5h://` formats
- Plain `host:port` is accepted and auto-prefixed with `socks5://`
- If no proxy file is found, the bot runs without proxies

---

## ▶️ Usage

```bash
node index.js
```

The bot will:
1. Load all tokens and proxies
2. For each account: fetch profile → claim daily reward → solve & submit blog quizzes
3. Sleep until the earliest next daily claim time
4. Restart automatically

---

## 📁 File Structure

```
cedomis-bot/
├── index.js        # Main bot script
├── tokens.txt      # Your account tokens (create this)
├── grok.txt        # Your Groq API key (create this)
├── proxy.txt       # Optional SOCKS5 proxies
└── README.md
```

---

## 📊 Terminal Output Example

```
[2024-01-15 12:00:00] [BOT]     🔰 PROCESSING: eyJhbGciOiJI...
[2024-01-15 12:00:01] [SUCCESS] ✅ Profile: username123
[2024-01-15 12:00:02] [REWARD]  ✅✅✅ DAILY REWARD CLAIMED!
[2024-01-15 12:00:05] [QUEST]   📌 Introduction to DeFi
[2024-01-15 12:00:08] [REWARD]  ✅✅✅ QUIZ SUBMITTED!
[2024-01-15 12:00:10] [TIMER]   ⏰ Wake at: 2024-01-16 12:05:00 (23h 59m)
```

---

## ⚠️ Disclaimer

This project is for educational purposes only. Use at your own risk and in accordance with Cedomis's Terms of Service.

---

## 👤 Author

**mejri02**  
GitHub: [https://github.com/mejri02](https://github.com/mejri02)
