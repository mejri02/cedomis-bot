const fs = require('fs');
const https = require('https');
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
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
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
  if (type === 'API') return;
  const colors = { INFO: '\x1b[36m', SUCCESS: '\x1b[32m', WARN: '\x1b[33m', ERROR: '\x1b[31m', BOT: '\x1b[35m', ACTION: '\x1b[33m', QUEST: '\x1b[93m', REWARD: '\x1b[92m', TIMER: '\x1b[90m', RESET: '\x1b[0m' };
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
      path: u.pathname + u.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': opt.userAgent || randomUserAgent(),
        'Accept': 'application/json',
        'Origin': 'https://cedomis.xyz',
        'Referer': 'https://cedomis.xyz/dashboard',
        ...opt.headers
      }
    };
    if (opt.agent) opts.agent = opt.agent;
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ok: res.statusCode === 200, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, ok: false, data }); }
      });
    });
    req.on('error', () => resolve({ status: 500, ok: false }));
    if (opt.body) req.write(opt.body);
    req.end();
  });
};

const askGroq = async (prompt) => {
  const body = JSON.stringify({
    model: 'mixtral-8x7b-32768',
    messages: [{ role: 'system', content: 'You solve blockchain quizzes. Return answers as JSON array.' }, { role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500
  });
  const opts = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).choices?.[0]?.message?.content || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
};

const getProfile = async (token, agent) => {
  log('👤 Fetching profile...', 'BOT');
  const res = await apiRequest('GET', '/auth/profile', token, { agent });
  if (res.ok && res.data?.status === 'success') {
    log(`✅ Profile: ${res.data.data.username}`, 'SUCCESS');
    return res.data;
  }
  return null;
};

const checkDaily = async (token, agent) => {
  log('🔍 Checking daily login...', 'BOT');
  const res = await apiRequest('GET', '/user/daily-login/status', token, { agent });
  return (res.ok && res.data?.status === 'success') ? res.data.data : null;
};

const claimDaily = async (token, agent) => {
  log('💰 Claiming daily reward...', 'ACTION');
  const res = await apiRequest('POST', '/user/daily-login/claim', token, { agent });
  if (res.ok && res.data?.status === 'success') {
    log('✅✅✅ DAILY REWARD CLAIMED!', 'REWARD');
    return true;
  }
  return false;
};

const getBlogPosts = async (token, agent) => {
  log('📚 Fetching blog posts...', 'QUEST');
  const res = await apiRequest('GET', '/user/blog/posts?page_size=10', token, { agent });
  return (res.ok && res.data?.items) ? res.data.items : [];
};

const getBlogPost = async (token, postId, agent) => {
  const res = await apiRequest('GET', `/user/blog/posts/${postId}`, token, { agent });
  return res.ok ? res.data : null;
};

const submitQuiz = async (token, postId, answers, agent) => {
  log('📝 Submitting quiz...', 'ACTION');
  const res = await apiRequest('POST', `/user/blog/posts/${postId}/submit`, token, {
    agent,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });
  if (res.ok) {
    log('✅✅✅ QUIZ SUBMITTED!', 'REWARD');
    return true;
  }
  return false;
};

const solveQuiz = async (content, questions) => {
  if (!questions?.length) return [];
  const answer = await askGroq(`Blog: ${content.substring(0, 2000)}...\nQuestions: ${JSON.stringify(questions)}\nReturn ONLY JSON array of answers.`);
  if (!answer) return [];
  try {
    const match = answer.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
};

const processToken = async (token, proxy) => {
  const hash = token.substring(0, 15) + '...';
  const agent = proxy ? getProxyAgent(proxy) : null;
  log(`\n🔰🔰🔰 PROCESSING: ${hash} 🔰🔰🔰`, 'BOT');
  
  const profile = await getProfile(token, agent);
  if (!profile) {
    log('❌ Token invalid!', 'ERROR');
    return { success: false, nextClaim: null };
  }

  log('\n--- DAILY LOGIN ---', 'BOT');
  const daily = await checkDaily(token, agent);
  let nextClaim = null;
  
  if (daily?.can_claim) {
    await claimDaily(token, agent);
    const newDaily = await checkDaily(token, agent);
    nextClaim = newDaily?.next_claim_at ? new Date(newDaily.next_claim_at) : null;
  } else if (daily?.next_claim_at) {
    nextClaim = new Date(daily.next_claim_at);
    const wait = nextClaim - new Date();
    log(`⏰ Already claimed - Next: ${nextClaim.toLocaleString()} (${formatTime(wait)})`, 'TIMER');
  }

  log('\n--- BLOG QUIZZES ---', 'QUEST');
  const posts = await getBlogPosts(token, agent);
  let completed = 0;
  
  for (const post of posts) {
    log(`\n📌 ${post.title}`, 'QUEST');
    const full = await getBlogPost(token, post.id, agent);
    if (full?.quiz?.questions?.length) {
      log(`🎯 ${full.quiz.questions.length} questions`, 'SUCCESS');
      const answers = await solveQuiz(full.content || '', full.quiz.questions);
      if (answers.length === full.quiz.questions.length) {
        if (await submitQuiz(token, post.id, answers, agent)) completed++;
      }
    }
    await sleep(random(2000, 4000));
  }

  log(`\n✅✅✅ ACCOUNT PROCESSED - Quizzes: ${completed}`, 'SUCCESS');
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

const main = async () => {
  console.log(BANNER);
  log(`🤖 Groq: ${GROQ_API_KEY.substring(0, 8)}...`, 'GROQ');
  
  while (true) {
    const tokens = loadTokens();
    if (tokens.length === 0) {
      log('❌ No tokens found', 'ERROR');
      await sleep(3600000);
      continue;
    }
    log(`📁 Tokens: ${tokens.length}`, 'INFO');
    
    const proxies = loadProxies();
    if (proxies.length) log(`📁 Proxies: ${proxies.length}`, 'INFO');
    
    const claims = [];
    for (let i = 0; i < tokens.length; i++) {
      const proxy = proxies.length ? proxies[i % proxies.length] : null;
      const res = await processToken(tokens[i], proxy);
      if (res.success && res.nextClaim) claims.push(res.nextClaim);
      if (i < tokens.length - 1) await sleep(random(5000, 10000));
    }
    
    log('\n✨✨✨ ROUND COMPLETE ✨✨✨', 'SUCCESS');
    await sleepUntilNext(claims);
    log('\n🔄🔄🔄 RESTARTING 🔄🔄🔄\n', 'BOT');
  }
};

main().catch(e => log(`💥 ${e.message}`, 'ERROR'));
