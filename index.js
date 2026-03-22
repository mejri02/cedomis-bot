const fs = require('fs');
const https = require('https');
const readline = require('readline');
const { SocksProxyAgent } = require('socks-proxy-agent');

const BANNER = `
\x1b[38;5;51m╔══════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     \x1b[38;5;196m██████╗███████╗██████╗  ██████╗ ███╗   ███╗██╗███████╗    ║
║    \x1b[38;5;214m██╔════╝██╔════╝██╔══██╗██╔═══██╗████╗ ████║██║██╔════╝    ║
║    \x1b[38;5;226m██║     █████╗  ██║  ██║██║   ██║██╔████╔██║██║███████╗    ║
║    \x1b[38;5;46m██║     ██╔══╝  ██║  ██║██║   ██║██║╚██╔╝██║██║╚════██║    ║
║    \x1b[38;5;33m╚██████╗███████╗██████╔╝╚██████╔╝██║ ╚═╝ ██║██║███████║    ║
║     \x1b[38;5;129m╚═════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝    ║
║                                                                      ║
║                    \x1b[38;5;201mCreated by: \x1b[38;5;220m@mejei02\x1b[0m                           \x1b[38;5;51m║
║                    \x1b[38;5;201mGitHub: \x1b[38;5;220mhttps://github.com/mejei02\x1b[0m                 \x1b[38;5;51m║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

const GROQ_API_KEY = (() => {
  try {
    return fs.readFileSync('grok.txt', 'utf8').trim();
  } catch {
    console.log('❌ grok.txt not found');
    process.exit(1);
  }
})();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
];

const randomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const loadProxies = () => {
  try {
    if (!fs.existsSync('proxy.txt')) return [];
    return fs.readFileSync('proxy.txt', 'utf8').split('\n').filter(l => l.trim()).map(l => l.trim());
  } catch { return []; }
};

const getProxyAgent = (proxy) => {
  if (!proxy) return null;
  let url = proxy;
  if (!url.startsWith('socks5://') && !url.startsWith('socks5h://')) url = 'socks5://' + url;
  try { return new SocksProxyAgent(url); } catch { return null; }
};

const fixToken = (raw) => {
  let token = raw.split(';')[0].trim();
  if (token.startsWith('auth-token=')) token = token.substring(11);
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.user?.access_token) return payload.user.access_token;
      if (payload.accessToken) return payload.accessToken;
    }
  } catch {}
  return token;
};

const loadTokens = () => {
  try {
    if (!fs.existsSync('tokens.txt')) return [];
    return [...new Set(fs.readFileSync('tokens.txt', 'utf8').split('\n').filter(l => l.trim()).map(l => fixToken(l.trim())))];
  } catch { return []; }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const log = (msg, type = 'INFO') => {
  const colors = { 
    INFO: '\x1b[36m', 
    SUCCESS: '\x1b[32m', 
    WARN: '\x1b[33m', 
    ERROR: '\x1b[31m', 
    BOT: '\x1b[35m', 
    ACTION: '\x1b[33m', 
    QUEST: '\x1b[93m', 
    SOCIAL: '\x1b[96m',
    REWARD: '\x1b[92m', 
    TIMER: '\x1b[90m',
    DEBUG: '\x1b[90m',
    RESET: '\x1b[0m' 
  };
  const ts = new Date().toISOString().replace('T', ' ').substr(0, 19);
  console.log(`${colors[type] || ''}[${ts}] [${type}] ${msg}${colors.RESET}`);
};

const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

const apiRequest = (method, endpoint, token, opt = {}) => {
  return new Promise((resolve) => {
    const url = `https://api.cedomis.xyz/api/v1${endpoint}`;
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': opt.userAgent || randomUserAgent(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'Origin': 'https://cedomis.xyz',
        'Referer': 'https://cedomis.xyz/dashboard',
        ...opt.headers
      }
    };
    if (opt.proxyAgent) opts.agent = opt.proxyAgent;
    
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, ok: res.statusCode === 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode, ok: false, data: data });
        }
      });
    });
    req.on('error', (err) => {
      log(`API Error: ${err.message}`, 'ERROR');
      resolve({ status: 500, ok: false, error: err.message });
    });
    if (opt.body) req.write(opt.body);
    req.end();
  });
};

