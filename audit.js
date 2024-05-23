const dealers = require('./domains.json');

const puppeteer = require('puppeteer');

(async () => {
    const startTime = Date.now();

    const audit = async (url, dealerId, dealerName) => {
        const currentDate = new Date().toISOString().split('T')[0];
        const auditStartTime = Date.now();
        console.info(`Started at ${startTime}`);
        const browser = await puppeteer.launch({headless: true, defaultViewport: { width: 1920, height: 1080 }});
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        await page.goto(url);
        console.info(`Navigated to ${url} for dealer ${dealerId} (${dealerName})`);


        try {
            const elementSelector = '.CarcodeWidgetContainer + .CarcodeWidgetContainer';

            console.info(`Waiting for ${elementSelector}`);
            await page.waitForSelector(elementSelector, { visible: true, timeout: 60000 });

            console.info(`Found ${elementSelector}`);
            const element = await page.$(elementSelector);
            console.info(`Taking screenshot of ${elementSelector}`);

            const boundingBox = await element.boundingBox();
            const padding = 20;

            await page.screenshot({
                path: `${dealerId}_${currentDate}.png`,
                clip: {
                    x: Math.max(boundingBox.x - padding, 0),
                    y: Math.max(boundingBox.y - padding, 0),
                    width: boundingBox.width + 2 * padding,
                    height: boundingBox.height + 2 * padding,
                },
            });
            console.info(`Screenshot taken for ${dealerId} (${dealerName})`);
        } catch (error) {
            page.screenshot({path: `${dealerId}_${currentDate}_error.png`});
            console.error(error);
        }
        finally {
            await browser.close();
            console.info('Browser closed');
            const auditEndTime = Date.now();
            console.log(`Execution time for ${dealerId} (${dealerName}): ${(auditEndTime - auditStartTime) / 1000} seconds`);
        }
    }

    dealers.forEach(async (d) => {
        const dealerId = d.dealerId;
        const dealerName = d.dealerName;
        const url = d.url;
        return await audit(url, dealerId, dealerName);
    });

    const endTime = Date.now();
    console.log(`Total Execution time: ${(endTime - startTime) / 1000} seconds`);
})();
