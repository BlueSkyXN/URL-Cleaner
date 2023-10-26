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
    <select id="algorithm">
        <option value="mixed">混合文本算法</option>
        <option value="pure">纯 URL 算法</option>
        <option value="taobao">淘宝专用算法</option>
    </select>
    <button onclick="checkRedirect()">检查重定向</button>
    <hr>
    <div id="result">
        <div id="originalDiv">
            <button id="copyOriginalButton" onclick="copyToClipboard('originalLink')" disabled>复制原始跳转的URL</button>
            <a id="originalLink" href="#" target="_blank"></a>
        </div>
        <hr>
        <div id="cleanDiv">
            <button id="copyCleanButton" onclick="copyToClipboard('cleanLink')" disabled>复制完全过滤的URL</button>
            <a id="cleanLink" href="#" target="_blank"></a>
        </div>
        <div id="firstParamDiv">
        <hr>
        <button id="copyFirstParamButton" onclick="copyToClipboard('firstParamLink')" disabled>复制保留首参数的URL</button>
        <a id="firstParamLink" href="#" target="_blank"></a>
        </div>
    </div>

    <script>
        async function checkRedirect() {
            const url = document.getElementById('urlInput').value;
            const algorithm = document.getElementById('algorithm').value;
            const response = await fetch('/check?url=' + encodeURIComponent(url) + '&algorithm=' + algorithm);
        
            // 先判断响应状态是否正确
            if (response.status !== 200) {
                console.error('服务器响应错误: ', response.status);
                return;
            }

            // 直接获取JSON数据
            const jsonData = await response.json();
        
            // 更新DOM元素
            document.getElementById('originalLink').href = jsonData.original;
            document.getElementById('originalLink').innerText = jsonData.original;
            document.getElementById('cleanLink').href = jsonData.clean;
            document.getElementById('cleanLink').innerText = jsonData.clean;
            document.getElementById('firstParamLink').href = jsonData.firstParam;
            document.getElementById('firstParamLink').innerText = jsonData.firstParam;
        
            // 启用复制按钮
            document.getElementById('copyOriginalButton').disabled = false;
            document.getElementById('copyCleanButton').disabled = false;
            document.getElementById('copyFirstParamButton').disabled = false;
        }

        function copyToClipboard(elementId) {
            const resultLink = document.getElementById(elementId);
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
    const url = new URL(request.url);
    if (url.pathname === '/check') {
        let targetUrl = url.searchParams.get('url');
        const algorithm = url.searchParams.get('algorithm') || 'mixed';

        let regex;
        if (algorithm === 'mixed') {
            regex = /https?:\/\/[^\s;!?(){}"'<>\[\]\u4e00-\u9fff\u3000-\u303f,]+/;
        } else if (algorithm === 'pure') {
            regex = /^(https?:\/\/|\/\/)?([a-zA-Z0-9-\.]+)(:[0-9]+)?(\/[^\s]*)?$/;
        } else if (algorithm === 'taobao') {  // 添加淘宝专用算法
            regex = /https?:\/\/m\.tb\.cn\/[^\s]+/;
        } else {
            return new Response('无效的算法参数', {status: 400});
        }

        const urlMatch = targetUrl.match(regex);
        if (urlMatch) {
            targetUrl = urlMatch[0];
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'http:' + targetUrl;
            }
        } else {
            return new Response('无效的URL', {status: 400});
        }

        // 如果是淘宝专用算法，进一步处理
        let finalUrl = targetUrl;
        if (algorithm === 'taobao') {
            const tbResponse = await fetch(targetUrl);
            const tbText = await tbResponse.text();
            const urlRegex = /var url = '([^']+)'/;
            const urlMatch = tbText.match(urlRegex);
            if (urlMatch) {
                finalUrl = urlMatch[1];
            } else {
                return new Response('无法从淘宝页面提取URL', {status: 400});
            }
        } else {
            const response = await fetch(targetUrl, {
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
                    'Referer': 'https://www.bing.com'
                }
            });
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.get('Location') || '';
                finalUrl = location;
            }
        }

        const urlParts = finalUrl.split('?');
        const cleanUrl = urlParts[0];
        let firstParamUrl = cleanUrl;
        if (urlParts.length > 1) {
            const firstParam = urlParts[1].split('&')[0];
            firstParamUrl = `${cleanUrl}?${firstParam}`;
        }

        const result = {
            original: finalUrl,
            clean: cleanUrl,
            firstParam: firstParamUrl
        };

        return new Response(JSON.stringify(result), {
            headers: {'content-type': 'application/json'},
            status: 200
        });
    }

    return new Response(html, {
        headers: {'content-type': 'text/html;charset=UTF-8'},
    });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
