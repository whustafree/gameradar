require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    enabled: !!(process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID)
  },
  
  app: {
    url: process.env.APP_URL || 'https://freegamehub.onrender.com',
    updateIntervalHours: parseInt(process.env.UPDATE_INTERVAL_HOURS) || 4
  },
  
  cache: {
    filePath: require('path').join(__dirname, '../../games-cache.json')
  },
  
  vipKeywords: [
    'gta', 'assassin', 'cyberpunk', 'elden', 'fifa', 
    'call of duty', 'battlefield', 'sims', 'fallout', 
    'skyrim', 'witcher', 'red dead', 'god of war', 
    'horizon', 'spider-man', 'final fantasy', 'resident evil',
    'far cry', 'doom', 'wolfenstein', 'metro', 'borderlands'
  ]
};
