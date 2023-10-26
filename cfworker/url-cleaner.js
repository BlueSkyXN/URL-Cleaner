// GPLv3 @BlueSkyXN
// Source https://github.com/BlueSkyXN/URL-Cleaner
// 定义HTML结构
const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL重定向检查器</title>
</head>
<body>
    <p>兼容哔哩哔哩等任意短链接和各种带参数的链接提取</p>
    <hr>
    <input type="url" id="urlInput" placeholder="在此输入URL" required>
    <select id="uaSelect" onchange="toggleCustomInputs()">
        <option value="default">默认UA</option>
        <option value="null">无UA</option>
        <option value="custom">自定义UA</option>
    </select>
    <input type="text" id="customUAInput" placeholder="自定义UA" style="display:none">
    <select id="refererSelect" onchange="toggleCustomInputs()">
        <option value="default">默认Referer</option>
        <option value="null">无Referer</option>
        <option value="custom">自定义Referer</option>
    </select>
    <input type="url" id="customRefererInput" placeholder="自定义Referer" style="display:none">
    <button onclick="checkRedirect()">检查重定向</button>
    <div id="result">
        <button id="copyButton" onclick="copyToClipboard()" disabled>复制</button>
        <a id="resultLink" href="#" target="_blank"></a>
    </div>

    <script>
        function toggleCustomInputs() {
            const uaSelect = document.getElementById('uaSelect');
            const customUAInput = document.getElementById('customUAInput');
            customUAInput.style.display = uaSelect.value === 'custom' ? 'block' : 'none';

            const refererSelect = document.getElementById('refererSelect');
            const customRefererInput = document.getElementById('customRefererInput');
            customRefererInput.style.display = refererSelect.value === 'custom' ? 'block' : 'none';
        }

        async function checkRedirect() {
            const url = document.getElementById('urlInput').value;
            const uaSelect = document.getElementById('uaSelect');
            const customUAInput = document.getElementById('customUAInput');
            const userAgent = uaSelect.value === 'custom' ? customUAInput.value : uaSelect.value;
            const refererSelect = document.getElementById('refererSelect');
            const customRefererInput = document.getElementById('customRefererInput');
            const referer = refererSelect.value === 'custom' ? customRefererInput.value : refererSelect.value;

            const response = await fetch('/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    userAgent: userAgent === 'null' ? null : userAgent,
                    referer: referer === 'null' ? null : referer
                })
            });
            const result = await response.text();
            const resultLink = document.getElementById('resultLink');
            const copyButton = document.getElementById('copyButton');
            resultLink.href = result;
            resultLink.innerText = result;
            copyButton.disabled = false;
        }

        function copyToClipboard() {
            const resultLink = document.getElementById('resultLink');
            navigator.clipboard.writeText(resultLink.href)
                .then(() => {
                    alert('URL已复制到剪贴板！');
                })
                .catch(err => {
                    console.error('复制文本时出错: ', err);
                });
        }
    </script>
</body>
</html>
`;

// 定义重定向检查处理函数
async function handleRequest(request) {
    // 判断是否为POST请求和路径是否为'/check'
    if (request.method === 'POST' && new URL(request.url).pathname === '/check') {
        const requestData = await request.json();
        const { url: targetUrl, userAgent, referer } = requestData;
        
        const headers = {
            'User-Agent': userAgent || 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'Referer': referer || 'https://www.bing.com'
        };
        
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headers,
            redirect: 'manual'  // Prevent automatic following of redirects
        });

        let finalUrl = targetUrl;
        if ([301, 302, 307, 308].includes(response.status)) {
            const location = response.headers.get('Location') || '';
            finalUrl = location;
        }

        const cleanUrl = finalUrl.split('?')[0];  // Remove query string parameters
        return new Response(cleanUrl, {status: 200});
    } else {
        // 如果不是POST请求或路径不是'/check'，则返回HTML内容
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});