const askGroq = async (question, options) => {
  const prompt = `${question}\n\nA) ${options[0]}\nB) ${options[1]}\nC) ${options[2]}\nD) ${options[3]}\n\nReturn ONLY the letter of the correct answer (A, B, C, or D):`;
  
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ 
      role: 'system', 
      content: 'You are a blockchain expert. Answer quiz questions correctly. Return ONLY the letter.' 
    }, { 
      role: 'user', 
      content: prompt 
    }],
    temperature: 0.3,
    max_tokens: 10
  });
  
  const opts = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${GROQ_API_KEY}`, 
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content;
          if (content) {
            const match = content.match(/[A-D]/i);
            resolve(match ? match[0].toUpperCase() : null);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
};

const getProfile = async (token, proxyAgent) => {
  log('👤 Fetching profile...', 'BOT');
  const res = await apiRequest('GET', '/auth/profile', token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    log(`✅ Profile: ${res.data.data.username}`, 'SUCCESS');
    return res.data;
  }
  return null;
};

const checkDaily = async (token, proxyAgent) => {
  log('🔍 Checking daily login...', 'BOT');
  const res = await apiRequest('GET', '/user/daily-login/status', token, { proxyAgent });
  return (res.ok && res.data?.status === 'success') ? res.data.data : null;
};

const claimDaily = async (token, proxyAgent) => {
  log('💰 Claiming daily reward...', 'ACTION');
  const res = await apiRequest('POST', '/user/daily-login/claim', token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    log('✅✅✅ DAILY REWARD CLAIMED!', 'REWARD');
    return true;
  }
  return false;
};

const getActiveQuests = async (token, proxyAgent) => {
  log('📋 Fetching active quests...', 'QUEST');
  const res = await apiRequest('GET', '/user/quest/get-active-quest', token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    const data = res.data.data;
    if (data?.quests && Array.isArray(data.quests)) {
      return { quests: data.quests };
    }
  }
  return { quests: [] };
};

const getQuestDetails = async (token, questId, proxyAgent) => {
  const res = await apiRequest('GET', `/user/quest/get-quest/${questId}`, token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    return res.data.data;
  }
  return null;
};

const NFT_QUEST_ANSWERS = {
  '069b8232-2fe1-78b2-8000-b0267845ef35': {
    1: 'A',
    2: 'A',
    3: 'B',
    4: 'C',
    5: 'B'
  }
};

const verifyTask = async (token, questId, taskId, answer, task, proxyAgent) => {
  const answerNum = answer.charCodeAt(0) - 64;
  const queryString = `quest_id=${questId}&task_id=${taskId}&user_ans=${answerNum}`;
  const res = await apiRequest('POST', `/user/quest/verify-task?${queryString}`, token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    return { correct: res.data?.data?.is_correct === true, data: res.data };
  }
  return { correct: false, data: res.data };
};

const completeQuest = async (token, questId, proxyAgent) => {
  const res = await apiRequest('POST', `/user/quest/concluded-quests?quest_id=${questId}`, token, { proxyAgent });
  if (res.ok && res.data?.status === 'success') {
    return true;
  }
  return false;
};

const processQuest = async (token, quest, proxyAgent) => {
  const questId = quest.id;
  const questTitle = quest.title;
  const reward = quest.xp_reward;
  
  log(`\n📌 Quest: ${questTitle}`, 'QUEST');
  log(`   ID: ${questId}`, 'DEBUG');
  log(`   Reward: ${reward} XP`, 'INFO');
  
  const details = await getQuestDetails(token, questId, proxyAgent);
  if (!details?.quest_tasks || details.quest_tasks.length === 0) {
    log(`   ℹ️ No questions found, trying direct completion`, 'INFO');
    const completed = await completeQuest(token, questId, proxyAgent);
    if (completed) {
      log(`   🎉 +${reward} XP earned!`, 'REWARD');
      return true;
    }
    return false;
  }
  
  const tasks = details.quest_tasks;
  log(`   🎯 ${tasks.length} questions to answer`, 'INFO');
  
  const hardcodedAnswers = NFT_QUEST_ANSWERS[questId];
  let correctCount = 0;
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskId = task.id;
    const questionNumber = i + 1;
    
    log(`\n   📋 Question ${questionNumber}/${tasks.length}`, 'QUEST');
    log(`      ${task.task_question.substring(0, 80)}...`, 'DEBUG');
    
    let answer = null;
    
    if (hardcodedAnswers && hardcodedAnswers[questionNumber]) {
      answer = hardcodedAnswers[questionNumber];
    } else {
      const options = [task.task_option_1, task.task_option_2, task.task_option_3, task.task_option_4];
      answer = await askGroq(task.task_question, options);
      if (!answer) {
        log(`   ⚠️ Could not get answer`, 'WARN');
        continue;
      }
      log(`   🤖 AI Answer: ${answer}`, 'INFO');
    }
    
    const result = await verifyTask(token, questId, taskId, answer, task, proxyAgent);
    
    if (result.correct) {
      correctCount++;
      log(`   ✅ Correct! (${correctCount}/${tasks.length})`, 'SUCCESS');
    } else {
      log(`   ❌ Wrong answer`, 'ERROR');
      break;
    }
    await sleep(1500);
  }
  
  if (correctCount === tasks.length) {
    const completed = await completeQuest(token, questId, proxyAgent);
    if (completed) {
      log(`   🎉 +${reward} XP earned!`, 'REWARD');
      return true;
    }
  }
  log(`   ⚠️ Completed ${correctCount}/${tasks.length} questions`, 'WARN');
  return false;
};

const processToken = async (token, proxy, useProxy) => {
  const hash = token.substring(0, 20) + '...';
  const proxyAgent = (useProxy && proxy) ? getProxyAgent(proxy) : null;
  log(`\n🔰🔰🔰 PROCESSING: ${hash} 🔰🔰🔰`, 'BOT');
  
  const profile = await getProfile(token, proxyAgent);
  if (!profile) {
    log('❌ Token invalid!', 'ERROR');
    return { success: false, nextClaim: null };
  }

  log('\n--- DAILY LOGIN ---', 'BOT');
  const daily = await checkDaily(token, proxyAgent);
  let nextClaim = null;
  
  if (daily?.can_claim) {
    await claimDaily(token, proxyAgent);
    const newDaily = await checkDaily(token, proxyAgent);
    nextClaim = newDaily?.next_claim_at ? new Date(newDaily.next_claim_at) : null;
  } else if (daily?.next_claim_at) {
    nextClaim = new Date(daily.next_claim_at);
    const wait = nextClaim - new Date();
    log(`⏰ Already claimed - Next: ${nextClaim.toLocaleString()} (${formatTime(wait)})`, 'TIMER');
  }

  log('\n--- QUESTS ---', 'QUEST');
  const { quests } = await getActiveQuests(token, proxyAgent);
  
  if (!quests || quests.length === 0) {
    log('📭 No quests found', 'INFO');
    return { success: true, nextClaim };
  }
  
  const incompleteQuests = quests.filter(q => !q.is_completed);
  log(`📌 Found ${incompleteQuests.length} incomplete quest(s)`, 'INFO');
  
  for (const quest of incompleteQuests) {
    log(`   📖 ${quest.title} (${quest.xp_reward} XP)`, 'QUEST');
  }
  
  let questsCompleted = 0;
  
  for (const quest of incompleteQuests) {
    const completed = await processQuest(token, quest, proxyAgent);
    if (completed) questsCompleted++;
    await sleep(3000);
  }

  log(`\n✅✅✅ ACCOUNT PROCESSED - Quests Completed: ${questsCompleted}`, 'SUCCESS');
  return { success: true, nextClaim };
};

const sleepUntilNext = async (claims) => {
  const valid = claims.filter(c => c !== null);
  if (valid.length === 0) {
    const d = 24 * 60 * 60 * 1000 + random(0, 3600000);
    log(`\n⏰ Sleeping ${formatTime(d)} (24h default)`, 'TIMER');
    await sleep(d);
    return;
  }
  const earliest = new Date(Math.min(...valid.map(d => d.getTime())));
  const extra = random(5 * 60 * 1000, 30 * 60 * 1000);
  const wake = new Date(earliest.getTime() + extra);
  const sleepTime = wake - new Date();
  log(`\n📊 Next claim: ${earliest.toLocaleString()}`, 'TIMER');
  log(`➕ Random delay: ${formatTime(extra)}`, 'TIMER');
  log(`⏰ Wake at: ${wake.toLocaleString()} (${formatTime(sleepTime)})`, 'TIMER');
  if (sleepTime > 0) await sleep(sleepTime);
};

const askUseProxy = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question('\x1b[36m[?] Use proxies? (y/n): \x1b[0m', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

const main = async () => {
  console.log(BANNER);
  log(`🤖 Groq API Key: ${GROQ_API_KEY.substring(0, 8)}...`, 'INFO');
  log(`📁 Model: llama-3.3-70b-versatile`, 'INFO');
  
  const useProxy = await askUseProxy();
  log(`📁 Proxy mode: ${useProxy ? 'ENABLED' : 'DISABLED'}`, 'INFO');
  
  const proxies = useProxy ? loadProxies() : [];
  if (useProxy && proxies.length === 0) {
    log('⚠️ No proxies found in proxy.txt, continuing without proxies', 'WARN');
  } else if (useProxy && proxies.length > 0) {
    log(`📁 Loaded ${proxies.length} proxy(ies)`, 'INFO');
  }
  
  let round = 0;
  
  while (true) {
    round++;
    log(`\n${'='.repeat(60)}`, 'BOT');
    log(`🔄 ROUND ${round} STARTING`, 'BOT');
    log(`${'='.repeat(60)}`, 'BOT');
    
    const tokens = loadTokens();
    if (tokens.length === 0) {
      log('❌ No tokens found in tokens.txt', 'ERROR');
      await sleep(300000);
      continue;
    }
    log(`📁 Loaded ${tokens.length} token(s)`, 'INFO');
    
    const claims = [];
    for (let i = 0; i < tokens.length; i++) {
      const proxy = (useProxy && proxies.length > 0) ? proxies[i % proxies.length] : null;
      const res = await processToken(tokens[i], proxy, useProxy && proxies.length > 0);
      if (res.success && res.nextClaim) claims.push(res.nextClaim);
      if (i < tokens.length - 1) {
        const delay = random(5000, 10000);
        log(`⏳ Waiting ${formatTime(delay)} before next account...`, 'TIMER');
        await sleep(delay);
      }
    }
    
    log(`\n✨✨✨ ROUND ${round} COMPLETE ✨✨✨`, 'SUCCESS');
    await sleepUntilNext(claims);
    log('\n🔄🔄🔄 RESTARTING 🔄🔄🔄\n', 'BOT');
  }
};

process.on('uncaughtException', (err) => {
  log(`💥 Uncaught Exception: ${err.message}`, 'ERROR');
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 Unhandled Rejection: ${reason}`, 'ERROR');
});

main().catch(e => log(`💥 Fatal Error: ${e.message}`, 'ERROR'));
